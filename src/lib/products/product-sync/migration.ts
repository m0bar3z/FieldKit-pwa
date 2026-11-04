import { z } from "zod";
import { LEGACY_USER_ID } from "@/lib/auth/types";
import {
  IndexedDbAction,
  IndexedDbRecordType,
  SyncStatus,
} from "@/lib/indexed-db/enums";
import type { StoredRecord } from "@/lib/indexed-db/indexed-db";
import { noteSchema, taskStateSchema } from "../schemas";
import type { Note } from "../types";

const metadata = {
  id: z.string(),
  userId: z.string().optional(),
  version: z.number(),
  updated: z.number().nullable().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        version: z.number(),
        name: z.string(),
        size: z.string(),
        kind: z.enum(["image", "file"]),
      }),
    )
    .default([]),
};
const task = taskStateSchema.extend({
  ...metadata,
  completed: z.boolean(),
  group: z.enum(["overdue", "today", "upcoming", "unscheduled", "completed"]),
  reminderAt: z.number().nullable(),
  localId: z.string().optional(),
  localOnly: z.boolean().optional(),
});
const note = noteSchema.extend({
  ...metadata,
  excerpt: z.string(),
  updated: z.number(),
});
const common = {
  action: z.enum(IndexedDbAction),
  revision: z.number(),
  status: z.enum(SyncStatus),
  attempts: z.number(),
  nextAttemptAt: z.number(),
  error: z.string(),
  updatedAt: z.number().optional(),
  confirmed: z.boolean().optional(),
};
const oldTask = z.object({
  ...common,
  kind: z.literal("task"),
  userId: z.string(),
  task,
  payload: taskStateSchema,
  attempt: z
    .object({
      mutationId: z.string(),
      taskId: z.string(),
      action: z.enum(IndexedDbAction),
      revision: z.number(),
      version: z.number(),
      payload: taskStateSchema,
    })
    .nullable(),
});
const oldNote = z.object({
  ...common,
  kind: z.literal("note"),
  note,
  payload: noteSchema,
  recordType: z.enum(IndexedDbRecordType),
  attempt: z
    .object({ revision: z.number(), version: z.number(), payload: noteSchema })
    .nullable(),
});
const creation = z.object({
  userId: z.string().optional(),
  kind: z.literal("note"),
  action: z.literal(IndexedDbAction.Create),
  payload: noteSchema.extend({ kind: z.literal("note") }),
});

// Called synchronously from a single versionchange transaction. Unknown records stay intact.
export function migrateRecord(
  store: "tasks" | "notes",
  record: StoredRecord<unknown>,
): StoredRecord<unknown> {
  if (
    record.value &&
    typeof record.value === "object" &&
    "syncVersion" in record.value
  )
    return record;
  if (typeof record.id === "string" && record.id.startsWith("snapshot:"))
    return {
      ...record,
      value: { syncVersion: 6, recordType: "snapshot", data: record.value },
    };
  const parsedTask =
    store === "tasks" ? oldTask.safeParse(record.value) : undefined;
  if (parsedTask?.success) {
    const value = parsedTask.data;
    return {
      ...record,
      value: {
        ...value,
        syncVersion: 6,
        task: {
          ...value.task,
          userId: value.userId,
          updated: value.task.updated ?? null,
        },
        recordType:
          value.status === SyncStatus.Synced
            ? IndexedDbRecordType.SyncedItem
            : IndexedDbRecordType.PendingChange,
        attempt: value.attempt
          ? { ...value.attempt, itemId: value.attempt.taskId }
          : null,
        updatedAt: value.updatedAt ?? value.task.updated ?? record.createdAt,
        confirmed: value.confirmed ?? false,
      },
    };
  }
  const parsedNote =
    store === "notes" ? oldNote.safeParse(record.value) : undefined;
  if (parsedNote?.success) {
    const value = parsedNote.data;
    return {
      ...record,
      value: {
        ...value,
        syncVersion: 6,
        userId: value.note.userId ?? LEGACY_USER_ID,
        note: { ...value.note, userId: value.note.userId ?? LEGACY_USER_ID },
        attempt: value.attempt
          ? {
              ...value.attempt,
              action: IndexedDbAction.Update,
              itemId: value.note.id,
              mutationId: crypto.randomUUID(),
              legacy: true,
            }
          : null,
        updatedAt: value.updatedAt ?? value.note.updated,
        confirmed: value.status === SyncStatus.Synced,
      },
    };
  }
  const parsedCreation =
    store === "notes" && typeof record.id === "number"
      ? creation.safeParse(record.value)
      : undefined;
  if (parsedCreation?.success) {
    const { payload, userId = LEGACY_USER_ID } = parsedCreation.data;
    const id = crypto.randomUUID();
    const item: Note = {
      id,
      localId: id,
      legacyId: String(record.id),
      localOnly: true,
      userId,
      title: payload.title,
      content: payload.content,
      excerpt: payload.content.slice(0, 240),
      version: 1,
      updated: record.createdAt,
      attachments: [],
    };
    return {
      ...record,
      id,
      value: {
        syncVersion: 6,
        kind: "note",
        userId,
        note: item,
        action: IndexedDbAction.Create,
        payload: { title: payload.title, content: payload.content },
        revision: 1,
        status: SyncStatus.Pending,
        recordType: IndexedDbRecordType.PendingChange,
        attempt: null,
        attempts: 0,
        nextAttemptAt: 0,
        updatedAt: record.createdAt,
        error: "",
        confirmed: false,
      },
    };
  }
  return record;
}
