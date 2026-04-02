import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [
    {
      url: "/~offline",
      revision: "secretary-offline-v2",
    },
    {
      url: "/dashboard/secretary",
      revision: "secretary-offline-v2",
    },
    {
      url: "/dashboard/secretary/dashboard",
      revision: "secretary-offline-v2",
    },
    {
      url: "/dashboard/secretary/attendance",
      revision: "secretary-offline-v2",
    },
    {
      url: "/dashboard/secretary/history",
      revision: "secretary-offline-v2",
    },
  ],
  cacheOnNavigation: true,
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: false,
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
};

export default withSerwist(nextConfig);
