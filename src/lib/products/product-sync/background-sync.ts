import { hasPending } from "./storage";

export const PRODUCT_SYNC_TAG = "fieldkit-products";
export const PRODUCT_SYNC_CHANGED = "fieldkit-products-changed";
export const LEGACY_SYNC_TAGS = [
  "fieldkit-task-changes",
  "fieldkit-note-edits",
];
export const LEGACY_SYNC_MESSAGES = [
  "fieldkit-task-changes-synced",
  "fieldkit-note-edits-changed",
];
export async function requestProductBackgroundSync() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if ("sync" in registration && (await hasPending()))
      await registration.sync.register(PRODUCT_SYNC_TAG);
  } catch (error) {
    console.warn(
      "Background sync unavailable; using app synchronization.",
      error,
    );
  }
}
