import "server-only";

import webpush from "web-push";
import { memory } from "@/lib/memory/store";
import { pushConfig } from "./config";
import type { ReminderPayload } from "./payload";
import {
  type Delivery,
  type DeviceBinding,
  pushStore,
  type ReminderJob,
} from "./store";

export const REMINDER_WINDOW = 24 * 60 * 60 * 1000;
type Send = (
  binding: DeviceBinding,
  payload: ReminderPayload,
) => Promise<unknown>;
function live(binding: DeviceBinding, now: number) {
  return (
    pushStore.bindings.get(binding.subscription.endpoint) === binding &&
    binding.expiresAt > now
  );
}
function current(job: ReminderJob, now: number) {
  return memory.tasks.find(
    (task) =>
      task.id === job.taskId &&
      !task.deletedAt &&
      !task.completed &&
      task.reminderAt === job.reminderAt &&
      task.reminderRevision === job.revision &&
      job.reminderAt <= now &&
      now < job.reminderAt + REMINDER_WINDOW,
  );
}
function retryAfter(error: unknown, now: number) {
  if (!error || typeof error !== "object" || !("headers" in error)) return 0;
  const headers = error.headers as
    | Record<string, string | undefined>
    | undefined;
  const value = headers?.["retry-after"];
  if (!value) return 0;
  const seconds = Number(value);
  return Math.min(
    REMINDER_WINDOW,
    Math.max(
      0,
      Number.isFinite(seconds)
        ? seconds * 1000
        : (Date.parse(value) || now) - now,
    ),
  );
}
export async function dispatchReminders(send?: Send) {
  const config = pushConfig();
  if (pushStore.running)
    return { busy: true, accepted: 0, failed: 0, removed: 0 };
  pushStore.running = true;
  const result = { busy: false, accepted: 0, failed: 0, removed: 0 };
  try {
    const now = Date.now();
    for (const [endpoint, binding] of pushStore.bindings)
      if (binding.expiresAt <= now) pushStore.bindings.delete(endpoint);
    for (const [key, job] of pushStore.jobs) {
      const task = memory.tasks.find((item) => item.id === job.taskId);
      if (
        !task ||
        task.deletedAt ||
        task.reminderRevision !== job.revision ||
        task.reminderAt !== job.reminderAt ||
        now >= job.reminderAt + REMINDER_WINDOW
      )
        pushStore.jobs.delete(key);
    }
    const due = memory.tasks
      .filter(
        (task) =>
          !task.completed &&
          !task.deletedAt &&
          task.reminderAt != null &&
          task.reminderAt <= now &&
          now < task.reminderAt + REMINDER_WINDOW,
      )
      .sort((a, b) => (a.reminderAt ?? 0) - (b.reminderAt ?? 0));
    const work: {
      job: ReminderJob;
      binding: DeviceBinding;
      delivery: Delivery;
    }[] = [];
    for (const task of due) {
      if (task.reminderAt == null) continue;
      const key = `${task.id}:${task.reminderRevision}:${task.reminderAt}`;
      let job = pushStore.jobs.get(key);
      if (!job) {
        const bindings = [...pushStore.bindings.values()].filter(
          (b) => b.userId === task.userId && live(b, now),
        );
        // Freeze the eligible device set on the first actual dispatch, not when none exist.
        if (!bindings.length) continue;
        job = {
          taskId: task.id,
          revision: task.reminderRevision,
          reminderAt: task.reminderAt,
          targets: new Map(
            bindings.map((b) => [
              b.id,
              { state: "pending", attempts: 0, nextAt: 0 },
            ]),
          ),
        };
        pushStore.jobs.set(key, job);
      }
      for (const [bindingId, delivery] of job.targets) {
        if (delivery.state !== "pending") continue;
        const binding = [...pushStore.bindings.values()].find(
          (b) => b.id === bindingId && b.userId === task.userId && live(b, now),
        );
        if (!binding) {
          delivery.state = "removed";
          continue;
        }
        if (delivery.nextAt <= now && work.length < 20)
          work.push({ job, binding, delivery });
      }
      if (work.length >= 20) break;
    }
    const transport: Send =
      send ??
      ((binding, payload) =>
        webpush.sendNotification(
          {
            endpoint: binding.subscription.endpoint,
            keys: binding.subscription.keys,
          },
          JSON.stringify(payload),
          {
            vapidDetails: {
              subject: config.subject,
              publicKey: config.publicKey,
              privateKey: config.privateKey,
            },
            TTL: Math.max(
              0,
              Math.min(
                3600,
                Math.floor((payload.expiresAt - Date.now()) / 1000),
              ),
            ),
            timeout: 8000,
            urgency: "normal",
          },
        ));
    let index = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, work.length) }, async () => {
        for (;;) {
          const item = work[index++];
          if (!item) return;
          const { job, binding, delivery } = item;
          const task = current(job, Date.now());
          if (!task || !live(binding, Date.now())) continue;
          try {
            await transport(binding, {
              kind: "task-reminder",
              taskId: task.id,
              userId: task.userId,
              reminderAt: job.reminderAt,
              expiresAt: Math.min(
                job.reminderAt + REMINDER_WINDOW,
                binding.expiresAt,
              ),
            });
            delivery.state = "accepted";
            result.accepted++;
          } catch (error) {
            const status =
              error && typeof error === "object" && "statusCode" in error
                ? error.statusCode
                : 0;
            if (status === 404 || status === 410) {
              if (live(binding, Date.now()))
                pushStore.bindings.delete(binding.subscription.endpoint);
              delivery.state = "removed";
              result.removed++;
            } else {
              delivery.attempts++;
              delivery.nextAt =
                Date.now() +
                Math.max(
                  Math.min(
                    3600000,
                    60000 * 2 ** Math.min(delivery.attempts - 1, 6),
                  ),
                  retryAfter(error, Date.now()),
                );
              result.failed++;
            }
          }
        }
      }),
    );
    return result;
  } finally {
    pushStore.running = false;
  }
}
