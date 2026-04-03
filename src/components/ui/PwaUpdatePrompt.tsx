"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCcw, X } from "lucide-react";

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

export default function PwaUpdatePrompt() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const refreshingRef = useRef(false);
  const applyTimeoutRef = useRef<number | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

  const clearApplyTimeout = (): void => {
    if (applyTimeoutRef.current !== null) {
      window.clearTimeout(applyTimeoutRef.current);
      applyTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let mounted = true;

    const handleWorkerStateChange = (worker: ServiceWorker): void => {
      if (worker.state === "activating" || worker.state === "activated") {
        clearApplyTimeout();
        setShowPrompt(false);
      }
    };

    const showWaitingWorker = (registration: ServiceWorkerRegistration): void => {
      if (!mounted || !registration.waiting) {
        return;
      }

      registrationRef.current = registration;
      setIsApplyingUpdate(false);
      setShowPrompt(true);
      registration.waiting.addEventListener("statechange", () => {
        handleWorkerStateChange(registration.waiting as ServiceWorker);
      });
    };

    const attachUpdateListener = (registration: ServiceWorkerRegistration): void => {
      registrationRef.current = registration;

      if (registration.waiting) {
        showWaitingWorker(registration);
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            showWaitingWorker(registration);
          }
        });
      });
    };

    const checkForUpdates = async (): Promise<void> => {
      if (!navigator.onLine) {
        return;
      }

      try {
        const registration = registrationRef.current ?? await navigator.serviceWorker.getRegistration("/");
        if (!registration) {
          return;
        }

        registrationRef.current = registration;
        await registration.update();

        if (registration.waiting) {
          showWaitingWorker(registration);
        }
      } catch (error) {
        console.error("Error checking for app updates:", error);
      }
    };

    const registerServiceWorker = async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        if (!mounted) {
          return;
        }

        attachUpdateListener(registration);
        await checkForUpdates();
      } catch (error) {
        console.error("Error registering service worker:", error);
      }
    };

    const handleControllerChange = (): void => {
      if (refreshingRef.current) {
        return;
      }

      clearApplyTimeout();
      setShowPrompt(false);
      refreshingRef.current = true;
      window.location.reload();
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        void checkForUpdates();
      }
    };

    const handleWindowFocus = (): void => {
      void checkForUpdates();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    const intervalId = window.setInterval(() => {
      void checkForUpdates();
    }, UPDATE_CHECK_INTERVAL_MS);

    void registerServiceWorker();

    return () => {
      mounted = false;
      clearApplyTimeout();
      window.clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  const handleDismiss = (): void => {
    if (isApplyingUpdate) {
      return;
    }

    setShowPrompt(false);
  };

  const handleApplyUpdate = (): void => {
    const waitingWorker = registrationRef.current?.waiting;
    if (!waitingWorker) {
      setShowPrompt(false);
      return;
    }

    setIsApplyingUpdate(true);
    setShowPrompt(false);
    waitingWorker.addEventListener("statechange", () => {
      if (waitingWorker.state === "activating" || waitingWorker.state === "activated") {
        clearApplyTimeout();
        setShowPrompt(false);
      }
    });
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    applyTimeoutRef.current = window.setTimeout(() => {
      if (!refreshingRef.current) {
        window.location.reload();
      }
    }, 2500);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[120] sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md">
      <div
        className="relative overflow-hidden rounded-2xl border shadow-[0_10px_30px_rgba(15,23,42,0.16)]"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" }}
      >
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8" }}
          >
            {isApplyingUpdate ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          </div>

          <div className="min-w-0 flex-1 pr-8">
            <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
              Update Available
            </p>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: "#475569" }}>
              A newer version of the app is ready. Updating will refresh the app and load the latest files.
            </p>
          </div>

          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg p-1.5"
            style={{ backgroundColor: "#F8FAFC", color: "#475569" }}
            onClick={handleDismiss}
            aria-label="Dismiss update prompt"
            disabled={isApplyingUpdate}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3 sm:px-5" style={{ borderColor: "#E2E8F0" }}>
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-xs font-semibold sm:text-sm"
            style={{ backgroundColor: "#F8FAFC", color: "#334155" }}
            onClick={handleDismiss}
            disabled={isApplyingUpdate}
          >
            Later
          </button>
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-xs font-semibold text-white sm:text-sm"
            style={{ backgroundColor: isApplyingUpdate ? "#94A3B8" : "#1D4ED8" }}
            onClick={handleApplyUpdate}
            disabled={isApplyingUpdate}
          >
            {isApplyingUpdate ? "Updating..." : "Update now"}
          </button>
        </div>
      </div>
    </div>
  );
}
