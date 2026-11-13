/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";
import {
  LEGACY_SYNC_TAGS,
  PRODUCT_PERIODIC_SYNC_TAG,
  PRODUCT_SYNC_TAG,
} from "@/lib/products/product-sync/background-sync";
import { syncProductsInBackground } from "@/lib/products/product-sync/worker";
import {
  displayTaskReminder,
  openTaskReminder,
  recordPushAccount,
} from "@/lib/push/worker";

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
  if (event.tag === PRODUCT_SYNC_TAG || LEGACY_SYNC_TAGS.includes(event.tag)) {
    event.waitUntil(syncProductsInBackground(self.clients));
  }
});

self.addEventListener("periodicsync", (event: Event) => {
  const periodicEvent = event as ExtendableEvent & { tag: string };
  if (periodicEvent.tag === PRODUCT_PERIODIC_SYNC_TAG)
    periodicEvent.waitUntil(syncProductsInBackground(self.clients));
});

self.addEventListener("push", (event) => {
  let payload: unknown;
  try {
    payload = event.data?.json();
  } catch {
    return;
  }
  event.waitUntil(displayTaskReminder(self, payload));
});
self.addEventListener("notificationclick", (event) => {
  if (!event.notification.tag.startsWith("fieldkit-task:")) return;
  event.notification.close();
  event.waitUntil(openTaskReminder(self, event.notification.data));
});
self.addEventListener("message", (event) => {
  const data = event.data;
  if (
    data?.type !== "fieldkit-push-account" ||
    !(data.userId === null || typeof data.userId === "string") ||
    !event.source ||
    !("url" in event.source) ||
    new URL(event.source.url).origin !== self.location.origin
  )
    return;
  event.waitUntil(recordPushAccount(self, data.userId));
});
