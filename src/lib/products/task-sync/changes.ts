import { IndexedDbAction, TaskSyncStatus } from "@/lib/indexed-db/enums";
import type { StoredRecord } from "@/lib/indexed-db/indexed-db";
import { calendarDateAt, taskGroup } from "../presentation";
import type { Task, TasksData } from "../types";

export type TaskPayload = {
  title: string;
  description: string;
  dueDate: string;
};
export type TaskAttempt = {
  mutationId: string;
  taskId: string;
  action: IndexedDbAction.Create | IndexedDbAction.Update;
  revision: number;
  version: number;
  payload: TaskPayload;
};
export type TaskChange = {
  kind: "task";
  userId: string;
  task: Task;
  action: IndexedDbAction.Create | IndexedDbAction.Update;
  payload: TaskPayload;
  revision: number;
  status: TaskSyncStatus;
  attempt: TaskAttempt | null;
  attempts: number;
  nextAttemptAt: number;
  error: string;
  confirmed: boolean;
};

export function isTaskChange(
  record: StoredRecord<unknown>,
): record is StoredRecord<TaskChange> {
  const value = record.value;
  return (
    typeof record.id === "string" &&
    !!value &&
    typeof value === "object" &&
    "kind" in value &&
    value.kind === "task" &&
    "task" in value &&
    "userId" in value &&
    "revision" in value
  );
}

export function applyTaskChanges(
  data: TasksData,
  changes: StoredRecord<TaskChange>[],
): TasksData {
  const today = calendarDateAt(new Date(), data.timeZone);
  const merged = new Map(data.items.map((task) => [task.id, task]));
  for (const { id, value } of changes) {
    if (value.userId !== data.userId) continue;
    const current = merged.get(value.task.id);
    const synced = value.status === TaskSyncStatus.Synced;
    if (synced && !current && value.confirmed) continue;
    const task: Task =
      synced && current && current.version >= value.task.version
        ? { ...current }
        : {
            ...(current ?? value.task),
            ...value.payload,
            version: value.task.version,
          };
    if (value.task.localId) task.localId = String(id);
    if (!synced) {
      task.syncStatus = value.status;
      task.syncError = value.error;
      task.localOnly = value.action === IndexedDbAction.Create;
    } else {
      delete task.syncStatus;
      delete task.syncError;
      delete task.localOnly;
    }
    merged.delete(String(id));
    merged.set(task.id, task);
  }
  const items = [...merged.values()].map((task) => ({
    ...task,
    group: taskGroup(task, today),
  }));
  return {
    ...data,
    items,
    today,
    counts: {
      dueToday: items.filter((task) => task.group === "today").length,
      overdue: items.filter((task) => task.group === "overdue").length,
      completedTasks: items.filter((task) => task.completed).length,
      openTasks: items.filter((task) => !task.completed).length,
    },
  };
}
