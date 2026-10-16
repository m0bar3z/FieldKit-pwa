import {
  ApiRequestError,
  apiRequest,
  refreshWorkspace,
} from "@/lib/api/client";
import { IndexedDbRecordType, NoteSyncStatus } from "@/lib/indexed-db/enums";
import { getAllFromStore, modifyFromStore } from "@/lib/indexed-db/indexed-db";
import type { NoteRecord } from "@/lib/memory/types";
import { isNoteEdit, type StoredNoteEdit } from "./note-edits";

const LOCK_NAME = "fieldkit-note-edits";
const CHANNEL_NAME = "fieldkit-note-edits";
let running: Promise<void> | null = null;
let rescanRequested = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let subscribers = 0;
let channel: BroadcastChannel | undefined;

export function notifyNoteChanges() {
  refreshWorkspace();
  if (channel) channel.postMessage("changed");
}

export async function readNoteEdits() {
  return (await getAllFromStore<unknown>("notes")).filter(isNoteEdit);
}

function retryDelay(attempts: number) {
  return Math.min(60_000, 1000 * 2 ** Math.min(attempts - 1, 6));
}

async function syncEdit(id: string) {
  // Freeze the exact request before sending it. A newer local edit can safely
  // arrive while this request is running without changing the request on retry.
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
            key: `${id}:${value.note.version}:${current.createdAt}:${value.revision}`,
            revision: value.revision,
            version: value.note.version,
            payload: value.payload,
          },
        },
      };
    },
  );
  const attempt = record?.value.attempt;
  if (!record || !attempt || record.value.status !== NoteSyncStatus.Pending)
    return false;
  try {
    const response = await apiRequest<{ item: NoteRecord }>(
      `/api/notes/${id}`,
      {
        method: "PATCH",
        headers: { "Idempotency-Key": attempt.key },
        body: JSON.stringify({
          ...attempt.payload,
          version: String(attempt.version),
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    await modifyFromStore<StoredNoteEdit>("notes", id, (current) => {
      if (!current || current.value.attempt?.key !== attempt.key)
        return current;
      const value = current.value;
      const hasNewerEdit = value.revision !== attempt.revision;
      const note = {
        ...value.note,
        ...attempt.payload,
        version: response.item.version,
        updated: response.item.updatedAt,
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
          updatedAt: hasNewerEdit ? value.updatedAt : response.item.updatedAt,
        },
      };
    });
    notifyNoteChanges();
    return true;
  } catch (error) {
    const retryable =
      error instanceof ApiRequestError
        ? error.status >= 500 || error.status === 408 || error.status === 429
        : error instanceof TypeError ||
          (error instanceof DOMException &&
            (error.name === "TimeoutError" || error.name === "AbortError"));
    await modifyFromStore<StoredNoteEdit>("notes", id, (current) => {
      if (!current || current.value.attempt?.key !== attempt.key)
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
    notifyNoteChanges();
    return false;
  }
}

async function drain(force: boolean) {
  let progressed = true;
  while (progressed && navigator.onLine) {
    progressed = false;
    const edits = (await readNoteEdits()).sort(
      (a, b) => a.createdAt - b.createdAt,
    );
    for (const record of edits) {
      if (!navigator.onLine) return;
      if (
        record.value.status !== NoteSyncStatus.Pending ||
        (!force && record.value.nextAttemptAt > Date.now())
      )
        continue;
      if (await syncEdit(String(record.id))) progressed = true;
    }
    // A forced reconnect/manual retry bypasses backoff only on the first pass.
    force = false;
  }
}

async function scheduleRetry() {
  if (!subscribers || !navigator.onLine) return;
  const pending = (await readNoteEdits()).filter(
    (record) => record.value.status === NoteSyncStatus.Pending,
  );
  if (!subscribers || !navigator.onLine || !pending.length) return;
  if (timer) clearTimeout(timer);
  const next = Math.min(...pending.map((record) => record.value.nextAttemptAt));
  timer = setTimeout(
    () => {
      void runSync();
    },
    Math.max(1000, next - Date.now()),
  );
}

export function syncPendingChanges(force = false): Promise<void> {
  if (running) {
    rescanRequested = true;
    return running;
  }
  if (typeof window === "undefined" || !navigator.onLine)
    return Promise.resolve();
  if (timer) clearTimeout(timer);
  running = (async () => {
    const processEdits = async () => {
      do {
        rescanRequested = false;
        await drain(force);
        force = false;
      } while (rescanRequested && navigator.onLine);
    };
    if (navigator.locks) {
      await navigator.locks.request(
        LOCK_NAME,
        { ifAvailable: true },
        async (lock) => {
          if (lock) await processEdits();
        },
      );
    } else {
      await processEdits();
    }
  })().finally(async () => {
    running = null;
    await scheduleRetry();
  });
  return running;
}

async function runSync(force = false) {
  try {
    await syncPendingChanges(force);
  } catch (error) {
    console.warn("Unable to synchronize note edits.", error);
  }
}

const reconnect = () => {
  void runSync(true);
};

export function startNoteSync() {
  subscribers += 1;
  if (subscribers === 1) {
    window.addEventListener("online", reconnect);
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = () => {
        refreshWorkspace();
        void runSync();
      };
    }
    void runSync(true);
  }
  return () => {
    subscribers -= 1;
    if (subscribers) return;
    window.removeEventListener("online", reconnect);
    if (timer) clearTimeout(timer);
    channel?.close();
    channel = undefined;
  };
}

export async function retryNoteEdit(id: string) {
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
  notifyNoteChanges();
  await syncPendingChanges(true);
}

export async function discardNoteEdit(id: string) {
  const remove = async () => {
    await modifyFromStore<StoredNoteEdit>("notes", id, () => undefined);
  };
  if (navigator.locks) await navigator.locks.request(LOCK_NAME, remove);
  else {
    if (running) await running;
    await remove();
  }
  notifyNoteChanges();
}
