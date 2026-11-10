import {
  IndexedDbAction,
  IndexedDbRecordType,
  SyncStatus,
} from "@/lib/indexed-db/enums";
import { modifyFromStore } from "@/lib/indexed-db/indexed-db";
import {
  completionSchema,
  identitySchema,
  noteSchema,
  taskSchema,
} from "../schemas";
import type { Note, Task } from "../types";
import { requestProductBackgroundSync } from "./background-sync";
import {
  type Change,
  localKey,
  type NotePayload,
  storeFor,
  type TaskPayload,
} from "./model";
import { notifyProductChanges, runSync } from "./runtime";

type Write =
  | {
      kind: "task";
      item?: Task | undefined;
      payload?: TaskPayload;
      completed?: boolean;
      remove?: boolean;
    }
  | {
      kind: "note";
      item?: Note | undefined;
      payload?: NotePayload;
      remove?: boolean;
    };
async function queue(userId: string, write: Write) {
  if (write.item && write.item.userId !== userId)
    throw new Error(`This ${write.kind} belongs to another account.`);
  const id = write.item ? localKey(write.item) : crypto.randomUUID();
  const now = Date.now();
  await modifyFromStore<Change>(storeFor(write.kind), id, (current) => {
    const previous = current?.value;
    if (
      previous &&
      (previous.userId !== userId || previous.kind !== write.kind)
    )
      throw new Error("This item belongs to another account.");
    if (previous?.action === IndexedDbAction.Delete) {
      if (write.remove) return current;
      throw new Error(
        `Keep this ${write.kind} before changing it. A deletion is already saved.`,
      );
    }
    if (write.item?.localOnly && !previous)
      throw new Error("This local item was removed. Reload your items.");
    if (
      write.remove &&
      previous?.action === IndexedDbAction.Create &&
      !previous.attempt
    )
      return undefined;
    const failed = previous?.status === SyncStatus.Failed;
    const common = {
      syncVersion: 6 as const,
      userId,
      action: write.remove
        ? IndexedDbAction.Delete
        : (previous?.action ??
          (write.item ? IndexedDbAction.Update : IndexedDbAction.Create)),
      revision: (previous?.revision ?? 0) + 1,
      status: failed ? SyncStatus.Failed : SyncStatus.Pending,
      recordType: IndexedDbRecordType.PendingChange,
      attempts: 0,
      nextAttemptAt: 0,
      updatedAt: now,
      error: failed ? previous.error : "",
      confirmed: false,
    };
    const pending = previous && previous.status !== SyncStatus.Synced;
    let value: Change;
    if (write.kind === "task") {
      const old = previous?.kind === "task" ? previous : undefined;
      const baseline =
        old && (!write.item || old.task.version > write.item.version)
          ? old.task
          : write.item;
      const payload = {
        ...taskSchema.parse(
          write.payload ?? (pending && old ? old.payload : baseline),
        ),
        completed:
          write.completed ??
          (pending && old ? old.payload.completed : baseline?.completed) ??
          baseline?.completed ??
          false,
      };
      const task: Task = baseline ?? {
        id,
        userId,
        localId: id,
        localOnly: true,
        ...payload,
        version: 1,
        updated: now,
        completed: false,
        group: "unscheduled",
        reminderAt: payload.reminderAt ?? null,
        attachments: [],
      };
      value = {
        ...common,
        kind: "task",
        task,
        payload,
        attempt: old?.attempt ?? null,
      };
    } else {
      const old = previous?.kind === "note" ? previous : undefined;
      const baseline =
        old && (!write.item || old.note.version > write.item.version)
          ? old.note
          : write.item;
      const payload = noteSchema.parse(
        write.payload ?? (pending && old ? old.payload : baseline),
      );
      const note: Note = baseline ?? {
        id,
        userId,
        localId: id,
        localOnly: true,
        ...payload,
        excerpt: payload.content.slice(0, 240),
        version: 1,
        updated: now,
        attachments: [],
      };
      value = {
        ...common,
        kind: "note",
        note,
        payload,
        attempt: old?.attempt ?? null,
      };
    }
    return { id, createdAt: current?.createdAt ?? now, value };
  });
  notifyProductChanges(write.kind);
  void requestProductBackgroundSync();
  void runSync(false, userId);
}
export async function saveTask(
  userId: string,
  payload: TaskPayload,
  item?: Task,
) {
  await queue(userId, {
    kind: "task",
    item,
    payload: taskSchema.parse(payload),
  });
  return { success: "Task saved on this device.", destination: "/tasks" };
}
export async function saveNote(
  userId: string,
  payload: NotePayload,
  item?: Note,
) {
  await queue(userId, {
    kind: "note",
    item,
    payload: noteSchema.parse(payload),
  });
  return { success: "Note saved on this device.", destination: "/notes" };
}
export async function setTaskCompletion(
  userId: string,
  item: Task,
  completed: boolean,
) {
  completionSchema.parse({
    id: item.id,
    version: String(item.version),
    completed,
  });
  await queue(userId, { kind: "task", item, completed });
  return {
    success: completed
      ? "Task completed on this device."
      : "Task marked incomplete on this device.",
  };
}
export async function deleteTask(userId: string, item: Task) {
  identitySchema.parse({ id: item.id, version: String(item.version) });
  await queue(userId, { kind: "task", item, remove: true });
  return { success: "Task deleted on this device.", destination: "/tasks" };
}
export async function deleteNote(userId: string, item: Note) {
  identitySchema.parse({ id: item.id, version: String(item.version) });
  await queue(userId, { kind: "note", item, remove: true });
  return { success: "Note deleted on this device.", destination: "/notes" };
}
