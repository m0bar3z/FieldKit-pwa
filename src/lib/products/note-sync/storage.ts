import { IndexedDbRecordType, NoteSyncStatus } from "@/lib/indexed-db/enums";
import { getAllFromStore, modifyFromStore } from "@/lib/indexed-db/indexed-db";
import type { NoteRecord } from "@/lib/memory/types";
import {
  isNoteEdit,
  type NoteEditAttempt,
  type StoredNoteEdit,
} from "../note-edits";
import { isRetryableSyncError, retryDelay } from "./retry-policy";

export async function readNoteEdits() {
  return (await getAllFromStore<unknown>("notes")).filter(isNoteEdit);
}

export async function prepareNoteEditAttempt(id: string) {
  // Preserve the submitted revision even when another edit arrives during upload.
  const record = await modifyFromStore<StoredNoteEdit>(
    "notes",
    id,
    (current) => {
      if (!current || current.value.status !== NoteSyncStatus.Pending)
        return current;

      const value = current.value;

      return {
        ...current,
        value: {
          ...value,
          attempt: value.attempt ?? {
            revision: value.revision,
            version: value.note.version,
            payload: value.payload,
          },
        },
      };
    },
  );

  return record?.value.status === NoteSyncStatus.Pending
    ? record.value.attempt
    : null;
}

export async function acknowledgeNoteEdit(
  id: string,
  attempt: NoteEditAttempt,
  item: NoteRecord,
) {
  await modifyFromStore<StoredNoteEdit>("notes", id, (current) => {
    if (!current || current.value.attempt?.revision !== attempt.revision)
      return current;

    const value = current.value;
    const hasNewerEdit = value.revision !== attempt.revision;

    const note = {
      ...value.note,
      ...attempt.payload,
      version: item.version,
      updated: item.updatedAt,
      excerpt: attempt.payload.content.slice(0, 240),
    };

    delete note.syncStatus;
    delete note.syncError;

    return {
      ...current,
      value: {
        ...value,
        note,
        recordType: hasNewerEdit
          ? IndexedDbRecordType.PendingChange
          : IndexedDbRecordType.SyncedItem,
        status: hasNewerEdit ? NoteSyncStatus.Pending : NoteSyncStatus.Synced,
        attempt: null,
        attempts: 0,
        nextAttemptAt: 0,
        error: "",
        updatedAt: hasNewerEdit ? value.updatedAt : item.updatedAt,
      },
    };
  });
}

export async function recordNoteSyncFailure(
  id: string,
  attempt: NoteEditAttempt,
  error: unknown,
) {
  const retryable = isRetryableSyncError(error);

  await modifyFromStore<StoredNoteEdit>("notes", id, (current) => {
    if (!current || current.value.attempt?.revision !== attempt.revision)
      return current;

    const attempts = current.value.attempts + 1;

    return {
      ...current,
      value: {
        ...current.value,
        status: retryable ? NoteSyncStatus.Pending : NoteSyncStatus.Failed,
        attempts,
        nextAttemptAt: retryable ? Date.now() + retryDelay(attempts) : 0,
        error: retryable
          ? "Saved on this device. Waiting to retry synchronization."
          : error instanceof Error
            ? error.message
            : "This edit could not be synchronized.",
      },
    };
  });
}

export async function resetNoteEditForRetry(id: string) {
  await modifyFromStore<StoredNoteEdit>("notes", id, (current) =>
    current && current.value.status !== NoteSyncStatus.Synced
      ? {
          ...current,
          value: {
            ...current.value,
            status: NoteSyncStatus.Pending,
            error: "",
            attempts: 0,
            nextAttemptAt: 0,
          },
        }
      : current,
  );
}

export async function removeNoteEdit(id: string) {
  await modifyFromStore<StoredNoteEdit>("notes", id, () => undefined);
}
