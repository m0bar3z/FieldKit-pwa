import { apiRequest, refreshWorkspace } from "@/lib/api/client";
import { NoteSyncStatus } from "@/lib/indexed-db/enums";
import type { StoredRecord } from "@/lib/indexed-db/indexed-db";
import type { NoteRecord } from "@/lib/memory/types";
import type { NoteEditAttempt, StoredNoteEdit } from "../note-edits";
import {
  acknowledgeNoteEdit,
  prepareNoteEditAttempt,
  readNoteEdits,
  recordNoteSyncFailure,
  removeNoteEdit,
  resetNoteEditForRetry,
} from "./storage";

const LOCK_NAME = "fieldkit-note-edits";

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

  noteSyncState.channel?.close();
  noteSyncState.channel = undefined;
}

function handleReconnect() {
  void runSync(true);
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

    if (typeof BroadcastChannel !== "undefined") {
      noteSyncState.channel = new BroadcastChannel("fieldkit-note-edits");
      noteSyncState.channel.onmessage = handleNoteChange;
    }

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

  noteSyncState.running = processNoteSyncQueue(force).finally(finishNoteSync);

  return noteSyncState.running;
}

async function runSync(force = false) {
  try {
    await syncPendingChanges(force);
  } catch (error) {
    console.warn("Unable to synchronize note edits.", error);
  }
}

function isReadyToSync(record: StoredRecord<StoredNoteEdit>, force: boolean) {
  return (
    record.value.status === NoteSyncStatus.Pending &&
    (force || record.value.nextAttemptAt <= Date.now())
  );
}

async function syncQueuePass(force: boolean) {
  let progressed = false;

  const edits = (await readNoteEdits()).sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  for (const record of edits) {
    if (!navigator.onLine) break;

    if (!isReadyToSync(record, force)) continue;

    if (await syncEdit(String(record.id))) progressed = true;
  }
  return progressed;
}

async function drainPendingEdits(force: boolean) {
  let progressed = true;

  while (progressed && navigator.onLine) {
    progressed = await syncQueuePass(force);

    // Reconnect/manual retry bypasses backoff only on the first pass.
    force = false;
  }
}

async function processPendingEdits(force: boolean) {
  do {
    noteSyncState.rescanRequested = false;

    await drainPendingEdits(force);

    force = false;
  } while (noteSyncState.rescanRequested && navigator.onLine);
}

async function withNoteSyncLock(
  action: () => Promise<void>,
  ifAvailable = false,
) {
  if (!navigator.locks) return action();

  await navigator.locks.request(LOCK_NAME, { ifAvailable }, async (lock) => {
    if (lock) await action();
  });
}

function processNoteSyncQueue(force: boolean) {
  return withNoteSyncLock(() => processPendingEdits(force), true);
}

async function uploadNoteEdit(id: string, attempt: NoteEditAttempt) {
  const response = await apiRequest<{ item: NoteRecord }>(`/api/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...attempt.payload,
      version: String(attempt.version),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  return response.item;
}

async function syncEdit(id: string) {
  const attempt = await prepareNoteEditAttempt(id);

  if (!attempt) return false;

  try {
    const item = await uploadNoteEdit(id, attempt);

    await acknowledgeNoteEdit(id, attempt, item);

    notifyNoteChanges();

    return true;
  } catch (error) {
    await recordNoteSyncFailure(id, attempt, error);

    notifyNoteChanges();

    return false;
  }
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

  await syncPendingChanges(true);
}

export async function discardNoteEdit(id: string) {
  if (!navigator.locks && noteSyncState.running) await noteSyncState.running;

  await withNoteSyncLock(() => removeNoteEdit(id));

  notifyNoteChanges();
}
