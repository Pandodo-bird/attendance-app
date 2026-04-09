import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { useEffect, useState } from "react";

import type { Attendance, AttendanceStatus } from "@/lib/firestore";

export const DATABASE_NAME = "attendance-offline-sync";
export const DATABASE_VERSION = 2;
const MAX_QUEUE_STORAGE_BYTES = 50 * 1024 * 1024;
const SYNC_LEASE_TTL_MS = 30 * 1000;
const STALE_SYNCING_THRESHOLD_MS = SYNC_LEASE_TTL_MS * 2;
const QUEUE_EVENT_NAME = "attendance-offline-queue-changed";

export type OfflineQueueItemStatus = "pending" | "syncing" | "synced" | "failed" | "needs_review";
export type OfflineQueueFailureCode =
  | "transient"
  | "failed_auth"
  | "failed_permission"
  | "validation"
  | "locked"
  | "conflict"
  | "storage_cap";

export interface OfflineAttendanceStudentPayload {
  lrn: string;
  studentName: string;
  lastName: string;
  status: AttendanceStatus;
}

export interface OfflineAttendanceDraftStudentPayload {
  lrn: string;
  studentName: string;
  lastName: string;
  status: AttendanceStatus | null;
}

export interface OfflineAttendanceDraft {
  key: string;
  uid: string;
  attendanceId: string;
  sectionId: string;
  sectionSlug: string;
  date: string;
  schoolYear: string;
  teacherId: string;
  secretaryUid: string;
  students: OfflineAttendanceDraftStudentPayload[];
  hasSessionStarted: boolean;
  lastKnownRemoteChangeAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface OfflineAttendanceQueueItem {
  operationId: string;
  uid: string;
  attendanceId: string;
  sectionId: string;
  sectionSlug: string;
  date: string;
  schoolYear: string;
  teacherId: string;
  secretaryUid: string;
  sessionKey: string;
  students: OfflineAttendanceStudentPayload[];
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  lastError: string | null;
  lastKnownRemoteChangeAt: number | null;
  status: OfflineQueueItemStatus;
  failureCode: OfflineQueueFailureCode | null;
  syncedAt: number | null;
}

interface SyncLeaseRecord {
  key: string;
  ownerId: string;
  expiresAt: number;
}

interface QueueMetaRecord {
  key: string;
  value: string;
}

export interface SecretaryHistoryCacheRecord {
  uid: string;
  schoolYear: string;
  sessions: Attendance[];
  updatedAt: number;
}

export interface OfflineQueueDatabase extends DBSchema {
  queue: {
    key: string;
    value: OfflineAttendanceQueueItem;
    indexes: {
      "by-uid": string;
      "by-uid-status": [string, OfflineQueueItemStatus];
      "by-uid-updatedAt": [string, number];
      "by-uid-syncedAt": [string, number];
      "by-uid-session-createdAt": [string, string, number];
    };
  };
  drafts: {
    key: string;
    value: OfflineAttendanceDraft;
    indexes: {
      "by-uid": string;
      "by-uid-updatedAt": [string, number];
    };
  };
  syncLeases: {
    key: string;
    value: SyncLeaseRecord;
  };
  meta: {
    key: string;
    value: QueueMetaRecord;
  };
  historyBootstrap: {
    key: string;
    value: SecretaryHistoryCacheRecord;
  };
}

export class OfflineStorageCapError extends Error {
  constructor() {
    super("Offline attendance storage is full. Reconnect and sync before saving more changes.");
    this.name = "OfflineStorageCapError";
  }
}

export function getOfflineDb(): Promise<IDBPDatabase<OfflineQueueDatabase>> {
  return openDB<OfflineQueueDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("queue")) {
        const queueStore = database.createObjectStore("queue", { keyPath: "operationId" });
        queueStore.createIndex("by-uid", "uid");
        queueStore.createIndex("by-uid-status", ["uid", "status"]);
        queueStore.createIndex("by-uid-updatedAt", ["uid", "updatedAt"]);
        queueStore.createIndex("by-uid-syncedAt", ["uid", "syncedAt"]);
        queueStore.createIndex("by-uid-session-createdAt", ["uid", "sessionKey", "createdAt"]);
      }

