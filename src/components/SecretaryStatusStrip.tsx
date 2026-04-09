"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, CloudOff, RefreshCw, WifiOff, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/lib/networkStatus";
import { useOfflineQueuedDates } from "@/lib/offlineQueue";
import { useSecretarySyncStatus } from "@/lib/syncManager";

function getOfflineMessage(pathname: string, pendingDateCount: number): string {
  if (pathname.startsWith("/dashboard/secretary/attendance")) {
    if (pendingDateCount > 0) {
      return `Offline. You can still record attendance here. ${pendingDateCount} session${pendingDateCount === 1 ? "" : "s"} will sync when connection returns.`;
    }

    return "Offline. You can still record attendance here and it will sync when connection returns.";
  }

  if (pathname.startsWith("/dashboard/secretary/history")) {
    if (pendingDateCount > 0) {
      return `Offline. Attendance records saved on this device are listed here. ${pendingDateCount} unsynced session${pendingDateCount === 1 ? "" : "s"} will sync when connection returns.`;
    }

    return "Offline. Attendance records saved on this device are listed here until connection returns.";
  }

  if (pendingDateCount > 0) {
    return `Offline. ${pendingDateCount} session${pendingDateCount === 1 ? "" : "s"} will sync when connection returns.`;
  }

  return "Offline. Some data may be limited until connection returns.";
}

export default function SecretaryStatusStrip() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { isOnline } = useNetworkStatus();
  const syncStatus = useSecretarySyncStatus(user?.uid);
  const queuedDatesState = useOfflineQueuedDates(user?.uid);
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);

  const pendingDateCount = queuedDatesState.dates.length;
  const hasQueueIssues = syncStatus.failedCount > 0 || syncStatus.needsReviewCount > 0;
  const hasPendingSync = pendingDateCount > 0;
  const showLastMessage = Boolean(syncStatus.lastMessage && dismissedMessage !== syncStatus.lastMessage);
  const offlineMessage = getOfflineMessage(pathname, pendingDateCount);

  if (!isOnline && hasPendingSync) {
    return (
      <div
        className="mt-2 flex items-center gap-2 rounded-xl border px-3 py-2"
        style={{ backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }}
      >
        <CloudOff className="h-3.5 w-3.5 shrink-0" style={{ color: "#92400E" }} />
        <p className="min-w-0 flex-1 text-[11px] font-medium leading-snug" style={{ color: "#92400E" }}>
          {offlineMessage}
        </p>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        className="mt-2 flex items-center gap-2 rounded-xl border px-3 py-2"
        style={{ backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }}
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0" style={{ color: "#92400E" }} />
        <p className="min-w-0 flex-1 text-[11px] font-medium leading-snug" style={{ color: "#92400E" }}>
          {offlineMessage}
        </p>
      </div>
    );
  }

  if (syncStatus.isSyncing) {
    return (
      <div
        className="mt-2 flex items-center gap-2 rounded-xl border px-3 py-2"
        style={{ backgroundColor: "#DBEAFE", borderColor: "#BFDBFE" }}
      >
        <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" style={{ color: "#1D4ED8" }} />
        <p className="min-w-0 flex-1 text-[11px] font-medium leading-snug" style={{ color: "#1D4ED8" }}>
          Syncing saved attendance...
        </p>
      </div>
    );
  }

  if (hasPendingSync || showLastMessage) {
    const tone = hasQueueIssues || hasPendingSync
      ? { bg: "#FEF3C7", border: "#FDE68A", text: "#92400E" }
      : { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" };
    const icon = hasQueueIssues || hasPendingSync
      ? <AlertCircle className="h-3.5 w-3.5 shrink-0" style={{ color: tone.text }} />
      : <RefreshCw className="h-3.5 w-3.5 shrink-0" style={{ color: tone.text }} />;
    const message = hasPendingSync
      ? `${pendingDateCount} session${pendingDateCount === 1 ? "" : "s"} saved locally. Tap sync when ready.`
      : syncStatus.lastMessage;

    return (
      <div
        className="mt-2 flex items-center gap-2 rounded-xl border px-3 py-2"
        style={{ backgroundColor: tone.bg, borderColor: tone.border }}
      >
        {icon}
        <p className="min-w-0 flex-1 text-[11px] font-medium leading-snug" style={{ color: tone.text }}>
          {message}
        </p>
        {(hasPendingSync || hasQueueIssues) && (
          <button
            type="button"
            onClick={() => void syncStatus.syncNow()}
            disabled={!isOnline || syncStatus.isSyncing}
            className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold disabled:opacity-60"
            style={{ backgroundColor: "#FFFFFF", color: tone.text }}
          >
            Sync
          </button>
        )}
        {showLastMessage && !hasPendingSync && (
          <button
            type="button"
            onClick={() => setDismissedMessage(syncStatus.lastMessage ?? null)}
            className="shrink-0 rounded-md p-1"
            style={{ color: tone.text }}
            aria-label="Dismiss sync message"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return null;
}
