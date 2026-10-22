import { refreshWorkspace } from "@/lib/api/client";
import { NoteSyncStatus } from "@/lib/indexed-db/enums";
import {
  NOTE_SYNC_CHANGED,
  requestNoteBackgroundSync,
} from "./background-sync";
import { processNoteSyncQueue, withNoteSyncLock } from "./engine";
import {
  readNoteEdits,
  removeNoteEdit,
  resetNoteEditForRetry,
} from "./storage";

type NoteSyncState = {
  running: Promise<void> | null;
  rescanRequested: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  subscribers: number;
  channel: BroadcastChannel | undefined;
};

// Runtime state shared by synchronization, retry scheduling, and browser events.
const noteSyncState: NoteSyncState = {
  running: null,
  rescanRequested: false,
  timer: undefined,
  subscribers: 0,
  channel: undefined,
};

export function notifyNoteChanges() {
  refreshWorkspace();
  noteSyncState.channel?.postMessage("changed");
}

function unsubscribeFromNoteSyncEvents(onReconnect: () => void) {
  window.removeEventListener("online", onReconnect);
  navigator.serviceWorker?.removeEventListener(
    "message",
    handleWorkerNoteChange,
  );

  noteSyncState.channel?.close();
  noteSyncState.channel = undefined;
}

function handleReconnect() {
  void requestNoteBackgroundSync();
  void runSync(true);
}

function handleWorkerNoteChange(event: MessageEvent<unknown>) {
  if (event.data === NOTE_SYNC_CHANGED) handleNoteChange();
}

function handleNoteChange() {
  refreshWorkspace();
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
    window.addEventListener("online", handleReconnect);
    navigator.serviceWorker?.addEventListener(
      "message",
      handleWorkerNoteChange,
    );

    if (typeof BroadcastChannel !== "undefined") {
      noteSyncState.channel = new BroadcastChannel("fieldkit-note-edits");
      noteSyncState.channel.onmessage = handleNoteChange;
    }

    void requestNoteBackgroundSync();
    void runSync(true);
  }
  return stopNoteSync;
}

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

  noteSyncState.running = processPendingEdits(force).finally(finishNoteSync);

  return noteSyncState.running;
}

async function runSync(force = false) {
  try {
    await syncPendingChanges(force);
  } catch (error) {
    console.warn("Unable to synchronize note edits.", error);
  }
}

async function processPendingEdits(force: boolean) {
  do {
    noteSyncState.rescanRequested = false;

    await processNoteSyncQueue(force, notifyNoteChanges);

    force = false;
  } while (noteSyncState.rescanRequested && navigator.onLine);
}

function cancelNoteSyncRetry() {
  if (noteSyncState.timer) clearTimeout(noteSyncState.timer);

  noteSyncState.timer = undefined;
}

async function scheduleNoteSyncRetry(retry: () => void) {
  if (!noteSyncState.subscribers || !navigator.onLine) return;

  const pending = (await readNoteEdits()).filter(
    (record) => record.value.status === NoteSyncStatus.Pending,
  );

  if (!noteSyncState.subscribers || !navigator.onLine || !pending.length)
    return;

  cancelNoteSyncRetry();

  const next = Math.min(...pending.map((record) => record.value.nextAttemptAt));

  noteSyncState.timer = setTimeout(retry, Math.max(1000, next - Date.now()));
}

export async function retryNoteEdit(id: string) {
  await resetNoteEditForRetry(id);

  notifyNoteChanges();
  void requestNoteBackgroundSync();

  await syncPendingChanges(true);
}

export async function discardNoteEdit(id: string) {
  if (!navigator.locks && noteSyncState.running) await noteSyncState.running;

  await withNoteSyncLock(() => removeNoteEdit(id));

  notifyNoteChanges();
}
