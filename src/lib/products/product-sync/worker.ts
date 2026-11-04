import { refreshAppBadge } from "@/lib/pwa/app-badge";
import { PRODUCT_SYNC_CHANGED } from "./background-sync";
import { processProductQueue } from "./engine";

export async function syncProductsInBackground(clients: Clients) {
  try {
    const pending = await processProductQueue(true, async () => {
      const pages = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const page of pages) page.postMessage(PRODUCT_SYNC_CHANGED);
    });
    if (pending)
      throw new Error("Saved changes are still waiting to synchronize.");
  } finally {
    await refreshAppBadge();
  }
}
