import {
  IndexedDbAction,
  IndexedDbRecordType,
  NoteSyncStatus,
} from "@/lib/indexed-db/enums";
import type { StoredRecord } from "@/lib/indexed-db/indexed-db";
import type { Note } from "./types";

export type NoteEditPayload = { title: string; content: string };

export type NoteEditAttempt = {
  key: string;
  revision: number;
  version: number;
  payload: NoteEditPayload;
};

export type StoredNoteEdit = {
  kind: "note";
  action: IndexedDbAction.Update;
  recordType: IndexedDbRecordType;
  note: Note;
  payload: NoteEditPayload;
  revision: number;
  status: NoteSyncStatus;
  attempt: NoteEditAttempt | null;
  attempts: number;
  nextAttemptAt: number;
  updatedAt: number;
  error: string;
};

export function isNoteEdit(
  record: StoredRecord<unknown>,
): record is StoredRecord<StoredNoteEdit> {
  const value = record.value;
  return (
    typeof record.id === "string" &&
    !!value &&
    typeof value === "object" &&
    "kind" in value &&
    value.kind === "note" &&
    "action" in value &&
    value.action === IndexedDbAction.Update &&
    "recordType" in value &&
    (value.recordType === IndexedDbRecordType.PendingChange ||
      value.recordType === IndexedDbRecordType.SyncedItem) &&
    "note" in value &&
    "payload" in value &&
    "revision" in value
  );
}

export function applyNoteEdits(
  notes: Note[],
  edits: StoredRecord<StoredNoteEdit>[],
): Note[] {
  const merged = new Map(notes.map((note) => [note.id, note]));
  for (const { value } of edits) {
    const current = merged.get(value.note.id);
    if (
      value.status === NoteSyncStatus.Synced &&
      (!current || current.version >= value.note.version)
    )
      continue;
    const note: Note = {
      ...(current ?? value.note),
      ...value.payload,
      version: value.note.version,
      excerpt: value.payload.content.slice(0, 240),
      updated: value.updatedAt,
    };
    if (value.status !== NoteSyncStatus.Synced) {
      note.syncStatus = value.status;
      note.syncError = value.error;
    } else {
      delete note.syncStatus;
      delete note.syncError;
    }
    merged.set(note.id, note);
  }
  return [...merged.values()];
}
