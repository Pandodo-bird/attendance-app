import type { Attendance } from "@/lib/firestore";
import { getOfflineDb } from "@/lib/offlineQueue";

function sortSessionsDescending(sessions: Attendance[]): Attendance[] {
  return [...sessions].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }

    const aLockedAt = a.lockedAt instanceof Date ? a.lockedAt.getTime() : 0;
    const bLockedAt = b.lockedAt instanceof Date ? b.lockedAt.getTime() : 0;
    return bLockedAt - aLockedAt;
  });
}

function filterSessionsBySchoolYear(sessions: Attendance[], schoolYear: string): Attendance[] {
  return sessions.filter((session) => session.schoolYear === schoolYear);
}

export async function readSecretaryHistoryCache(uid?: string, schoolYear?: string): Promise<Attendance[]> {
  if (typeof window === "undefined" || !uid || !schoolYear) {
    return [];
  }

  const db = await getOfflineDb();
  const record = await db.get("historyBootstrap", uid);

  if (!record || record.schoolYear !== schoolYear) {
    return [];
  }

  return sortSessionsDescending(filterSessionsBySchoolYear(record.sessions, schoolYear));
}

export async function mergeSecretaryHistoryCache(
  uid: string,
  schoolYear: string,
  sessions: Attendance[],
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const db = await getOfflineDb();
  const existing = await db.get("historyBootstrap", uid);
  const existingSessions = existing?.schoolYear === schoolYear
    ? filterSessionsBySchoolYear(existing.sessions, schoolYear)
    : [];

  const mergedById = new Map<string, Attendance>();
  existingSessions.forEach((session) => {
    mergedById.set(session.id, session);
  });
  filterSessionsBySchoolYear(sessions, schoolYear).forEach((session) => {
    mergedById.set(session.id, session);
  });

  await db.put("historyBootstrap", {
    uid,
    schoolYear,
    sessions: sortSessionsDescending(Array.from(mergedById.values())),
    updatedAt: Date.now(),
  });
}

export async function clearSecretaryHistoryCache(uid?: string): Promise<void> {
  if (typeof window === "undefined" || !uid) {
    return;
  }

  const db = await getOfflineDb();
  await db.delete("historyBootstrap", uid);
}
