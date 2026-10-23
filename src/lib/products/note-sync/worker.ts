import { refreshAppBadge } from "@/lib/pwa/app-badge";
import { NOTE_SYNC_CHANGED } from "./background-sync";
import { processNoteSyncQueue } from "./engine";

export async function syncNoteEditsInBackground(clients: Clients) {
  let pending: boolean;
  try {
    pending = await processNoteSyncQueue(true, async () => {
      const pages = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const page of pages) page.postMessage(NOTE_SYNC_CHANGED);
    });
  } finally {
    await refreshAppBadge();
  }

  if (pending) throw new Error("Note edits are still waiting to synchronize.");
}
