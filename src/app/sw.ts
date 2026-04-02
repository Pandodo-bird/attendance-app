/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const secretaryDocumentPaths = new Set([
  "/dashboard/secretary/dashboard",
  "/dashboard/secretary/attendance",
  "/dashboard/secretary/history",
]);

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) => {
        return request.destination === "document" && secretaryDocumentPaths.has(url.pathname);
      },
      handler: new NetworkFirst({
        cacheName: "secretary-route-documents",
        networkTimeoutSeconds: 5,
      }),
    },
    {
      matcher: ({ request, url }) => {
        return request.method === "GET" && (
          url.pathname.startsWith("/_next/static/") ||
          url.pathname.startsWith("/icons/") ||
          url.pathname === "/manifest.webmanifest"
        );
      },
      handler: new CacheFirst({
        cacheName: "secretary-app-shell",
      }),
    },
  ],
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
