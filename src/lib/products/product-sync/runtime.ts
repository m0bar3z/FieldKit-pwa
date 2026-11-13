import { refreshItems, refreshNotes, refreshTasks } from "@/lib/api/client";
import { SyncStatus } from "@/lib/indexed-db/enums";
import { initializeDB, modifyFromStore } from "@/lib/indexed-db/indexed-db";
import {
  LEGACY_SYNC_MESSAGES,
  PRODUCT_SYNC_CHANGED,
  requestProductBackgroundSync,
  requestProductPeriodicSync,
} from "./background-sync";
import { processProductQueue } from "./engine";
import { withProductLock } from "./locks";
import { type Change, type Kind, storeFor } from "./model";
import { readChanges, retryDelay } from "./storage";

let currentUserId: string | undefined;
let generation = 0;
let running: Promise<void> | null = null;
let rescan = false;
let forceRescan = false;
let subscribers = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let channel: BroadcastChannel | undefined;
let sessionFailures = 0;

export function notifyProductChanges(kind: Kind) {
  refreshItems(kind);
  channel?.postMessage(kind);
}
export function syncProducts(
  force = false,
  userId = currentUserId,
): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine || !userId)
    return Promise.resolve();
  if (running) {
    rescan = true;
    forceRescan ||= force;
    return running;
  }
  clearTimeout(timer);
  const started = generation;
  const active = () =>
    generation === started && (!currentUserId || currentUserId === userId);
  running = (async () => {
    do {
      rescan = false;
      const nextForce = force || forceRescan;
      forceRescan = false;
      await processProductQueue(
        nextForce,
        notifyProductChanges,
        userId,
        active,
      );
      sessionFailures = 0;
      force = false;
    } while (rescan && navigator.onLine && active());
  })()
    .catch((error: unknown) => {
      sessionFailures++;
      throw error;
    })
    .finally(async () => {
      running = null;
      if (!subscribers || !navigator.onLine || !currentUserId) return;
      const pending = (await readChanges(currentUserId)).filter(
        (r) => r.value.status === SyncStatus.Pending,
      );
      if (!subscribers || !pending.length) return;
      const next = Math.min(...pending.map((r) => r.value.nextAttemptAt));
      timer = setTimeout(
        () => void runSync(),
        Math.max(
          1000,
          next - Date.now(),
          sessionFailures ? retryDelay(sessionFailures) : 0,
        ),
      );
    });
  return running;
}
export async function runSync(force = false, userId = currentUserId) {
  try {
    await syncProducts(force, userId);
  } catch (error) {
    console.warn("Unable to synchronize saved changes.", error);
  }
}
function onReconnect() {
  void requestProductBackgroundSync();
  void runSync(true);
}
function onWorkerChange(event: MessageEvent<unknown>) {
  if (
    event.data === PRODUCT_SYNC_CHANGED ||
    (typeof event.data === "string" &&
      LEGACY_SYNC_MESSAGES.includes(event.data))
  ) {
    refreshNotes();
    refreshTasks();
    void runSync();
  }
}
export function startProductSync(userId: string) {
  if (currentUserId && currentUserId !== userId) generation++;
  currentUserId = userId;
  subscribers++;
  if (subscribers === 1) {
    window.addEventListener("online", onReconnect);
    navigator.serviceWorker?.addEventListener("message", onWorkerChange);
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("fieldkit-products");
      channel.onmessage = () => {
        refreshNotes();
        refreshTasks();
        void runSync();
      };
    }
    onReconnect();
    void requestProductPeriodicSync();
  }
  return () => {
    subscribers--;
    if (subscribers) return;
    generation++;
    currentUserId = undefined;
    window.removeEventListener("online", onReconnect);
    navigator.serviceWorker?.removeEventListener("message", onWorkerChange);
    clearTimeout(timer);
    channel?.close();
    channel = undefined;
  };
}
export async function retryProduct(kind: Kind, id: string, userId: string) {
  await initializeDB();
  if (!navigator.locks && running) await running.catch(() => {});
  await withProductLock(() =>
    modifyFromStore<Change>(storeFor(kind), id, (current) =>
      current?.value.userId === userId &&
      current.value.status !== SyncStatus.Synced
        ? {
            ...current,
            value: {
              ...current.value,
              status: SyncStatus.Pending,
              attempts: 0,
              nextAttemptAt: 0,
              error: "",
            },
          }
        : current,
    ),
  );
  notifyProductChanges(kind);
  void requestProductBackgroundSync();
  await syncProducts(true, userId);
}
export async function discardProduct(kind: Kind, id: string, userId: string) {
  await initializeDB();
  if (!navigator.locks && running) await running.catch(() => {});
  await withProductLock(() =>
    modifyFromStore<Change>(storeFor(kind), id, (current) =>
      current?.value.userId === userId ? undefined : current,
    ),
  );
  notifyProductChanges(kind);
}
