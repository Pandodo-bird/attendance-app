import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import { APP_VERSION } from "./src/lib/appVersion";

const secretaryOfflineRevision = `secretary-offline-${APP_VERSION}`;

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [
    {
      url: "/~offline",
      revision: secretaryOfflineRevision,
    },
    {
      url: "/dashboard/secretary",
      revision: secretaryOfflineRevision,
    },
    {
      url: "/dashboard/secretary/dashboard",
      revision: secretaryOfflineRevision,
    },
    {
      url: "/dashboard/secretary/attendance",
      revision: secretaryOfflineRevision,
    },
    {
      url: "/dashboard/secretary/history",
      revision: secretaryOfflineRevision,
    },
    {
      url: "/dashboard/secretary/profile",
      revision: secretaryOfflineRevision,
    },
  ],
  cacheOnNavigation: true,
  disable: process.env.NODE_ENV === "development",
  register: false,
  reloadOnOnline: false,
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
};

export default withSerwist(nextConfig);
