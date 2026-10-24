/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";
import { NOTE_SYNC_TAG } from "@/lib/products/note-sync/background-sync";
import { syncNoteEditsInBackground } from "@/lib/products/note-sync/worker";
import { TASK_SYNC_TAG } from "@/lib/products/task-sync/background-sync";
import { syncTasksInBackground } from "@/lib/products/task-sync/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  disableDevLogs: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin &&
        ["/api/tasks", "/api/notes"].includes(url.pathname) &&
        !!url.searchParams.get("userId"),
      method: "GET",
      handler: new NetworkFirst({
        cacheName: "fieldkit-personal-data-v1",
        plugins: [
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            cacheWillUpdate: async ({ request, response }) =>
              response.status === 200 &&
              response.headers.get("X-FieldKit-User") ===
                new URL(request.url).searchParams.get("userId")
                ? response
                : null,
          },
        ],
      }),
    },
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("sync", (event) => {
  if (event.tag === NOTE_SYNC_TAG) {
    event.waitUntil(syncNoteEditsInBackground(self.clients));
  }
  if (event.tag === TASK_SYNC_TAG) {
    event.waitUntil(syncTasksInBackground(self.clients));
  }
});
