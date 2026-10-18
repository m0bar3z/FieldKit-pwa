import { NoteSyncStatus } from "@/lib/indexed-db/enums";
import { noteSyncState } from "./state";
import { readNoteEdits } from "./storage";

export function cancelNoteSyncRetry() {
  if (noteSyncState.timer) clearTimeout(noteSyncState.timer);

  noteSyncState.timer = undefined;
}

export async function scheduleNoteSyncRetry(retry: () => void) {
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