      if (!database.objectStoreNames.contains("drafts")) {
        const draftStore = database.createObjectStore("drafts", { keyPath: "key" });
        draftStore.createIndex("by-uid", "uid");
        draftStore.createIndex("by-uid-updatedAt", ["uid", "updatedAt"]);
      }

      if (!database.objectStoreNames.contains("syncLeases")) {
        database.createObjectStore("syncLeases", { keyPath: "key" });
      }

      if (!database.objectStoreNames.contains("meta")) {
        database.createObjectStore("meta", { keyPath: "key" });
      }

      if (!database.objectStoreNames.contains("historyBootstrap")) {
        database.createObjectStore("historyBootstrap", { keyPath: "uid" });
      }
    },
  });
}

function getDb(): Promise<IDBPDatabase<OfflineQueueDatabase>> {
  return getOfflineDb();
}

function getDraftKey(uid: string, attendanceId: string): string {
  return `${uid}:${attendanceId}`;
}

function getSyncLeaseKey(uid: string): string {
  return `lease:${uid}`;
}

function dispatchQueueChange(uid?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(QUEUE_EVENT_NAME, {
      detail: { uid },
    })
  );
}

function estimateBytes(value: unknown): number {
  return new Blob([JSON.stringify(value)]).size;
}

function isSameOrOlderSchoolYear(itemSchoolYear: string, currentSchoolYear: string): boolean {
  return itemSchoolYear <= currentSchoolYear;
}

async function pruneSyncedItemsToFit(db: IDBPDatabase<OfflineQueueDatabase>, uid: string, targetBytes: number): Promise<void> {
  const tx = db.transaction("queue", "readwrite");
  const syncedItems = await tx.store.index("by-uid-syncedAt").getAll(IDBKeyRange.bound([uid, 0], [uid, Number.MAX_SAFE_INTEGER]));

  let currentBytes = await getQueueStorageUsage(uid);
  for (const item of syncedItems) {
    if (currentBytes + targetBytes <= MAX_QUEUE_STORAGE_BYTES) {
      break;
    }

    await tx.store.delete(item.operationId);
    currentBytes -= estimateBytes(item);
  }

  await tx.done;
}

export function buildOfflineOperationId(uid: string, attendanceId: string): string {
  return `${uid}:${attendanceId}:submit`;
}

function isQueueItemStaleSyncing(item: OfflineAttendanceQueueItem, now: number = Date.now()): boolean {
  return item.status === "syncing" && now - item.updatedAt >= STALE_SYNCING_THRESHOLD_MS;
}

export async function getQueueStorageUsage(uid: string): Promise<number> {
  const db = await getDb();
  const queueItems = await db.getAllFromIndex("queue", "by-uid", uid);
  const drafts = await db.getAllFromIndex("drafts", "by-uid", uid);

  return estimateBytes({ queueItems, drafts });
}

export async function cleanupOfflineItemsForSchoolYear(uid: string, currentSchoolYear: string): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction(["queue", "drafts"], "readwrite");

  const queueItems = await transaction.objectStore("queue").index("by-uid").getAll(uid);
  for (const item of queueItems) {
    const shouldDelete =
      isSameOrOlderSchoolYear(item.schoolYear, currentSchoolYear) &&
      item.schoolYear !== currentSchoolYear &&
      (item.status === "synced" || item.status === "needs_review");

    if (shouldDelete) {
      await transaction.objectStore("queue").delete(item.operationId);
    }
  }

  const drafts = await transaction.objectStore("drafts").index("by-uid").getAll(uid);
  for (const draft of drafts) {
    if (isSameOrOlderSchoolYear(draft.schoolYear, currentSchoolYear) && draft.schoolYear !== currentSchoolYear) {
      await transaction.objectStore("drafts").delete(draft.key);
    }
  }

  await transaction.done;
  dispatchQueueChange(uid);
}

