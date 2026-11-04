import {
  IndexedDbAction,
  IndexedDbRecordType,
  SyncStatus,
} from "@/lib/indexed-db/enums";
import type { StoredRecord } from "@/lib/indexed-db/indexed-db";
import { noteSchema, taskStateSchema } from "../schemas";
import type { Note, Task } from "../types";

export type Kind = "task" | "note";
export type TaskPayload = {
  title: string;
  description: string;
  dueDate: string;
  completed?: boolean;
};
export type NotePayload = { title: string; content: string };
export type Action =
  | IndexedDbAction.Create
  | IndexedDbAction.Update
  | IndexedDbAction.Delete;
export type Attempt<P> = {
  mutationId: string;
  itemId: string;
  action: Action;
  revision: number;
  version: number;
  payload: P;
  legacy?: boolean;
};
type Base<P> = {
  syncVersion: 6;
  userId: string;
  action: Action;
  payload: P;
  revision: number;
  status: SyncStatus;
  recordType: IndexedDbRecordType;
  attempt: Attempt<P> | null;
  attempts: number;
  nextAttemptAt: number;
  updatedAt: number;
  error: string;
  confirmed: boolean;
};
export type TaskChange = Base<TaskPayload> & { kind: "task"; task: Task };
export type NoteChange = Base<NotePayload> & { kind: "note"; note: Note };
export type Change = TaskChange | NoteChange;
export type ProductAttempt = Attempt<TaskPayload> | Attempt<NotePayload>;
export const storeFor = (kind: Kind) => (kind === "task" ? "tasks" : "notes");
export const itemFor = (change: Change) =>
  change.kind === "task" ? change.task : change.note;
export const localKey = (item: Task | Note) => item.localId ?? item.id;
export function isChange(
  record: StoredRecord<unknown>,
): record is StoredRecord<Change> {
  const value = record.value;
  if (
    !(
      typeof record.id === "string" &&
      !!value &&
      typeof value === "object" &&
      "syncVersion" in value &&
      value.syncVersion === 6 &&
      "kind" in value &&
      (value.kind === "task" || value.kind === "note") &&
      "userId" in value &&
      typeof value.userId === "string" &&
      "revision" in value &&
      typeof value.revision === "number" &&
      value.revision > 0 &&
      "attempts" in value &&
      typeof value.attempts === "number" &&
      "nextAttemptAt" in value &&
      typeof value.nextAttemptAt === "number" &&
      "updatedAt" in value &&
      typeof value.updatedAt === "number" &&
      "error" in value &&
      typeof value.error === "string" &&
      "confirmed" in value &&
      typeof value.confirmed === "boolean" &&
      "recordType" in value &&
      Object.values(IndexedDbRecordType).some(
        (type) => type === value.recordType,
      ) &&
      "attempt" in value &&
      (value.attempt === null ||
        (typeof value.attempt === "object" &&
          "mutationId" in value.attempt &&
          "itemId" in value.attempt &&
          "payload" in value.attempt &&
          "revision" in value.attempt &&
          "version" in value.attempt &&
          "action" in value.attempt)) &&
      "status" in value &&
      Object.values(SyncStatus).some((status) => status === value.status) &&
      "action" in value &&
      Object.values(IndexedDbAction).some(
        (action) => action === value.action,
      ) &&
      "payload" in value
    )
  )
    return false;
  if (value.kind === "task")
    return (
      "task" in value &&
      !!value.task &&
      typeof value.task === "object" &&
      "id" in value.task &&
      "version" in value.task &&
      taskStateSchema.safeParse(value.payload).success
    );
  return (
    "note" in value &&
    !!value.note &&
    typeof value.note === "object" &&
    "id" in value.note &&
    "version" in value.note &&
    noteSchema.safeParse(value.payload).success
  );
}
