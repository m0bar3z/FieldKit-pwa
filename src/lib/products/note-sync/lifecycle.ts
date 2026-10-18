import {
  subscribeToNoteSyncEvents,
  unsubscribeFromNoteSyncEvents,
} from "./events";
import { cancelNoteSyncRetry } from "./retry-scheduler";
import { runSync } from "./runner";
import { noteSyncState } from "./state";

function handleReconnect() {
  void runSync(true);
}

function handleNoteChange() {
  void runSync();
}

function stopNoteSync() {
  noteSyncState.subscribers -= 1;
  if (noteSyncState.subscribers) return;

  unsubscribeFromNoteSyncEvents(handleReconnect);
  cancelNoteSyncRetry();
}

export function startNoteSync() {
  noteSyncState.subscribers += 1;

  if (noteSyncState.subscribers === 1) {
    subscribeToNoteSyncEvents(handleReconnect, handleNoteChange);

    void runSync(true);
  }
  return stopNoteSync;
}
