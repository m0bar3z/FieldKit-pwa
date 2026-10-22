import { NOTE_SYNC_CHANGED } from "./background-sync";
import { processNoteSyncQueue } from "./engine";

export async function syncNoteEditsInBackground(clients: Clients) {
  const pending = await processNoteSyncQueue(true, async () => {
    const pages = await clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    for (const page of pages) page.postMessage(NOTE_SYNC_CHANGED);
  });

  if (pending) throw new Error("Note edits are still waiting to synchronize.");
}
