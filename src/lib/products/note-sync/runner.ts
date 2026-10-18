import { processNoteSyncQueue } from "./queue";
import { cancelNoteSyncRetry, scheduleNoteSyncRetry } from "./retry-scheduler";
import { noteSyncState } from "./state";

function retryPendingChanges() {
  void runSync();
}

async function finishNoteSync() {
  noteSyncState.running = null;

  await scheduleNoteSyncRetry(retryPendingChanges);
}

export function syncPendingChanges(force = false): Promise<void> {
  if (noteSyncState.running) {
    noteSyncState.rescanRequested = true;

    return noteSyncState.running;
  }
  if (typeof window === "undefined" || !navigator.onLine)
    return Promise.resolve();

  cancelNoteSyncRetry();

  noteSyncState.running = processNoteSyncQueue(force).finally(finishNoteSync);

  return noteSyncState.running;
}

export async function runSync(force = false) {
  try {
    await syncPendingChanges(force);
  } catch (error) {
    console.warn("Unable to synchronize note edits.", error);
  }
}
