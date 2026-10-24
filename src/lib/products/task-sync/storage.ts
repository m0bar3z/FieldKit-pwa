import { ApiRequestError } from "@/lib/api/client";
import { IndexedDbAction, TaskSyncStatus } from "@/lib/indexed-db/enums";
import {
  findFromStore,
  getAllFromStore,
  modifyFromStore,
} from "@/lib/indexed-db/indexed-db";
import type { TaskRecord } from "@/lib/memory/types";
import type { TasksData } from "../types";
import {
  applyTaskChanges,
  isTaskChange,
  type TaskAttempt,
  type TaskChange,
} from "./changes";

export async function readTaskChanges(userId?: string) {
  return (await getAllFromStore<unknown>("tasks"))
    .filter(isTaskChange)
    .filter(({ value }) => !userId || value.userId === userId);
}

export async function hasPendingTaskChanges(userId?: string) {
  return (await readTaskChanges(userId)).some(
    ({ value }) => value.status === TaskSyncStatus.Pending,
  );
}

export async function mergeLocalTasks(data: TasksData) {
  // Older service-worker responses predate per-task ownership metadata.
  data = {
    ...data,
    items: data.items.map((task) => ({ ...task, userId: data.userId })),
  };
  // Preserve the last readable list even when a service-worker cache is unavailable.
  const key = `snapshot:${data.userId}`;
  await modifyFromStore<TasksData>("tasks", key, () => ({
    id: key,
    createdAt: Date.now(),
    value: data,
  }));
  const changes = await readTaskChanges(data.userId);
  for (const { id, value } of changes) {
    if (
      value.status === TaskSyncStatus.Synced &&
      !value.confirmed &&
      data.items.some(
        (task) =>
          task.id === value.task.id && task.version >= value.task.version,
      )
    ) {
      await modifyFromStore<TaskChange>("tasks", id, (current) =>
        current &&
        current.value.revision === value.revision &&
        current.value.status === TaskSyncStatus.Synced
          ? { ...current, value: { ...current.value, confirmed: true } }
          : current,
      );
    }
  }
  return applyTaskChanges(data, changes);
}

export async function loadLocalTasks(userId: string): Promise<TasksData> {
  const snapshot = await findFromStore<TasksData>(
    "tasks",
    `snapshot:${userId}`,
  );
  const data = snapshot?.value ?? {
    userId,
    items: [],
    today: "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    counts: { dueToday: 0, overdue: 0, completedTasks: 0, openTasks: 0 },
  };
  return applyTaskChanges(data, await readTaskChanges(userId));
}

export async function prepareTaskAttempt(id: string, userId: string) {
  const record = await modifyFromStore<TaskChange>("tasks", id, (current) => {
    if (
      !current ||
      current.value.userId !== userId ||
      current.value.status !== TaskSyncStatus.Pending
    )
      return current;
    const value = current.value;
    return {
      ...current,
      value: {
        ...value,
        attempt: value.attempt ?? {
          mutationId: crypto.randomUUID(),
          taskId: value.task.id,
          action: value.action,
          revision: value.revision,
          version: value.task.version,
          payload: value.payload,
        },
      },
    };
  });
  return record?.value.userId === userId &&
    record.value.status === TaskSyncStatus.Pending
    ? record.value.attempt
    : null;
}

export async function acknowledgeTask(
  id: string,
  userId: string,
  attempt: TaskAttempt,
  item: TaskRecord,
) {
  if (item.userId !== userId)
    throw new Error("The task belongs to another account.");
  await modifyFromStore<TaskChange>("tasks", id, (current) => {
    if (
      !current ||
      current.value.userId !== userId ||
      current.value.attempt?.mutationId !== attempt.mutationId
    )
      return current;
    const value = current.value;
    const newer = value.revision !== attempt.revision;
    const task = {
      ...value.task,
      ...attempt.payload,
      id: item.id,
      version: item.version,
      completed: item.completed,
    };
    delete task.localOnly;
    delete task.syncStatus;
    delete task.syncError;
    return {
      ...current,
      value: {
        ...value,
        task,
        action: IndexedDbAction.Update,
        status: newer ? TaskSyncStatus.Pending : TaskSyncStatus.Synced,
        attempt: null,
        attempts: 0,
        nextAttemptAt: 0,
        error: "",
        confirmed: false,
      },
    };
  });
}

export function isRetryableTaskError(error: unknown) {
  return error instanceof ApiRequestError
    ? error.status >= 500 || error.status === 408 || error.status === 429
    : error instanceof TypeError ||
        (error instanceof DOMException &&
          ["TimeoutError", "AbortError"].includes(error.name));
}

export async function failTaskAttempt(
  id: string,
  userId: string,
  attempt: TaskAttempt,
  error: unknown,
) {
  await modifyFromStore<TaskChange>("tasks", id, (current) => {
    if (
      !current ||
      current.value.userId !== userId ||
      current.value.attempt?.mutationId !== attempt.mutationId
    )
      return current;
    const attempts = current.value.attempts + 1;
    const retryable = isRetryableTaskError(error);
    return {
      ...current,
      value: {
        ...current.value,
        attempts,
        status: retryable ? TaskSyncStatus.Pending : TaskSyncStatus.Failed,
        nextAttemptAt: retryable
          ? Date.now() + Math.min(60_000, 1000 * 2 ** Math.min(attempts - 1, 6))
          : 0,
        error:
          error instanceof ApiRequestError && error.status === 409
            ? "This task changed elsewhere. Your local changes are saved. Discard them to load the latest server version."
            : error instanceof Error
              ? error.message
              : "Unable to synchronize this task.",
      },
    };
  });
}
