import { ApiRequestError, apiRequest } from "@/lib/api/client";
import type { User } from "@/lib/auth/types";
import { IndexedDbAction, TaskSyncStatus } from "@/lib/indexed-db/enums";
import type { TaskRecord } from "@/lib/memory/types";
import {
  acknowledgeTask,
  failTaskAttempt,
  hasPendingTaskChanges,
  prepareTaskAttempt,
  readTaskChanges,
} from "./storage";

export async function withTaskSyncLock<T>(
  action: () => Promise<T>,
): Promise<T> {
  return navigator.locks
    ? navigator.locks.request("fieldkit-task-changes", action)
    : action();
}

export function processTaskQueue(
  force: boolean,
  onChange: () => void | Promise<void>,
  expectedUserId?: string,
) {
  return withTaskSyncLock(async () => {
    if (!(await hasPendingTaskChanges(expectedUserId))) return false;
    const { user } = await apiRequest<{ user: User }>("/api/auth/session", {
      signal: AbortSignal.timeout(15_000),
    });
    if (expectedUserId && expectedUserId !== user.id)
      throw new ApiRequestError(
        { error: "Your account changed. Sign in again." },
        401,
      );
    let progressed = true;
    while (progressed && navigator.onLine) {
      progressed = false;
      const records = (await readTaskChanges(user.id)).sort(
        (a, b) => a.createdAt - b.createdAt,
      );
      for (const record of records) {
        if (!navigator.onLine) break;
        const value = record.value;
        if (
          value.status !== TaskSyncStatus.Pending ||
          (!force && value.nextAttemptAt > Date.now())
        )
          continue;
        const id = String(record.id);
        const attempt = await prepareTaskAttempt(id, user.id);
        if (!attempt) continue;
        try {
          const create = attempt.action === IndexedDbAction.Create;
          const { item } = await apiRequest<{ item: TaskRecord }>(
            create ? "/api/tasks" : `/api/tasks/${attempt.taskId}`,
            {
              method: create ? "POST" : "PATCH",
              headers: { "X-FieldKit-User": user.id },
              body: JSON.stringify({
                ...attempt.payload,
                mutationId: attempt.mutationId,
                ...(!create && { version: String(attempt.version) }),
              }),
              signal: AbortSignal.timeout(15_000),
            },
          );
          await acknowledgeTask(id, user.id, attempt, item);
          progressed = true;
        } catch (error) {
          await failTaskAttempt(id, user.id, attempt, error);
        }
        await onChange();
      }
      force = false;
    }
    return hasPendingTaskChanges(user.id);
  });
}
