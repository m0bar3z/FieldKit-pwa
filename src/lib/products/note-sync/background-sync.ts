import { hasPendingNoteEdits } from "./storage";

export const NOTE_SYNC_TAG = "fieldkit-note-edits";
export const NOTE_SYNC_CHANGED = "fieldkit-note-edits-changed";

export async function requestNoteBackgroundSync() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!("sync" in registration) || !(await hasPendingNoteEdits())) return;

    await registration.sync.register(NOTE_SYNC_TAG);
  } catch (error) {
    console.warn(
      "Background sync unavailable; using app synchronization.",
      error,
    );
  }
}
