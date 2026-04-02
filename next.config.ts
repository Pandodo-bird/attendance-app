import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [
    {
      url: "/~offline",
      revision: "secretary-offline-v1",
    },
  ],
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
