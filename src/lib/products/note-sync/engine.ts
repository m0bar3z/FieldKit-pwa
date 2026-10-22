import { apiRequest } from "@/lib/api/client";
import { NoteSyncStatus } from "@/lib/indexed-db/enums";
import type { StoredRecord } from "@/lib/indexed-db/indexed-db";
import type { NoteRecord } from "@/lib/memory/types";
import type { NoteEditAttempt, StoredNoteEdit } from "../note-edits";
import {
  acknowledgeNoteEdit,
  hasPendingNoteEdits,
  prepareNoteEditAttempt,
  readNoteEdits,
  recordNoteSyncFailure,
} from "./storage";

const LOCK_NAME = "fieldkit-note-edits";
type OnChange = () => void | Promise<void>;

export async function withNoteSyncLock<T>(
  action: () => Promise<T>,
): Promise<T> {
  if (!navigator.locks) return action();

  return navigator.locks.request(LOCK_NAME, () => action());
}

export function processNoteSyncQueue(force: boolean, onChange: OnChange) {
  return withNoteSyncLock(async () => {
    let progressed = true;

    while (progressed && navigator.onLine) {
      progressed = await syncQueuePass(force, onChange);

      force = false;
    }

    return hasPendingNoteEdits();
  });
}

function isReadyToSync(record: StoredRecord<StoredNoteEdit>, force: boolean) {
  return (
    record.value.status === NoteSyncStatus.Pending &&
    (force || record.value.nextAttemptAt <= Date.now())
  );
}

async function syncQueuePass(force: boolean, onChange: OnChange) {
  let progressed = false;
  const edits = (await readNoteEdits()).sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  for (const record of edits) {
    if (!navigator.onLine) break;
    if (!isReadyToSync(record, force)) continue;

    if (await syncEdit(String(record.id), onChange)) progressed = true;
  }

  return progressed;
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

async function syncEdit(id: string, onChange: OnChange) {
  const attempt = await prepareNoteEditAttempt(id);
  if (!attempt) return false;

  let synced = false;
  try {
    const item = await uploadNoteEdit(id, attempt);
    await acknowledgeNoteEdit(id, attempt, item);
    synced = true;
  } catch (error) {
    await recordNoteSyncFailure(id, attempt, error);
  }

  await onChange();
  return synced;
}