export async function saveAttendanceDraft(
  draft: Omit<OfflineAttendanceDraft, "key" | "createdAt" | "updatedAt">,
): Promise<OfflineAttendanceDraft> {
  const db = await getDb();
  const now = Date.now();
  const key = getDraftKey(draft.uid, draft.attendanceId);
  const existing = await db.get("drafts", key);
  const nextDraft: OfflineAttendanceDraft = {
    ...draft,
    key,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.put("drafts", nextDraft);
  console.log("📦 OFFLINE QUEUE | draft saved", {
    uid: draft.uid,
    attendanceId: draft.attendanceId,
    students: draft.students.length,
  });
  return nextDraft;
}

export async function getAttendanceDraft(uid: string, attendanceId: string): Promise<OfflineAttendanceDraft | null> {
  const db = await getDb();
  return (await db.get("drafts", getDraftKey(uid, attendanceId))) ?? null;
}

export async function deleteAttendanceDraft(uid: string, attendanceId: string): Promise<void> {
  const db = await getDb();
  await db.delete("drafts", getDraftKey(uid, attendanceId));
}

export async function enqueueAttendanceSync(
  input: Omit<OfflineAttendanceQueueItem, "createdAt" | "updatedAt" | "retryCount" | "lastError" | "status" | "failureCode" | "syncedAt">,
): Promise<OfflineAttendanceQueueItem> {
  const db = await getDb();
  const sizeToAdd = estimateBytes(input);
  await pruneSyncedItemsToFit(db, input.uid, sizeToAdd);

  if ((await getQueueStorageUsage(input.uid)) + sizeToAdd > MAX_QUEUE_STORAGE_BYTES) {
    throw new OfflineStorageCapError();
  }

  const now = Date.now();
  const existing = await db.get("queue", input.operationId);
  const nextItem: OfflineAttendanceQueueItem = {
    ...input,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    retryCount: existing?.retryCount ?? 0,
    lastError: null,
    status: "pending",
    failureCode: null,
    syncedAt: null,
  };

  await db.put("queue", nextItem);
  console.log("📦 OFFLINE QUEUE | enqueue", {
    operationId: nextItem.operationId,
    attendanceId: nextItem.attendanceId,
    status: nextItem.status,
  });
  dispatchQueueChange(input.uid);
  return nextItem;
}

export async function getQueueItem(operationId: string): Promise<OfflineAttendanceQueueItem | null> {
  const db = await getDb();
  return (await db.get("queue", operationId)) ?? null;
}

export async function getLatestQueueItemForSession(uid: string, attendanceId: string): Promise<OfflineAttendanceQueueItem | null> {
  const operationId = buildOfflineOperationId(uid, attendanceId);
  return getQueueItem(operationId);
}

export async function listPendingQueueItems(uid: string): Promise<OfflineAttendanceQueueItem[]> {
  const db = await getDb();
  const items = await db.getAllFromIndex("queue", "by-uid", uid);
  const now = Date.now();

  return items
    .filter((item) => (
      item.status === "pending" ||
      (item.status === "failed" && item.failureCode === "transient") ||
      isQueueItemStaleSyncing(item, now)
    ))
    .sort((a, b) => {
      if (a.sessionKey === b.sessionKey) {
        return a.createdAt - b.createdAt;
      }

      return a.createdAt - b.createdAt;
    });
}

export async function listQueueItems(uid: string): Promise<OfflineAttendanceQueueItem[]> {
  const db = await getDb();
  const items = await db.getAllFromIndex("queue", "by-uid", uid);

  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateQueueItem(
  operationId: string,
  updater: (item: OfflineAttendanceQueueItem) => OfflineAttendanceQueueItem,
): Promise<OfflineAttendanceQueueItem | null> {
  const db = await getDb();
  const existing = await db.get("queue", operationId);
  if (!existing) {
    return null;
  }

  const updated = updater(existing);
  await db.put("queue", updated);
  dispatchQueueChange(updated.uid);
  return updated;
}

export async function markQueueItemSyncing(operationId: string): Promise<void> {
  await updateQueueItem(operationId, (item) => ({
    ...item,
    status: "syncing",
    updatedAt: Date.now(),
    lastError: null,
  }));
}

export async function markQueueItemSynced(operationId: string): Promise<void> {
  await updateQueueItem(operationId, (item) => ({
    ...item,
    status: "synced",
    syncedAt: Date.now(),
    updatedAt: Date.now(),
    lastError: null,
    failureCode: null,
  }));
}

export async function markQueueItemFailed(
  operationId: string,
  failureCode: OfflineQueueFailureCode,
  message: string,
): Promise<void> {
  await updateQueueItem(operationId, (item) => ({
    ...item,
    status: failureCode === "conflict" ? "needs_review" : "failed",
    failureCode,
    lastError: message,
    retryCount: item.retryCount + 1,
    updatedAt: Date.now(),
  }));
}

export async function discardQueueItem(operationId: string): Promise<void> {
  const item = await getQueueItem(operationId);
  if (!item) {
    return;
  }

  await updateQueueItem(operationId, (existing) => ({
    ...existing,
    status: "needs_review",
    failureCode: existing.failureCode ?? "locked",
    updatedAt: Date.now(),
  }));
}

export async function getQueueSummary(uid: string): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  needsReview: number;
}> {
  const items = await listQueueItems(uid);
  const now = Date.now();

  return items.reduce(
    (summary, item) => {
      if (item.status === "pending" || isQueueItemStaleSyncing(item, now)) {
        summary.pending += 1;
      } else if (item.status === "syncing") {
        summary.syncing += 1;
      } else if (item.status === "failed") {
        summary.failed += 1;
      } else if (item.status === "needs_review") {
        summary.needsReview += 1;
      }

      return summary;
    },
    { pending: 0, syncing: 0, failed: 0, needsReview: 0 },
  );
}

export async function acquireSyncLease(uid: string, ownerId: string): Promise<boolean> {
  const db = await getDb();
  const key = getSyncLeaseKey(uid);
  const now = Date.now();
  const existing = await db.get("syncLeases", key);

  if (existing && existing.expiresAt > now && existing.ownerId !== ownerId) {
    return false;
  }

  await db.put("syncLeases", {
    key,
    ownerId,
    expiresAt: now + SYNC_LEASE_TTL_MS,
  });

  return true;
}

export async function renewSyncLease(uid: string, ownerId: string): Promise<boolean> {
  const db = await getDb();
  const key = getSyncLeaseKey(uid);
  const existing = await db.get("syncLeases", key);

  if (!existing || existing.ownerId !== ownerId) {
    return false;
  }

  await db.put("syncLeases", {
    key,
    ownerId,
    expiresAt: Date.now() + SYNC_LEASE_TTL_MS,
  });

  return true;
}

export async function releaseSyncLease(uid: string, ownerId: string): Promise<void> {
  const db = await getDb();
  const key = getSyncLeaseKey(uid);
  const existing = await db.get("syncLeases", key);
  if (existing?.ownerId === ownerId) {
    await db.delete("syncLeases", key);
  }
}

export async function clearSyncLease(uid: string): Promise<void> {
  const db = await getDb();
  await db.delete("syncLeases", getSyncLeaseKey(uid));
}

export async function clearQueueUiForUser(uid: string): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction(["drafts", "syncLeases"], "readwrite");

  const drafts = await transaction.objectStore("drafts").index("by-uid").getAll(uid);
  for (const draft of drafts) {
    await transaction.objectStore("drafts").delete(draft.key);
  }

  await transaction.objectStore("syncLeases").delete(getSyncLeaseKey(uid));
  await transaction.done;
  dispatchQueueChange(uid);
}

