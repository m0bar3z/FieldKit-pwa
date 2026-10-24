import { refreshAppBadge } from "@/lib/pwa/app-badge";
import { TASK_SYNC_CHANGED } from "./background-sync";
import { processTaskQueue } from "./engine";

export async function syncTasksInBackground(clients: Clients) {
  try {
    const pending = await processTaskQueue(true, async () => {
      const pages = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const page of pages) page.postMessage(TASK_SYNC_CHANGED);
    });
    if (pending) throw new Error("Tasks are still waiting to synchronize.");
  } finally {
    await refreshAppBadge();
  }
}
