"use client";

import { useEffect, useState } from "react";

import { replayQueuedAttendanceSubmission } from "@/lib/firestore";
import { getIsOnline, refreshNetworkStatus, subscribeToNetworkStatus } from "@/lib/networkStatus";
import {
  acquireSyncLease,
  deleteAttendanceDraft,
  getQueueSummary,
  listPendingQueueItems,
  markQueueItemFailed,
  markQueueItemSynced,
  markQueueItemSyncing,
  releaseSyncLease,
  subscribeToOfflineQueueChanges,
  type OfflineQueueFailureCode,
} from "@/lib/offlineQueue";

const RETRY_INTERVAL_MS = 30 * 1000;

interface SyncStatusSnapshot {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  needsReviewCount: number;
  lastMessage: string | null;
}

interface SyncRunSummary {
  synced: number;
  skippedLocked: string[];
  needsReview: number;
  failed: number;
}

type SyncListener = (state: SyncStatusSnapshot) => void;

function createOwnerId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function classifySyncError(error: unknown): {
  failureCode: OfflineQueueFailureCode;
  message: string;
} {
  const errorMessage = error instanceof Error ? error.message : "Unknown sync failure.";
  const errorCode = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: string }).code)
    : "";

  if (errorCode.includes("unauth") || errorCode.includes("auth") || errorMessage.toLowerCase().includes("auth")) {
    return { failureCode: "failed_auth", message: "Authentication expired. Sign in again to resume sync." };
  }

  if (errorCode.includes("permission") || errorMessage.toLowerCase().includes("permission")) {
    return { failureCode: "failed_permission", message: "You no longer have permission to sync this attendance." };
  }

  if (errorMessage.toLowerCase().includes("locked")) {
    return { failureCode: "locked", message: errorMessage };
  }

  if (errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("invalid")) {
    return { failureCode: "validation", message: errorMessage };
  }

  return { failureCode: "transient", message: errorMessage };
}