export async function recoverStaleSyncingQueueItems(uid: string): Promise<number> {
  const db = await getDb();
  const items = await db.getAllFromIndex("queue", "by-uid", uid);
  const staleItems = items.filter((item) => isQueueItemStaleSyncing(item));

  if (staleItems.length === 0) {
    return 0;
  }

  const transaction = db.transaction("queue", "readwrite");
  const now = Date.now();

  for (const item of staleItems) {
    await transaction.store.put({
      ...item,
      status: "pending",
      updatedAt: now,
      lastError: item.lastError ?? "Recovered after an interrupted sync attempt.",
    });
  }

  await transaction.done;
  dispatchQueueChange(uid);
  return staleItems.length;
}

export function subscribeToOfflineQueueChanges(callback: (uid?: string) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ uid?: string }>;
    callback(customEvent.detail?.uid);
  };

  window.addEventListener(QUEUE_EVENT_NAME, handler);
  return () => {
    window.removeEventListener(QUEUE_EVENT_NAME, handler);
  };
}

export function useOfflineQueueSummary(uid?: string): {
  pending: number;
  syncing: number;
  failed: number;
  needsReview: number;
  loaded: boolean;
} {
  const defaultSummary = {
    pending: 0,
    syncing: 0,
    failed: 0,
    needsReview: 0,
    loaded: !uid,
  };
  const [summary, setSummary] = useState({
    ...defaultSummary,
  });

  useEffect(() => {
    if (!uid) {
      return;
    }

    let cancelled = false;

    const loadSummary = async () => {
      const nextSummary = await getQueueSummary(uid);
      if (!cancelled) {
        setSummary({ ...nextSummary, loaded: true });
      }
    };

    void loadSummary();
    const unsubscribe = subscribeToOfflineQueueChanges((changedUid) => {
      if (!changedUid || changedUid === uid) {
        void loadSummary();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  return uid ? summary : defaultSummary;
}

export function useOfflineQueuedDates(uid?: string): {
  dates: string[];
  loaded: boolean;
} {
  const [state, setState] = useState<{ dates: string[]; loaded: boolean }>({
    dates: [],
    loaded: !uid,
  });

  useEffect(() => {
    if (!uid) {
      return;
    }

    let cancelled = false;

    const loadDates = async () => {
      const items = await listQueueItems(uid);
      const queuedDates = Array.from(
        new Set(
          items
            .filter((item) => item.status === "pending" || item.status === "syncing" || item.status === "failed" || item.status === "needs_review")
            .map((item) => item.date)
        )
      ).sort((a, b) => b.localeCompare(a));

      if (!cancelled) {
        setState({ dates: queuedDates, loaded: true });
      }
    };

    void loadDates();
    const unsubscribe = subscribeToOfflineQueueChanges((changedUid) => {
      if (!changedUid || changedUid === uid) {
        void loadDates();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  return uid ? state : { dates: [], loaded: true };
}

export function useOfflineHistoryQueueItems(uid?: string): {
  items: OfflineAttendanceQueueItem[];
  loaded: boolean;
} {
  const [state, setState] = useState<{ items: OfflineAttendanceQueueItem[]; loaded: boolean }>({
    items: [],
    loaded: !uid,
  });

  useEffect(() => {
    if (!uid) {
      return;
    }

    let cancelled = false;

    const loadItems = async () => {
      const items = await listQueueItems(uid);
      const visibleItems = items.filter(
        (item) => item.status === "pending" || item.status === "syncing" || item.status === "failed" || item.status === "needs_review"
      );

      if (!cancelled) {
        setState({ items: visibleItems, loaded: true });
      }
    };

    void loadItems();
    const unsubscribe = subscribeToOfflineQueueChanges((changedUid) => {
      if (!changedUid || changedUid === uid) {
        void loadItems();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  return uid ? state : { items: [], loaded: true };
}
