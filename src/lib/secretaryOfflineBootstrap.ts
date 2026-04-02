import type { Appointment, Section, Student } from "@/lib/firestore";

const SECRETARY_BOOTSTRAP_PREFIX = "secretary-attendance-bootstrap";

export interface SecretaryBootstrapCache {
  appointments: Appointment[];
  sectionsById: Record<string, Section>;
  studentsBySectionId: Record<string, Student[]>;
  updatedAt: number;
}

function getStorageKey(uid: string): string {
  return `${SECRETARY_BOOTSTRAP_PREFIX}:${uid}`;
}

export function readSecretaryBootstrapCache(uid?: string): SecretaryBootstrapCache | null {
  if (typeof window === "undefined" || !uid) {
    return null;
  }

  const raw = window.localStorage.getItem(getStorageKey(uid));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SecretaryBootstrapCache;
  } catch {
    window.localStorage.removeItem(getStorageKey(uid));
    return null;
  }
}

export function writeSecretaryBootstrapCache(
  uid: string,
  data: Omit<SecretaryBootstrapCache, "updatedAt">,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: SecretaryBootstrapCache = {
    ...data,
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(getStorageKey(uid), JSON.stringify(payload));
}

export function mergeSecretaryBootstrapCache(
  uid: string,
  data: Partial<Omit<SecretaryBootstrapCache, "updatedAt">>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const existing = readSecretaryBootstrapCache(uid);
  const payload: SecretaryBootstrapCache = {
    appointments: data.appointments ?? existing?.appointments ?? [],
    sectionsById: {
      ...(existing?.sectionsById ?? {}),
      ...(data.sectionsById ?? {}),
    },
    studentsBySectionId: {
      ...(existing?.studentsBySectionId ?? {}),
      ...(data.studentsBySectionId ?? {}),
    },
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(getStorageKey(uid), JSON.stringify(payload));
}

export function clearSecretaryBootstrapCache(uid?: string): void {
  if (typeof window === "undefined" || !uid) {
    return;
  }

  window.localStorage.removeItem(getStorageKey(uid));
}
