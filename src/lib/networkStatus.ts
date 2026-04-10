"use client";

import { useEffect, useState } from "react";

const NETWORK_PROBE_URL = "/api/network-status";
const NETWORK_PROBE_TIMEOUT_MS = 4000;
const NETWORK_RECHECK_INTERVAL_MS = 15000;
const NETWORK_STATUS_STORAGE_KEY = "schoolsync:last-known-online-status";
const listeners = new Set<(isOnline: boolean) => void>();

let lastKnownIsOnline = true;

function readPersistedOnlineStatus(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(NETWORK_STATUS_STORAGE_KEY);
  if (storedValue === "true") {
    return true;
  }
  if (storedValue === "false") {
    return false;
  }

  return null;
}

function writePersistedOnlineStatus(isOnline: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(NETWORK_STATUS_STORAGE_KEY, String(isOnline));
}

function getBrowserReportedOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

function setLastKnownIsOnline(nextIsOnline: boolean): void {
  lastKnownIsOnline = nextIsOnline;
  writePersistedOnlineStatus(nextIsOnline);
  listeners.forEach((listener) => listener(nextIsOnline));
}

async function probeNetwork(): Promise<boolean> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true;
  }

  if (!getBrowserReportedOnline()) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), NETWORK_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${NETWORK_PROBE_URL}?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    // Desktop PWAs can keep navigator.onLine=true after connectivity drops.
    // A failed probe should still flip the app into offline mode so status UI is accurate.
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getIsOnline(): boolean {
  if (typeof window === "undefined") {
    return lastKnownIsOnline;
  }

  const persistedStatus = readPersistedOnlineStatus();
  if (persistedStatus !== null) {
    lastKnownIsOnline = persistedStatus;
  }

  return lastKnownIsOnline && getBrowserReportedOnline();
}

export async function refreshNetworkStatus(): Promise<boolean> {
  const nextIsOnline = await probeNetwork();
  setLastKnownIsOnline(nextIsOnline);
  return nextIsOnline;
}

export function subscribeToNetworkStatus(listener: (isOnline: boolean) => void): () => void {
  listeners.add(listener);
  listener(lastKnownIsOnline);

  return () => {
    listeners.delete(listener);
  };
}

export function useNetworkStatus(): { isOnline: boolean; hasResolved: boolean } {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [hasResolved, setHasResolved] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const refreshOnlineState = async () => {
      const nextIsOnline = await refreshNetworkStatus();
      if (!cancelled) {
        setIsOnline(nextIsOnline);
        setHasResolved(true);
      }
    };

    const handleOnline = () => {
      void refreshOnlineState();
    };
    const handleOffline = () => {
      setLastKnownIsOnline(false);
      setIsOnline(false);
      setHasResolved(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshOnlineState();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const unsubscribe = subscribeToNetworkStatus((nextIsOnline) => {
      if (!cancelled) {
        setIsOnline(nextIsOnline);
      }
    });

    void refreshOnlineState();
    const intervalId = window.setInterval(() => {
      void refreshOnlineState();
    }, NETWORK_RECHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
      unsubscribe();
    };
  }, []);

  return { isOnline, hasResolved };
}