function formatSyncRunMessage(summary: SyncRunSummary): string | null {
  const parts: string[] = [];

  if (summary.synced > 0) {
    parts.push(`Synced ${summary.synced} date${summary.synced > 1 ? "s" : ""}.`);
  }

  if (summary.skippedLocked.length === 1) {
    parts.push(`${summary.skippedLocked[0]} was not synced because the teacher already recorded attendance for that day.`);
  } else if (summary.skippedLocked.length > 1) {
    parts.push(`${summary.skippedLocked.length} date${summary.skippedLocked.length > 1 ? "s were" : " was"} skipped because the teacher already recorded attendance.`);
  }

  if (summary.needsReview > 0) {
    parts.push(`${summary.needsReview} date${summary.needsReview > 1 ? "s need" : " needs"} review.`);
  }

  if (summary.failed > 0) {
    parts.push(`${summary.failed} date${summary.failed > 1 ? "s failed" : " failed"} and will retry later.`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function formatShortDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

class SecretarySyncController {
  private readonly uid: string;
  private readonly ownerId = createOwnerId();
  private readonly listeners = new Set<SyncListener>();
  private intervalId: number | null = null;
  private started = false;
  private running = false;
  private state: SyncStatusSnapshot = {
    isOnline: getIsOnline(),
    isSyncing: false,
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    needsReviewCount: 0,
    lastMessage: null,
  };

  constructor(uid: string) {
    this.uid = uid;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    void this.refreshSummary();

    const handleOnline = () => {
      void this.handleNetworkRefresh("online");
    };
    const handleOffline = () => {
      this.setState({ isOnline: false, isSyncing: false });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void this.handleNetworkRefresh("resume");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const unsubscribeNetwork = subscribeToNetworkStatus((isOnline) => {
      this.setState({ isOnline });
    });

    this.intervalId = window.setInterval(() => {
      void this.syncNow("interval");
    }, RETRY_INTERVAL_MS);

    const unsubscribeQueue = subscribeToOfflineQueueChanges((changedUid) => {
      if (!changedUid || changedUid === this.uid) {
        void this.refreshSummary();
      }
    });

    this.stop = async () => {
      if (!this.started) {
        return;
      }

      this.started = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (this.intervalId !== null) {
        window.clearInterval(this.intervalId);
        this.intervalId = null;
      }
      unsubscribeNetwork();
      unsubscribeQueue();
      await releaseSyncLease(this.uid, this.ownerId);
    };

    void this.handleNetworkRefresh("start");
  }

  stop = async (): Promise<void> => undefined;

  async refreshSummary(): Promise<void> {
    const isOnline = await refreshNetworkStatus();
    const summary = await getQueueSummary(this.uid);
    this.setState({
      pendingCount: summary.pending,
      syncingCount: summary.syncing,
      failedCount: summary.failed,
      needsReviewCount: summary.needsReview,
      isOnline,
    });
  }

  async syncNow(trigger: "manual" | "online" | "resume" | "interval" | "start"): Promise<void> {
    const isOnline = await refreshNetworkStatus();
    if (this.running || !isOnline) {
      this.setState({ isOnline });
      return;
    }

    const hasLease = await acquireSyncLease(this.uid, this.ownerId);
    if (!hasLease) {
      await this.refreshSummary();
      return;
    }

    this.running = true;
    this.setState({ isOnline: true, isSyncing: true, lastMessage: trigger === "manual" ? null : this.state.lastMessage });

    try {
      const pendingItems = await listPendingQueueItems(this.uid);
      const summary: SyncRunSummary = {
        synced: 0,
        skippedLocked: [],
        needsReview: 0,
        failed: 0,
      };

      for (const item of pendingItems) {
        await markQueueItemSyncing(item.operationId);

        try {
          const result = await replayQueuedAttendanceSubmission(item);

          if (result.outcome === "synced") {
            await markQueueItemSynced(item.operationId);
            await deleteAttendanceDraft(item.uid, item.attendanceId);
            console.log("📦 OFFLINE QUEUE | replay success", { operationId: item.operationId });
            summary.synced += 1;
            continue;
          }

          if (result.outcome === "locked") {
            await markQueueItemFailed(item.operationId, "locked", result.message);
            summary.skippedLocked.push(formatShortDate(item.date));
            continue;
          }

          await markQueueItemFailed(item.operationId, "conflict", result.message);
          summary.needsReview += 1;
        } catch (error) {
          const classification = classifySyncError(error);
          await markQueueItemFailed(item.operationId, classification.failureCode, classification.message);
          console.log("📦 OFFLINE QUEUE | replay failure", {
            operationId: item.operationId,
            failureCode: classification.failureCode,
          });
          if (classification.failureCode === "locked") {
            summary.skippedLocked.push(formatShortDate(item.date));
          } else if (classification.failureCode === "failed_auth" || classification.failureCode === "failed_permission") {
            this.setState({ lastMessage: classification.message });
          } else if (classification.failureCode === "validation") {
            summary.needsReview += 1;
          } else {
            summary.failed += 1;
          }

          if (classification.failureCode === "failed_auth" || classification.failureCode === "failed_permission") {
            break;
          }
        }
      }

      const nextMessage = formatSyncRunMessage(summary);
      if (nextMessage) {
        this.setState({ lastMessage: nextMessage });
      }
    } finally {
      this.running = false;
      this.setState({ isSyncing: false, isOnline: await refreshNetworkStatus() });
      await releaseSyncLease(this.uid, this.ownerId);
      await this.refreshSummary();
    }
  }

  private async handleNetworkRefresh(trigger: "online" | "resume" | "start"): Promise<void> {
    const isOnline = await refreshNetworkStatus();
    this.setState({ isOnline, lastMessage: null });
    if (isOnline) {
      await this.syncNow(trigger);
    }
  }

  private setState(partial: Partial<SyncStatusSnapshot>): void {
    this.state = {
      ...this.state,
      ...partial,
    };

    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

const controllers = new Map<string, SecretarySyncController>();

function getController(uid: string): SecretarySyncController {
  const existing = controllers.get(uid);
  if (existing) {
    return existing;
  }

  const controller = new SecretarySyncController(uid);
  controllers.set(uid, controller);
  return controller;
}

export async function syncSecretaryQueueNow(uid: string): Promise<void> {
  const controller = getController(uid);
  controller.start();
  await controller.syncNow("manual");
}

export async function stopSecretarySync(uid: string): Promise<void> {
  const controller = controllers.get(uid);
  if (!controller) {
    return;
  }

  await controller.stop();
  controllers.delete(uid);
}

export function useSecretarySyncStatus(uid?: string): SyncStatusSnapshot & {
  syncNow: () => Promise<void>;
} {
  const idleState: SyncStatusSnapshot = {
    isOnline: getIsOnline(),
    isSyncing: false,
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    needsReviewCount: 0,
    lastMessage: null,
  };
  const [state, setState] = useState<SyncStatusSnapshot>({
    ...idleState,
  });

  useEffect(() => {
    if (!uid) {
      return;
    }

    const controller = getController(uid);
    controller.start();
    const unsubscribe = controller.subscribe(setState);

    return () => {
      unsubscribe();
    };
  }, [uid]);

  return {
    ...(uid ? state : idleState),
    syncNow: async () => {
      if (!uid) {
        return;
      }

      await syncSecretaryQueueNow(uid);
    },
  };
}
