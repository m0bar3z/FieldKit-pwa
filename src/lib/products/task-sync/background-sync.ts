import { hasPendingTaskChanges } from "./storage";

export const TASK_SYNC_TAG = "fieldkit-task-changes";
export const TASK_SYNC_CHANGED = "fieldkit-task-changes-synced";

export async function requestTaskBackgroundSync() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if ("sync" in registration && (await hasPendingTaskChanges()))
      await registration.sync.register(TASK_SYNC_TAG);
  } catch (error) {
    console.warn(
      "Background sync unavailable; using app synchronization.",
      error,
    );
  }
}
