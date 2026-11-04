import { ApiRequestError } from "@/lib/api/client";
import {
  IndexedDbAction,
  IndexedDbRecordType,
  SyncStatus,
} from "@/lib/indexed-db/enums";
import {
  findFromStore,
  getAllFromStore,
  modifyFromStore,
} from "@/lib/indexed-db/indexed-db";
import type { NoteRecord, TaskRecord } from "@/lib/memory/types";
import type { NotesData, TasksData } from "../types";
import { acknowledgeItem, overlayNotes, overlayTasks } from "./adapters";
import {
  type Change,
  isChange,
  itemFor,
  type Kind,
  type ProductAttempt,
  storeFor,
} from "./model";

export async function readChanges(userId?: string, kind?: Kind) {
  const kinds: Kind[] = kind ? [kind] : ["task", "note"];
  const results = await Promise.all(
    kinds.map(async (k) =>
      (await getAllFromStore<unknown>(storeFor(k)))
        .filter(isChange)
        .filter(
          (r) => r.value.kind === k && (!userId || r.value.userId === userId),
        ),
    ),
  );
  return results.flat();
}
export async function hasPending(userId?: string) {
  return (await readChanges(userId)).some(
    (r) => r.value.status === SyncStatus.Pending,
  );
}
export async function prepareAttempt(kind: Kind, id: string, userId: string) {
  const record = await modifyFromStore<Change>(
    storeFor(kind),
    id,
    (current) => {
      if (
        !current ||
        current.value.userId !== userId ||
        current.value.status !== SyncStatus.Pending
      )
        return current;
      const value = current.value;
      if (value.attempt) return current;
      const identity = {
        mutationId: crypto.randomUUID(),
        itemId: itemFor(value).id,
        action: value.action,
        revision: value.revision,
        version: itemFor(value).version,
      };
      if (value.kind === "task")
        return {
          ...current,
          value: { ...value, attempt: { ...identity, payload: value.payload } },
        };
      return {
        ...current,
        value: {
          ...value,
          attempt: {
            ...identity,
            payload: value.payload,
          },
        },
      };
    },
  );
  return record?.value.userId === userId &&
    record.value.status === SyncStatus.Pending
    ? record.value.attempt
    : null;
}
export async function acknowledge(
  kind: Kind,
  id: string,
  userId: string,
  attempt: ProductAttempt,
  item?: TaskRecord | NoteRecord,
) {
  if (
    (!item && attempt.action !== IndexedDbAction.Delete) ||
    (item && item.userId !== userId)
  )
    throw new Error("Unexpected synchronization acknowledgement.");
  await modifyFromStore<Change>(storeFor(kind), id, (current) => {
    if (
      !current ||
      current.value.userId !== userId ||
      current.value.attempt?.mutationId !== attempt.mutationId
    )
      return current;
    const value = current.value;
    const newer = value.revision !== attempt.revision;
    return {
      ...current,
      value: {
        ...acknowledgeItem(value, attempt, item),
        action:
          value.action === IndexedDbAction.Delete
            ? IndexedDbAction.Delete
            : IndexedDbAction.Update,
        status: newer ? SyncStatus.Pending : SyncStatus.Synced,
        recordType: newer
          ? IndexedDbRecordType.PendingChange
          : IndexedDbRecordType.SyncedItem,
        attempt: null,
        attempts: 0,
        nextAttemptAt: 0,
        error: "",
        confirmed: false,
        updatedAt: newer
          ? value.updatedAt
          : (item?.updatedAt ?? value.updatedAt),
      },
    };
  });
}
export function retryable(error: unknown) {
  return error instanceof ApiRequestError
    ? error.status >= 500 || error.status === 408 || error.status === 429
    : error instanceof TypeError ||
        (error instanceof DOMException &&
          ["TimeoutError", "AbortError"].includes(error.name));
}
export const retryDelay = (attempts: number) =>
  Math.min(60000, 1000 * 2 ** Math.min(attempts - 1, 6));
export async function failAttempt(
  kind: Kind,
  id: string,
  userId: string,
  attempt: ProductAttempt,
  error: unknown,
) {
  await modifyFromStore<Change>(storeFor(kind), id, (current) => {
    if (
      !current ||
      current.value.userId !== userId ||
      current.value.attempt?.mutationId !== attempt.mutationId
    )
      return current;
    const attempts = current.value.attempts + 1;
    const canRetry = retryable(error);
    return {
      ...current,
      value: {
        ...current.value,
        attempts,
        status: canRetry ? SyncStatus.Pending : SyncStatus.Failed,
        nextAttemptAt: canRetry ? Date.now() + retryDelay(attempts) : 0,
        error:
          error instanceof ApiRequestError && error.status === 409
            ? `This ${kind} changed elsewhere. Your local changes are saved. Discard them to load the latest server version.`
            : error instanceof Error
              ? error.message
              : `Unable to synchronize this ${kind}.`,
      },
    };
  });
}
type Snapshot<T> = { syncVersion: 6; recordType: "snapshot"; data: T };
async function saveSnapshot(kind: Kind, data: TasksData | NotesData) {
  const key = `snapshot:${data.userId}`;
  await modifyFromStore<Snapshot<TasksData | NotesData>>(
    storeFor(kind),
    key,
    () => ({
      id: key,
      createdAt: Date.now(),
      value: { syncVersion: 6, recordType: "snapshot", data },
    }),
  );
  const records = await readChanges(data.userId, kind);
  for (const { id, value } of records) {
    if (
      value.status === SyncStatus.Synced &&
      !value.confirmed &&
      data.items.some(
        (item) =>
          item.id === itemFor(value).id &&
          item.version >= itemFor(value).version,
      )
    )
      await modifyFromStore<Change>(storeFor(kind), id, (current) =>
        current &&
        current.value.revision === value.revision &&
        current.value.status === SyncStatus.Synced
          ? { ...current, value: { ...current.value, confirmed: true } }
          : current,
      );
  }
  return records;
}
export async function mergeLocalTasks(data: TasksData) {
  return overlayTasks(data, await saveSnapshot("task", data));
}
export async function mergeLocalNotes(data: NotesData) {
  return overlayNotes(data, await saveSnapshot("note", data));
}
export async function loadLocalTasks(userId: string): Promise<TasksData> {
  const snapshot = await findFromStore<Snapshot<TasksData>>(
    "tasks",
    `snapshot:${userId}`,
  );
  const data = (snapshot?.value.data?.userId === userId
    ? snapshot.value.data
    : undefined) ?? {
    userId,
    items: [],
    today: "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    counts: { dueToday: 0, overdue: 0, completedTasks: 0, openTasks: 0 },
  };
  return overlayTasks(data, await readChanges(userId, "task"));
}
export async function loadLocalNotes(userId: string): Promise<NotesData> {
  const snapshot = await findFromStore<Snapshot<NotesData>>(
    "notes",
    `snapshot:${userId}`,
  );
  const data = (snapshot?.value.data?.userId === userId
    ? snapshot.value.data
    : undefined) ?? {
    userId,
    items: [],
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  return overlayNotes(data, await readChanges(userId, "note"));
}
