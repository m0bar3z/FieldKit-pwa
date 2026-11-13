import { hasPending } from "./storage";

export const PRODUCT_SYNC_TAG = "fieldkit-products";
export const PRODUCT_PERIODIC_SYNC_TAG = "fieldkit-products-periodic";
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

type PeriodicSyncRegistration = {
  periodicSync?: {
    register: (tag: string, options?: { minInterval: number }) => Promise<void>;
  };
};

export async function requestProductPeriodicSync() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = (await navigator.serviceWorker
      .ready) as ServiceWorkerRegistration & PeriodicSyncRegistration;
    if (registration.periodicSync)
      await registration.periodicSync.register(PRODUCT_PERIODIC_SYNC_TAG, {
        // Browsers may choose a longer interval; this is a minimum hint.
        minInterval: 12 * 60 * 60 * 1000,
      });
  } catch (error) {
    // Periodic Background Sync is optional and permission-controlled.
    console.warn(
      "Periodic background sync unavailable; using normal sync.",
      error,
    );
  }
}
