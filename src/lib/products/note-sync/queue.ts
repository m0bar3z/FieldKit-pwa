import { NoteSyncStatus } from "@/lib/indexed-db/enums";
import type { StoredRecord } from "@/lib/indexed-db/indexed-db";
import type { StoredNoteEdit } from "../note-edits";
import { noteSyncState } from "./state";
import { readNoteEdits } from "./storage";
import { syncEdit } from "./sync-edit";

const LOCK_NAME = "fieldkit-note-edits";

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

export async function withNoteSyncLock(
  action: () => Promise<void>,
  ifAvailable = false,
) {
  if (!navigator.locks) return action();

  await navigator.locks.request(LOCK_NAME, { ifAvailable }, async (lock) => {
    if (lock) await action();
  });
}

export function processNoteSyncQueue(force: boolean) {
  return withNoteSyncLock(() => processPendingEdits(force), true);
}
