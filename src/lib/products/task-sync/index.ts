import { refreshTasks } from "@/lib/api/client";
import { IndexedDbAction, TaskSyncStatus } from "@/lib/indexed-db/enums";
import { modifyFromStore } from "@/lib/indexed-db/indexed-db";
import { taskSchema } from "../schemas";
import type { Task } from "../types";
import {
  requestTaskBackgroundSync,
  TASK_SYNC_CHANGED,
} from "./background-sync";
import type { TaskChange, TaskPayload } from "./changes";
import { processTaskQueue, withTaskSyncLock } from "./engine";
import { readTaskChanges } from "./storage";

let currentUserId: string | undefined;
let running: Promise<void> | null = null;
let rescan = false;
let subscribers = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let channel: BroadcastChannel | undefined;

export async function saveTask(
  userId: string,
  input: TaskPayload,
  task?: Task,
) {
  if (task && task.userId !== userId)
    throw new Error("This task belongs to another account.");
  const payload = taskSchema.parse(input);
  const id = task?.localId ?? task?.id ?? crypto.randomUUID();
  await modifyFromStore<TaskChange>("tasks", id, (current) => {
    const previous = current?.value;
    if (previous && previous.userId !== userId)
      throw new Error("This task belongs to another account.");
    const baseline =
      previous && (!task || previous.task.version > task.version)
        ? previous.task
        : task;
    const local = baseline ?? {
      id,
      userId,
      localId: id,
      localOnly: true,
      ...payload,
      version: 1,
      completed: false,
      group: "unscheduled" as const,
      reminderAt: null,
      attachments: [],
    };
    const failed = previous?.status === TaskSyncStatus.Failed;
    return {
      id,
      createdAt: current?.createdAt ?? Date.now(),
      value: {
        kind: "task",
        userId,
        task: local,
        action:
          previous?.action ??
          (task ? IndexedDbAction.Update : IndexedDbAction.Create),
        payload,
        revision: (previous?.revision ?? 0) + 1,
        status: failed ? TaskSyncStatus.Failed : TaskSyncStatus.Pending,
        attempt: previous?.attempt ?? null,
        attempts: 0,
        nextAttemptAt: 0,
        error: failed ? previous.error : "",
        confirmed: false,
      },
    };
  });
  notifyTaskChanges();
  void requestTaskBackgroundSync();
  void runSync(false, userId);
  return { success: "Task saved on this device.", destination: "/tasks" };
}

function notifyTaskChanges() {
  refreshTasks();
  channel?.postMessage("changed");
}

export function syncTaskChanges(
  force = false,
  userId = currentUserId,
): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine || !userId)
    return Promise.resolve();
  if (running) {
    rescan = true;
    return running;
  }
  clearTimeout(timer);
  running = (async () => {
    do {
      rescan = false;
      await processTaskQueue(force, notifyTaskChanges, userId);
      force = false;
    } while (
      rescan &&
      navigator.onLine &&
      (!currentUserId || userId === currentUserId)
    );
  })().finally(async () => {
    running = null;
    if (!subscribers || !navigator.onLine || !currentUserId) return;
    const pending = (await readTaskChanges(currentUserId)).filter(
      ({ value }) => value.status === TaskSyncStatus.Pending,
    );
    if (pending.length && subscribers) {
      const next = Math.min(...pending.map(({ value }) => value.nextAttemptAt));
      timer = setTimeout(
        () => void runSync(),
        Math.max(1000, next - Date.now()),
      );
    }
  });
  return running;
}

async function runSync(force = false, userId = currentUserId) {
  try {
    await syncTaskChanges(force, userId);
  } catch (error) {
    console.warn("Unable to synchronize tasks.", error);
  }
}

function onReconnect() {
  void requestTaskBackgroundSync();
  void runSync(true);
}

function onWorkerChange(event: MessageEvent<unknown>) {
  if (event.data === TASK_SYNC_CHANGED) refreshTasks();
}

export function startTaskSync(userId: string) {
  currentUserId = userId;
  subscribers++;
  if (subscribers === 1) {
    window.addEventListener("online", onReconnect);
    navigator.serviceWorker?.addEventListener("message", onWorkerChange);
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("fieldkit-task-changes");
      channel.onmessage = () => {
        refreshTasks();
        void runSync();
      };
    }
    onReconnect();
  }
  return () => {
    subscribers--;
    if (subscribers) return;
    window.removeEventListener("online", onReconnect);
    navigator.serviceWorker?.removeEventListener("message", onWorkerChange);
    clearTimeout(timer);
    channel?.close();
    channel = undefined;
    currentUserId = undefined;
  };
}

export async function retryTaskChange(task: Task) {
  await modifyFromStore<TaskChange>(
    "tasks",
    task.localId ?? task.id,
    (current) =>
      current?.value.userId === task.userId &&
      current.value.status !== TaskSyncStatus.Synced
        ? {
            ...current,
            value: {
              ...current.value,
              status: TaskSyncStatus.Pending,
              nextAttemptAt: 0,
              error: "",
            },
          }
        : current,
  );
  notifyTaskChanges();
  void requestTaskBackgroundSync();
  await syncTaskChanges(true, task.userId);
}

export async function discardTaskChange(task: Task) {
  if (!navigator.locks && running) await running;
  await withTaskSyncLock(() =>
    modifyFromStore<TaskChange>("tasks", task.localId ?? task.id, (current) =>
      current?.value.userId === task.userId ? undefined : current,
    ),
  );
  notifyTaskChanges();
}
