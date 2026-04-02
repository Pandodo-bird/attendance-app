"use client";

import { useEffect, useState } from "react";

import { replayQueuedAttendanceSubmission } from "@/lib/firestore";
import { getIsOnline } from "@/lib/networkStatus";
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
      this.setState({ isOnline: true, lastMessage: null });
      void this.syncNow("online");
    };
    const handleOffline = () => {
      this.setState({ isOnline: false, isSyncing: false });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        this.setState({ isOnline: getIsOnline() });
        void this.syncNow("resume");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

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
      unsubscribeQueue();
      await releaseSyncLease(this.uid, this.ownerId);
    };

    void this.syncNow("start");
  }

  stop = async (): Promise<void> => undefined;

  async refreshSummary(): Promise<void> {
    const summary = await getQueueSummary(this.uid);
    this.setState({
      pendingCount: summary.pending,
      syncingCount: summary.syncing,
      failedCount: summary.failed,
      needsReviewCount: summary.needsReview,
      isOnline: getIsOnline(),
    });
  }

  async syncNow(trigger: "manual" | "online" | "resume" | "interval" | "start"): Promise<void> {
    if (this.running || !getIsOnline()) {
      this.setState({ isOnline: getIsOnline() });
      return;
    }

    const hasLease = await acquireSyncLease(this.uid, this.ownerId);
    if (!hasLease) {
      await this.refreshSummary();
      return;
    }

    this.running = true;
    this.setState({ isOnline: true, isSyncing: true, lastMessage: trigger === "manual" ? "Syncing now..." : this.state.lastMessage });

    try {
      const pendingItems = await listPendingQueueItems(this.uid);

      for (const item of pendingItems) {
        await markQueueItemSyncing(item.operationId);

        try {
          const result = await replayQueuedAttendanceSubmission(item);

          if (result.outcome === "synced") {
            await markQueueItemSynced(item.operationId);
            await deleteAttendanceDraft(item.uid, item.attendanceId);
            console.log("📦 OFFLINE QUEUE | replay success", { operationId: item.operationId });
            this.setState({ lastMessage: result.message });
            continue;
          }

          if (result.outcome === "locked") {
            await markQueueItemFailed(item.operationId, "locked", result.message);
            this.setState({ lastMessage: result.message });
            continue;
          }

          await markQueueItemFailed(item.operationId, "conflict", result.message);
          this.setState({ lastMessage: result.message });
        } catch (error) {
          const classification = classifySyncError(error);
          await markQueueItemFailed(item.operationId, classification.failureCode, classification.message);
          console.log("📦 OFFLINE QUEUE | replay failure", {
            operationId: item.operationId,
            failureCode: classification.failureCode,
          });
          this.setState({ lastMessage: classification.message });

          if (classification.failureCode === "failed_auth" || classification.failureCode === "failed_permission") {
            break;
          }
        }
      }
    } finally {
      this.running = false;
      this.setState({ isSyncing: false, isOnline: getIsOnline() });
      await releaseSyncLease(this.uid, this.ownerId);
      await this.refreshSummary();
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
