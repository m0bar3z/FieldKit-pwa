import { notifyNoteChanges } from "./events";
import { withNoteSyncLock } from "./queue";
import { syncPendingChanges } from "./runner";
import { noteSyncState } from "./state";
import { removeNoteEdit, resetNoteEditForRetry } from "./storage";

export async function retryNoteEdit(id: string) {
  await resetNoteEditForRetry(id);

  notifyNoteChanges();

  await syncPendingChanges(true);
}

export async function discardNoteEdit(id: string) {
  if (!navigator.locks && noteSyncState.running) await noteSyncState.running;

  await withNoteSyncLock(() => removeNoteEdit(id));

  notifyNoteChanges();
}
