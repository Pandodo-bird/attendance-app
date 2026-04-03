"use client";

import SecretarySidebar from "@/components/SecretarySidebar";
import { useAuth } from "@/contexts/AuthContext";
import { getSecretaryAppointments, getSectionById, getSectionStudents } from "@/lib/firestore";
import { useOfflineQueuedDates } from "@/lib/offlineQueue";
import { mergeSecretaryBootstrapCache } from "@/lib/secretaryOfflineBootstrap";
import { useNetworkStatus } from "@/lib/networkStatus";
import { useSecretarySyncStatus } from "@/lib/syncManager";
import { AlertCircle, CalendarDays, Menu, RefreshCw, Wifi, WifiOff, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface SecretaryLayoutProps {
  children: ReactNode;
}

export default function SecretaryLayout({ children }: SecretaryLayoutProps) {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  const { isOnline } = useNetworkStatus();
  const syncStatus = useSecretarySyncStatus(user?.uid);
  const queuedDatesState = useOfflineQueuedDates(user?.uid);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const frame = window.requestAnimationFrame(() => {
      setIsSidebarOpen(mediaQuery.matches);
    });

    const handleChange = (event: MediaQueryListEvent) => {
      setIsSidebarOpen(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!user?.uid || !isOnline) {
      return;
    }

    let cancelled = false;

    const prefetchSecretaryBootstrap = async () => {
      try {
        const appointments = await getSecretaryAppointments(user.uid);
        if (cancelled || appointments.length === 0) {
          return;
        }

        const sectionEntries = await Promise.all(
          appointments.map(async (appointment) => {
            const [section, students] = await Promise.all([
              getSectionById(appointment.sectionId),
              getSectionStudents(appointment.sectionId),
            ]);

            return {
              appointment,
              section,
              students,
            };
          })
        );

        if (cancelled) {
          return;
        }

        mergeSecretaryBootstrapCache(user.uid, {
          appointments,
          sectionsById: Object.fromEntries(
            sectionEntries
              .filter((entry) => entry.section)
              .map((entry) => [entry.appointment.sectionId, entry.section!])
          ),
          studentsBySectionId: Object.fromEntries(
            sectionEntries.map((entry) => [entry.appointment.sectionId, entry.students])
          ),
        });
      } catch (error) {
        console.error("Error prefetching secretary offline bootstrap:", error);
      }
    };

    void prefetchSecretaryBootstrap();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void prefetchSecretaryBootstrap();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOnline, user?.uid]);

  const hasQueueIssues = syncStatus.failedCount > 0 || syncStatus.needsReviewCount > 0;
  const pendingDateCount = queuedDatesState.dates.length;
  const showStatusBanner = !isOnline || syncStatus.isSyncing || hasQueueIssues;
  const statusLabel = syncStatus.isSyncing
    ? "Syncing"
    : !isOnline
      ? "Offline"
      : hasQueueIssues
        ? "Sync error"
        : syncStatus.pendingCount > 0
          ? "Pending sync"
          : "Online";

  const statusColor = syncStatus.isSyncing
    ? { bg: "#EEF2FF", border: "#C7D2FE", text: "#3730A3" }
    : !isOnline
      ? { bg: "#FEF3C7", border: "#FDE68A", text: "#92400E" }
      : hasQueueIssues
        ? { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" }
        : syncStatus.pendingCount > 0
          ? { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" }
          : { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" };

  const queueSummaryText = syncStatus.needsReviewCount > 0
    ? `${syncStatus.needsReviewCount} session${syncStatus.needsReviewCount > 1 ? "s" : ""} need review`
    : syncStatus.failedCount > 0
      ? `${syncStatus.failedCount} failed sync${syncStatus.failedCount > 1 ? "s" : ""}`
      : !isOnline && pendingDateCount > 0
        ? `${pendingDateCount} locally saved date${pendingDateCount > 1 ? "s" : ""}. Teachers cannot see them until sync finishes.`
      : syncStatus.pendingCount > 0
        ? `${syncStatus.pendingCount} pending sync${syncStatus.pendingCount > 1 ? "s" : ""}`
        : "All secretary attendance is up to date";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F3FA" }}>
      <div className="flex min-h-screen">
        <SecretarySidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main
          className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${
            isSidebarOpen ? "lg:ml-64" : "lg:ml-0"
          }`}
        >
          <button
            type="button"
            className="fixed top-4 right-4 z-[60] p-2.5 rounded-lg shadow-md"
            style={{ backgroundColor: "#1e3a5f", color: "#FFFFFF" }}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="px-3 sm:px-4 lg:px-8 pt-16 lg:pt-4 pb-4">
            {showStatusBanner && (
              <div
                className="mb-4 rounded-2xl border px-4 py-3"
                style={{ backgroundColor: statusColor.bg, borderColor: statusColor.border }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#FFFFFF", color: statusColor.text }}
                  >
                    {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: statusColor.text }}>
                      {statusLabel}
                    </p>
                    <p className="text-xs" style={{ color: statusColor.text }}>
                      {queueSummaryText}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {pendingDateCount > 0 && (
              <div
                className="mb-4 rounded-2xl border px-4 py-3"
                style={{ backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#FFFFFF", color: "#92400E" }}
                    >
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#92400E" }}>
                        Locally saved attendance
                      </p>
                      <p className="text-xs mt-1" style={{ color: "#A16207" }}>
                        All attendance recorded while offline can be viewed in History. They will sync automatically when a connection is available.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void syncStatus.syncNow()}
                      disabled={!isOnline || syncStatus.isSyncing}
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#FFFFFF", color: "#92400E" }}
                    >
                      <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? "animate-spin" : ""}`} />
                      Sync now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {syncStatus.lastMessage && dismissedMessage !== syncStatus.lastMessage && (
              <div
                className="mb-4 rounded-2xl border px-4 py-3"
                style={{
                  backgroundColor: hasQueueIssues ? "#FEF2F2" : "#ECFDF5",
                  borderColor: hasQueueIssues ? "#FECACA" : "#A7F3D0",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: "#FFFFFF",
                      color: hasQueueIssues ? "#991B1B" : "#065F46",
                    }}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: hasQueueIssues ? "#991B1B" : "#065F46" }}>
                      {hasQueueIssues ? "Sync needs attention" : "Sync complete"}
                    </p>
                    <p className="text-xs mt-1" style={{ color: hasQueueIssues ? "#B91C1C" : "#047857" }}>
                      {syncStatus.lastMessage}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedMessage(syncStatus.lastMessage)}
                    className="p-1.5 rounded-lg shrink-0"
                    style={{ backgroundColor: hasQueueIssues ? "#FEE2E2" : "#D1FAE5", color: hasQueueIssues ? "#991B1B" : "#065F46" }}
                    aria-label="Dismiss sync update"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="pb-16 lg:pb-4">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
