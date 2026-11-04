import { IndexedDbAction, SyncStatus } from "@/lib/indexed-db/enums";
import type { StoredRecord } from "@/lib/indexed-db/indexed-db";
import type { NoteRecord, TaskRecord } from "@/lib/memory/types";
import { calendarDateAt, taskGroup } from "../presentation";
import type { Note, NotesData, Task, TasksData } from "../types";
import { type Change, itemFor, type ProductAttempt } from "./model";

export function acknowledgeItem(
  change: Change,
  attempt: ProductAttempt,
  item?: TaskRecord | NoteRecord,
): Change {
  const baseline = itemFor(change);
  const identity = {
    id: item?.id ?? baseline.id,
    version: item?.version ?? baseline.version,
    updated: item?.updatedAt ?? baseline.updated,
  };
  if (change.kind === "task") {
    if (!("description" in attempt.payload) || (item && !("completed" in item)))
      throw new Error("Unexpected task acknowledgement.");
    const task = {
      ...change.task,
      ...attempt.payload,
      ...identity,
      completed: item?.completed ?? change.task.completed,
    };
    delete task.localOnly;
    delete task.syncStatus;
    delete task.syncError;
    delete task.deletionPending;
    return { ...change, task };
  }
  if (!("content" in attempt.payload) || (item && !("content" in item)))
    throw new Error("Unexpected note acknowledgement.");
  const note: Note = {
    ...change.note,
    ...attempt.payload,
    ...identity,
    updated: identity.updated ?? change.note.updated,
    excerpt: attempt.payload.content.slice(0, 240),
  };
  delete note.localOnly;
  delete note.syncStatus;
  delete note.syncError;
  delete note.deletionPending;
  return { ...change, note };
}

function shouldHide(change: Change) {
  return (
    change.action === IndexedDbAction.Delete &&
    change.status !== SyncStatus.Failed
  );
}
function flags(change: Change) {
  return change.status === SyncStatus.Synced
    ? {}
    : {
        syncStatus: change.status,
        syncError: change.error,
        deletionPending: change.action === IndexedDbAction.Delete,
        localOnly:
          change.action === IndexedDbAction.Create ||
          !!itemFor(change).localOnly,
      };
}
export function overlayTasks(
  data: TasksData,
  records: StoredRecord<Change>[],
): TasksData {
  const merged = new Map(data.items.map((task) => [task.id, task]));
  let pendingDeletions = 0;
  for (const { id, value: change } of records) {
    if (change.kind !== "task" || change.userId !== data.userId) continue;
    if (shouldHide(change)) {
      merged.delete(String(id));
      merged.delete(change.task.id);
      if (change.status === SyncStatus.Pending) pendingDeletions++;
      continue;
    }
    const current = merged.get(change.task.id);
    const synced = change.status === SyncStatus.Synced;
    if (synced && !current && change.confirmed) continue;
    const task: Task =
      synced && current && current.version >= change.task.version
        ? {
            ...current,
            updated: current.updated ?? change.task.updated ?? null,
          }
        : {
            ...(current ?? change.task),
            ...change.payload,
            version: change.task.version,
            updated:
              (synced ? change.task.updated : change.updatedAt) ??
              current?.updated ??
              null,
          };
    if (change.task.localId) task.localId = String(id);
    delete task.syncStatus;
    delete task.syncError;
    delete task.localOnly;
    delete task.deletionPending;
    merged.delete(String(id));
    merged.set(task.id, { ...task, ...flags(change) });
  }
  const today = calendarDateAt(new Date(), data.timeZone);
  const items = [...merged.values()].map((task) => ({
    ...task,
    userId: data.userId,
    updated: task.updated ?? null,
    group: taskGroup(task, today),
  }));
  return {
    ...data,
    items,
    today,
    pendingDeletions,
    counts: {
      dueToday: items.filter((t) => t.group === "today").length,
      overdue: items.filter((t) => t.group === "overdue").length,
      completedTasks: items.filter((t) => t.completed).length,
      openTasks: items.filter((t) => !t.completed).length,
    },
  };
}
export function overlayNotes(
  data: NotesData,
  records: StoredRecord<Change>[],
): NotesData {
  const merged = new Map(data.items.map((note) => [note.id, note]));
  let pendingDeletions = 0;
  for (const { id, value: change } of records) {
    if (change.kind !== "note" || change.userId !== data.userId) continue;
    if (shouldHide(change)) {
      merged.delete(String(id));
      merged.delete(change.note.id);
      if (change.status === SyncStatus.Pending) pendingDeletions++;
      continue;
    }
    const current = merged.get(change.note.id);
    const synced = change.status === SyncStatus.Synced;
    if (synced && !current && change.confirmed) continue;
    const note: Note =
      synced && current && current.version >= change.note.version
        ? { ...current }
        : {
            ...(current ?? change.note),
            ...change.payload,
            excerpt: change.payload.content.slice(0, 240),
            version: change.note.version,
            updated: synced ? change.note.updated : change.updatedAt,
          };
    if (change.note.localId) note.localId = String(id);
    if (change.note.legacyId) note.legacyId = change.note.legacyId;
    delete note.syncStatus;
    delete note.syncError;
    delete note.localOnly;
    delete note.deletionPending;
    merged.delete(String(id));
    merged.set(note.id, { ...note, ...flags(change) });
  }
  return { ...data, items: [...merged.values()], pendingDeletions };
}
