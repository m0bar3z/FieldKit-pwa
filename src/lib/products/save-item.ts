import { LEGACY_USER_ID } from "@/lib/auth/types";
import {
  IndexedDbAction,
  IndexedDbRecordType,
  NoteSyncStatus,
} from "@/lib/indexed-db/enums";
import { modifyFromStore } from "@/lib/indexed-db/indexed-db";
import type { StoredNoteEdit } from "./note-edits";
import { notifyNoteChanges, syncPendingChanges } from "./note-sync";
import { requestNoteBackgroundSync } from "./note-sync/background-sync";
import { noteSchema, productIdSchema } from "./schemas";
import type { Note } from "./types";

// This save path only handles edits to notes that already have a server ID.
export async function saveItem(
  note: Note,
  input: { title: string; content: string },
) {
  const id = productIdSchema.parse(note.id);
  const payload = noteSchema.parse(input);

  await modifyFromStore<StoredNoteEdit>("notes", id, (current) => {
    const previous = current?.value;
    if (previous && (previous.note.userId ?? LEGACY_USER_ID) !== note.userId)
      throw new Error("This note belongs to another account.");
    const baseline =
      previous && previous.note.version > note.version ? previous.note : note;

    return {
      id,
      createdAt: current?.createdAt ?? Date.now(),
      value: {
        kind: "note",
        action: IndexedDbAction.Update,
        recordType: IndexedDbRecordType.PendingChange,
        note: baseline,
        payload,
        revision: (previous?.revision ?? 0) + 1,
        status: NoteSyncStatus.Pending,
        attempt: previous?.attempt ?? null,
        attempts: 0,
        nextAttemptAt: 0,
        updatedAt: Date.now(),
        error: "",
      },
    };
  });

  notifyNoteChanges();
  void requestNoteBackgroundSync();

  void syncPendingChanges().catch((error) =>
    console.warn(
      "Note edit is saved locally; synchronization will retry.",
      error,
    ),
  );

  return { success: "Note saved on this device." };
}
