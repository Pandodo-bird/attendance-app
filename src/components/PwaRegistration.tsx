"use client";

import { SerwistProvider } from "@serwist/next/react";

export default function PwaRegistration() {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
      register
      reloadOnOnline={false}
    />
  );
}
