import { db } from "@/lib/firebase";
import type { OfflineAttendanceQueueItem, OfflineAttendanceStudentPayload } from "@/lib/offlineQueue";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  deleteDoc,
  writeBatch,
  updateDoc,
  increment,
  deleteField,
} from "firebase/firestore";

// ==================== User Profile Types ====================

export interface TeacherData {
  role: "teacher";
  displayName: string;
  email: string;
  createdAt: Date | Timestamp;
}

export interface SecretaryData {
  role: "secretary";
  displayName: string;
  email: string;
  lrn: string;
  createdAt: Date | Timestamp;
}

export type UserData = TeacherData | SecretaryData;

// ==================== Section Types ====================

export interface Section {
  id: string;
  sectionName: string;
  gradeLevel: string;
  schoolYear: string;
  teacherId: string;
  status: "active" | "inactive" | "archived";
  studentCount?: number;
  createdAt: Date | Timestamp;
}

// ==================== Student Types (in sections/{id}/students) ====================

export interface Student {
  lrn: string;
  lastName: string;
  firstName: string;
  middleName: string;
  sex: "male" | "female" | "";
  birthDate: Date | Timestamp | string;
  religion: string;
  
  // Address
  barangay: string;
  city: string;
  province: string;
  
  // Parent/Guardian Info
  fatherName: string;
  motherMaidenName: string;
  guardianName: string;
  guardianRelationship: string;
  guardianContactNumber: string;
  
  // Academic Info
  learningModality: string;
  
  // Status
  studentStatus: "active" | "inactive" | "graduated" | "dropped";
  createdAt: Date | Timestamp;
}

// ==================== Appointment Types ====================

export interface Appointment {
  id: string;
  secretaryUid: string;      // links to users/{uid}
  secretaryLrn: string;      // links to sections/{id}/students/{lrn}
  teacherId: string;         // which teacher appointed them
  sectionId: string;         // which section
  schoolYear: string;
  status: "active" | "removed";
  appointedAt: Date | Timestamp;
}

// ==================== Attendance Types ====================

export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export interface AttendanceRecord {
  studentName: string;
  status: AttendanceStatus;
  remarks?: string;
  timeRecorded: Date | Timestamp;
  recordedByUid?: string;
  recordedByName?: string;
  updatedAt?: Date | Timestamp;
  updatedByTeacherId?: string;
  updatedByTeacherName?: string;
}

export interface Attendance {
  id: string;
  appointmentId?: string;
  sectionId: string;
  teacherId: string;
  secretaryUid?: string;
  secretaryLrn?: string;
  subject?: string;
  date: string;
  schoolYear: string;
  status: "open" | "locked";
  records?: Record<string, AttendanceRecord>;
  createdAt: Date | Timestamp;
  createdByUid?: string;
  createdByRole?: "teacher" | "secretary";
  lockedAt?: Date | Timestamp;
  submittedByUid?: string;
  submittedByRole?: "teacher" | "secretary";
}

interface AttendanceSubmitActor {
  uid: string;
  role: "teacher" | "secretary";
}

export interface OfflineAttendanceReplayResult {
  outcome: "synced" | "locked" | "needs_review";
  message: string;
  latestSession: Attendance | null;
}

export interface AttendanceFlatRecord {
  id: string;
  attendanceId: string;
  teacherId: string;
  lrn: string;
  sectionId: string;
  subject?: string;
  date: string;
  schoolYear: string;
  status: AttendanceStatus;
  remarks?: string;
  timeRecorded: Date | Timestamp;
  recordedByUid?: string;
  recordedByName?: string;
  updatedAt?: Date | Timestamp;
  updatedByTeacherId?: string;
  updatedByTeacherName?: string;
}

// ==================== Student Summary Types ====================

export interface StudentSummary {
  id: string;
  lrn: string;
  sectionId: string;
  schoolYear: string;
  totalDays: number;
  present: number;
  late: number;
  absent: number;
  excused?: number;
  trend: Record<string, { present: number; late: number; absent: number; excused?: number }>;
}

// ==================== Legacy Cache Shims ====================
// TanStack Query now owns caching. These shims intentionally disable the
// deprecated in-memory cache while preserving existing call signatures.
export function getCachedData<T>(_key: string): T | null {
  void _key;
  return null;
}

export function setCachedData<T>(_key: string, _data: T): void {
  void _key;
  void _data;
}

export function invalidateCache(_pattern: string): void {
  void _pattern;
}

export function clearAllCaches(): void {
}

function normalizeSectionSlugPart(value: string): string {
  return value.replace(/\s+/g, "-");
}

export function buildSectionSlug(gradeLevel: string, sectionName: string): string {
  return `${gradeLevel}-${normalizeSectionSlugPart(sectionName)}`;
}

export function buildSectionAttendanceId(date: string, sectionSlug: string): string {
  return `${date}_${sectionSlug}`;
}

function toMillis(value: Date | Timestamp | string | undefined): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  if (typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  return null;
}

function getLatestTeacherOverrideMillis(records?: Record<string, AttendanceRecord>): number | null {
  if (!records) {
    return null;
  }

  let latestOverride: number | null = null;

  Object.values(records).forEach((record) => {
    if (!record.updatedByTeacherId) {
      return;
    }

    const updatedAt = toMillis(record.updatedAt);
    if (updatedAt !== null && (latestOverride === null || updatedAt > latestOverride)) {
      latestOverride = updatedAt;
    }
  });

  return latestOverride;
}

function doesSessionMatchQueuedSubmission(
  session: Attendance,
  students: OfflineAttendanceStudentPayload[],
  secretaryUid: string,
): boolean {
  if (session.status !== "locked" || !session.records) {
    return false;
  }

  const remoteKeys = Object.keys(session.records);
  if (remoteKeys.length !== students.length) {
    return false;
  }

  return students.every((student) => {
    const remoteRecord = session.records?.[student.lrn];
    if (!remoteRecord) {
      return false;
    }

    return remoteRecord.status === student.status && remoteRecord.recordedByUid === secretaryUid;
  });
}

async function ensureSecretaryAttendanceSession(item: OfflineAttendanceQueueItem): Promise<void> {
  const attendanceRef = doc(db, "attendance", item.attendanceId);
  const existingSnap = await getDoc(attendanceRef);
  if (existingSnap.exists()) {
    return;
  }

  await setDoc(attendanceRef, {
    sectionId: item.sectionId,
    teacherId: item.teacherId,
    secretaryUid: item.secretaryUid,
    date: item.date,
    schoolYear: item.schoolYear,
    status: "open",
    records: {},
    createdAt: new Date(),
    createdByUid: item.secretaryUid,
    createdByRole: "secretary",
  });
}

export async function replayQueuedAttendanceSubmission(
  item: OfflineAttendanceQueueItem,
): Promise<OfflineAttendanceReplayResult> {
  const attendanceRef = doc(db, "attendance", item.attendanceId);
  console.log("📶 OFFLINE SYNC | replay start", {
    operationId: item.operationId,
    attendanceId: item.attendanceId,
  });

  const attendanceSnap = await getDoc(attendanceRef);
  const latestSession = attendanceSnap.exists()
    ? ({ id: attendanceSnap.id, ...attendanceSnap.data() } as Attendance)
    : null;

  if (latestSession) {
    if (doesSessionMatchQueuedSubmission(latestSession, item.students, item.secretaryUid)) {
      console.log("📶 OFFLINE SYNC | replay matched existing locked session", {
        operationId: item.operationId,
      });
      return {
        outcome: "synced",
        message: "Attendance was already synced from this device.",
        latestSession,
      };
    }

    if (latestSession.status === "locked") {
      return {
        outcome: "locked",
        message: "This session was already locked by the teacher. Local attendance needs review.",
        latestSession,
      };
    }

    const latestTeacherOverride = getLatestTeacherOverrideMillis(latestSession.records);
    if (
      latestTeacherOverride !== null &&
      item.lastKnownRemoteChangeAt !== null &&
      latestTeacherOverride > item.lastKnownRemoteChangeAt
    ) {
      return {
        outcome: "needs_review",
        message: "Teacher updates were detected while this device was offline.",
        latestSession,
      };
    }
  } else {
    await ensureSecretaryAttendanceSession(item);
  }

  await submitFullAttendance(
    item.attendanceId,
    item.sectionId,
    item.teacherId,
    item.secretaryUid,
    item.sectionSlug,
    item.date,
    item.schoolYear,
    item.students,
    {
      uid: item.secretaryUid,
      role: "secretary",
    },
  );

  const syncedSnap = await getDoc(attendanceRef);
  const syncedSession = syncedSnap.exists()
    ? ({ id: syncedSnap.id, ...syncedSnap.data() } as Attendance)
    : null;

  console.log("📶 OFFLINE SYNC | replay end", {
    operationId: item.operationId,
    attendanceId: item.attendanceId,
    outcome: "synced",
  });

  return {
    outcome: "synced",
    message: "Offline attendance synced successfully.",
    latestSession: syncedSession,
  };
}

async function getAccessibleSectionIdsForSecretary(
  secretaryUid: string,
  activeOnly = false
): Promise<string[]> {
  const appointmentsRef = collection(db, "appointments");
  const constraints = [where("secretaryUid", "==", secretaryUid)];

  if (activeOnly) {
    constraints.push(where("status", "==", "active"));
  }

  const q = query(appointmentsRef, ...constraints);
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [appointments] (secretary section access)", {
    secretaryUid,
    activeOnly,
  });
  const snapshot = await getDocs(q);

  return Array.from(
    new Set(snapshot.docs.map((appointmentDoc) => appointmentDoc.data().sectionId as string))
  );
}

async function getAttendanceBySectionIds(
  sectionIds: string[],
  filters?: {
    date?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<Attendance[]> {
  if (sectionIds.length === 0) {
    return [];
  }

  const attendanceRef = collection(db, "attendance");
  const sessions: Attendance[] = [];

  for (let index = 0; index < sectionIds.length; index += 10) {
    const chunk = sectionIds.slice(index, index + 10);
    const constraints = [where("sectionId", "in", chunk)];

    if (filters?.date) {
      constraints.push(where("date", "==", filters.date));
    }

    if (filters?.startDate) {
      constraints.push(where("date", ">=", filters.startDate));
    }

    if (filters?.endDate) {
      constraints.push(where("date", "<=", filters.endDate));
    }

    const q = query(attendanceRef, ...constraints);
    console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [attendance] (sectionId access query)", {
      sectionIds: chunk,
      filters: filters ?? null,
    });
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((attendanceDoc) => {
      sessions.push({
        id: attendanceDoc.id,
        ...attendanceDoc.data(),
      } as Attendance);
    });
  }

  sessions.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    const aLockedAt = a.lockedAt instanceof Timestamp ? a.lockedAt.toMillis() : 0;
    const bLockedAt = b.lockedAt instanceof Timestamp ? b.lockedAt.toMillis() : 0;
    if (aLockedAt !== bLockedAt) {
      return bLockedAt - aLockedAt;
    }

    return b.id.localeCompare(a.id);
  });

  return sessions;
}

// ==================== User Profile Functions ====================

export async function createUserProfile(
  uid: string,
  role: "teacher" | "secretary",
  displayName: string,
  email: string,
  lrn?: string  // Only for secretaries
): Promise<void> {
  const userRef = doc(db, "users", uid);

  // Create user data based on role
  const userData: UserData = role === "secretary"
    ? {
        role,
        displayName,
        email,
        lrn: lrn || "",  // LRN required for secretaries
        createdAt: new Date(),
      }
    : {
        role,
        displayName,
        email,
        createdAt: new Date(),
      };

  await setDoc(userRef, userData);
}

export async function getUserProfile(uid: string): Promise<UserData | null> {
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDoc] | [users/{uid}]");
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserData;
  }

  return null;
}

/**
 * Get multiple user profiles in a single query (batched by 10 UIDs)
 * Optimized: Uses Firestore 'in' query to fetch up to 10 users per query
 */
export async function getUserProfilesBatch(uids: string[]): Promise<Map<string, UserData>> {
  const userProfiles = new Map<string, UserData>();
  const usersRef = collection(db, "users");

  // Firestore 'in' query supports max 10 items
  const BATCH_SIZE = 10;

  for (let i = 0; i < uids.length; i += BATCH_SIZE) {
    const batch = uids.slice(i, i + BATCH_SIZE);
    const q = query(usersRef, where("__name__", "in", batch));
    console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [users] (batch query)");
    const snapshot = await getDocs(q);

    snapshot.docs.forEach(doc => {
      userProfiles.set(doc.id, doc.data() as UserData);
    });
  }

  return userProfiles;
}

// ==================== Section Functions ====================

/**
 * Get all sections for a teacher
 * Optimized: Single query with caching
 */
export async function getTeacherSections(
  teacherId: string,
  useCache = true
): Promise<Section[]> {
  const cacheKey = `sections_${teacherId}`;

  if (useCache) {
    const cached = getCachedData<Section[]>(cacheKey);
    if (cached) return cached;
  }

  const sectionsRef = collection(db, "sections");
  const q = query(sectionsRef, where("teacherId", "==", teacherId));
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [sections] (teacherId filter)");
  const snapshot = await getDocs(q);

  const sections = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Section));

  if (useCache) {
    setCachedData(cacheKey, sections);
  }

  return sections;
}

/**
 * Get total student count across all active sections for a teacher (lightweight query)
 */
export async function getTeacherStudentCount(
  teacherId: string,
  useCache = true
): Promise<number> {
  const cacheKey = `students_count_${teacherId}`;

  if (useCache) {
    const cached = getCachedData<number>(cacheKey);
    if (cached !== null) return cached;
  }

  const sections = await getTeacherSections(teacherId, useCache);
  let totalCount = 0;

  for (const section of sections) {
    if (section.status === 'active') {
      const studentsRef = collection(db, `sections/${section.id}/students`);
      const q = query(studentsRef, where("studentStatus", "==", "active"));
      console.log(`🔥 FIRESTORE | [firestore.ts] | [getDocs] | [sections/{sectionId}/students] (status filter)`);
      const snapshot = await getDocs(q);
      totalCount += snapshot.size;
    }
  }

  if (useCache) {
    setCachedData(cacheKey, totalCount);
  }

  return totalCount;
}

/**
 * Create a new section
 */
export async function createSection(
  teacherId: string,
  sectionName: string,
  gradeLevel: string,
  schoolYear: string
): Promise<string> {
  const sectionRef = doc(collection(db, "sections"));

  const sectionData: Section = {
    id: sectionRef.id,
    sectionName,
    gradeLevel,
    schoolYear,
    teacherId,
    status: "active",
    studentCount: 0,
    createdAt: new Date(),
  };

  await setDoc(sectionRef, sectionData);
  invalidateCache(`sections_${teacherId}`);

  return sectionRef.id;
}

/**
 * Get a single section by ID
 */
export async function getSectionById(
  sectionId: string,
  useCache = true
): Promise<Section | null> {
  const cacheKey = `section_${sectionId}`;

  if (useCache) {
    const cached = getCachedData<Section>(cacheKey);
    if (cached) return cached;
  }

  console.log("🔥 FIRESTORE | [firestore.ts] | [getDoc] | [sections/{sectionId}]");
  const sectionRef = doc(db, "sections", sectionId);
  const sectionSnap = await getDoc(sectionRef);

  if (sectionSnap.exists()) {
    const section = {
      id: sectionSnap.id,
      ...sectionSnap.data()
    } as Section;

    if (useCache) {
      setCachedData(cacheKey, section);
    }

    return section;
  }

  return null;
}

/**
 * Update section information
 */
export async function updateSection(
  sectionId: string,
  updates: Partial<Section>
): Promise<void> {
  const sectionRef = doc(db, "sections", sectionId);
  await updateDoc(sectionRef, updates);
  invalidateCache(`section_${sectionId}`);
  invalidateCache(`sections_`);
}

/**
 * Update section status
 */
export async function updateSectionStatus(
  sectionId: string,
  status: "active" | "inactive" | "archived"
): Promise<void> {
  const sectionRef = doc(db, "sections", sectionId);
  await updateDoc(sectionRef, { status });
  invalidateCache("sections_");
}

/**
 * Delete a section (and optionally its students subcollection)
 */
export async function deleteSection(sectionId: string, teacherId: string): Promise<void> {
  const sectionRef = doc(db, "sections", sectionId);
  await deleteDoc(sectionRef);
  invalidateCache(`sections_${teacherId}`);
}

// ==================== Student Functions (sections/{id}/students subcollection) ====================

/**
 * Get all students from all sections for a teacher
 */
export async function getAllTeacherStudents(
  teacherId: string,
  useCache = true
): Promise<{ sectionId: string; sectionName: string; gradeLevel: string; student: Student }[]> {
  const cacheKey = `students_all_${teacherId}`;

  if (useCache) {
    const cached = getCachedData<{ sectionId: string; sectionName: string; gradeLevel: string; student: Student }[]>(cacheKey);
    if (cached) return cached;
  }

  const sections = await getTeacherSections(teacherId, useCache);
  const sectionStudentGroups = await Promise.all(
    sections
      .filter((section) => section.status === "active")
      .map(async (section) => {
        const students = await getSectionStudents(section.id, useCache);
        return students
          .filter((student) => student.studentStatus === "active")
          .map((student) => ({
            sectionId: section.id,
            sectionName: section.sectionName,
            gradeLevel: section.gradeLevel,
            student,
          }));
      })
  );

  const allStudents = sectionStudentGroups.flat();

  if (useCache) {
    setCachedData(cacheKey, allStudents);
  }

  return allStudents;
}

/**
 * Check if a student LRN already has a secretary account
 */
export async function checkSecretaryAccountExists(lrn: string): Promise<boolean> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("lrn", "==", lrn), where("role", "==", "secretary"));
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [users] (lrn + role filter)");
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Check if a student has an active secretary appointment
 */
export async function checkStudentHasActiveSecretaryAppointment(lrn: string): Promise<boolean> {
  const appointmentsRef = collection(db, "appointments");
  const q = query(appointmentsRef, where("secretaryLrn", "==", lrn), where("status", "==", "active"));
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [appointments] (secretaryLrn + status filter)");
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Get all students in a section
 */
export async function getSectionStudents(
  sectionId: string,
  useCache = true
): Promise<Student[]> {
  const cacheKey = `students_${sectionId}`;

  if (useCache) {
    const cached = getCachedData<Student[]>(cacheKey);
    if (cached) return cached;
  }

  const studentsRef = collection(db, `sections/${sectionId}/students`);
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [sections/{sectionId}/students]");
  const snapshot = await getDocs(studentsRef);

  const students = snapshot.docs.map(doc => ({
    lrn: doc.id,
    ...doc.data()
  } as Student));

  if (useCache) {
    setCachedData(cacheKey, students);
  }

  return students;
}

/**
 * Add a student to a section
 */
export async function addStudentToSection(
  sectionId: string,
  student: Omit<Student, "createdAt">
): Promise<void> {
  const studentRef = doc(db, `sections/${sectionId}/students`, student.lrn);
  const sectionRef = doc(db, "sections", sectionId);

  const studentData: Student = {
    ...student,
    createdAt: new Date(),
  };

  // Add student and increment student count atomically
  const batch = writeBatch(db);
  batch.set(studentRef, studentData);
  batch.update(sectionRef, { studentCount: increment(1) });

  await batch.commit();
  invalidateCache(`students_${sectionId}`);
  invalidateCache(`students_all_`);
  invalidateCache(`sections_`);
}

/**
 * Update student information
 */
export async function updateStudent(
  sectionId: string,
  lrn: string,
  updates: Partial<Student>
): Promise<void> {
  console.log("🔥 FIRESTORE | [firestore.ts] | [updateDoc] | [sections/{sectionId}/students/{lrn}]", { sectionId, lrn, updates });
  const studentRef = doc(db, `sections/${sectionId}/students`, lrn);
  await updateDoc(studentRef, updates);
  console.log("✅ Student updated successfully:", lrn);
  invalidateCache(`students_${sectionId}`);
  invalidateCache(`students_all_`);
}

/**
 * Delete a student from a section
 */
export async function deleteStudent(
  sectionId: string,
  lrn: string
): Promise<void> {
  const studentRef = doc(db, `sections/${sectionId}/students`, lrn);
  const sectionRef = doc(db, "sections", sectionId);

  // Delete student and decrement student count atomically
  const batch = writeBatch(db);
  batch.delete(studentRef);
  batch.update(sectionRef, { studentCount: increment(-1) });

  await batch.commit();
  invalidateCache(`students_${sectionId}`);
  invalidateCache(`students_all_`);
  invalidateCache(`sections_`);
}

/**
 * Batch import students to a section
 */
export async function importStudentsBatch(
  sectionId: string,
  students: Array<Omit<Student, "createdAt">>
): Promise<void> {
  const sectionRef = doc(db, "sections", sectionId);
  const batch = writeBatch(db);

  // Add all students
  students.forEach((student) => {
    const studentRef = doc(db, `sections/${sectionId}/students`, student.lrn);
    batch.set(studentRef, {
      ...student,
      createdAt: new Date(),
    });
  });
  
  // Update student count
  batch.update(sectionRef, { studentCount: increment(students.length) });

  await batch.commit();
  invalidateCache(`students_${sectionId}`);
  invalidateCache(`students_all_`);
}

// ==================== Appointment Functions ====================

/**
 * Get all appointments for a teacher
 */
export async function getTeacherAppointments(
  teacherId: string,
  useCache = true
): Promise<Appointment[]> {
  const cacheKey = `appointments_teacher_${teacherId}`;

  if (useCache) {
    const cached = getCachedData<Appointment[]>(cacheKey);
    if (cached) return cached;
  }

  const appointmentsRef = collection(db, "appointments");
  const q = query(appointmentsRef, where("teacherId", "==", teacherId));
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [appointments] (teacherId filter)");
  const snapshot = await getDocs(q);

  const appointments = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Appointment));

  if (useCache) {
    setCachedData(cacheKey, appointments);
  }

  return appointments;
}

/**
 * Get all active appointments for a secretary
 */
export async function getSecretaryAppointments(
  secretaryUid: string,
  useCache = true
): Promise<Appointment[]> {
  const cacheKey = `appointments_secretary_${secretaryUid}`;

  if (useCache) {
    const cached = getCachedData<Appointment[]>(cacheKey);
    if (cached) return cached;
  }

  const appointmentsRef = collection(db, "appointments");
  const q = query(
    appointmentsRef,
    where("secretaryUid", "==", secretaryUid),
    where("status", "==", "active")
  );
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [appointments] (secretaryUid + status filter)");
  const snapshot = await getDocs(q);

  const appointments = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Appointment));

  if (useCache) {
    setCachedData(cacheKey, appointments);
  }

  return appointments;
}

/**
 * Subscribe to real-time updates for teacher's appointments
 */

/**
 * Create a new appointment (appoint a secretary)
 */
export async function createAppointment(
  teacherId: string,
  secretaryUid: string,
  secretaryLrn: string,
  sectionId: string,
  schoolYear: string
): Promise<string> {
  const appointmentRef = doc(collection(db, "appointments"));
  
  const appointmentData: Appointment = {
    id: appointmentRef.id,
    secretaryUid,
    secretaryLrn,
    teacherId,
    sectionId,
    schoolYear,
    status: "active",
    appointedAt: new Date(),
  };

  await setDoc(appointmentRef, appointmentData);
  invalidateCache(`appointments_teacher_${teacherId}`);
  invalidateCache(`appointments_secretary_${secretaryUid}`);

  return appointmentRef.id;
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: "active" | "removed",
  teacherId?: string,
  secretaryUid?: string
): Promise<void> {
  const appointmentRef = doc(db, "appointments", appointmentId);
  await updateDoc(appointmentRef, { status });
  
  if (teacherId) invalidateCache(`appointments_teacher_${teacherId}`);
  if (secretaryUid) invalidateCache(`appointments_secretary_${secretaryUid}`);
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(
  appointmentId: string,
  teacherId?: string,
  secretaryUid?: string
): Promise<void> {
  const appointmentRef = doc(db, "appointments", appointmentId);
  await deleteDoc(appointmentRef);
  
  if (teacherId) invalidateCache(`appointments_teacher_${teacherId}`);
  if (secretaryUid) invalidateCache(`appointments_secretary_${secretaryUid}`);
}

// ==================== Attendance Functions ====================

/**
 * Get attendance records for a teacher on a specific date
 */
export async function getTeacherAttendance(
  teacherId: string,
  date: string,
  useCache = true
): Promise<Attendance[]> {
  const cacheKey = `attendance_teacher_${teacherId}_${date}`;

  if (useCache) {
    const cached = getCachedData<Attendance[]>(cacheKey);
    if (cached) return cached;
  }

  const attendanceRef = collection(db, "attendance");
  const q = query(
    attendanceRef,
    where("teacherId", "==", teacherId),
    where("date", "==", date)
  );
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [attendance] (teacherId + date filter)");
  const snapshot = await getDocs(q);

  const attendance = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Attendance));

  if (useCache) {
    setCachedData(cacheKey, attendance);
  }

  return attendance;
}

/**
 * Get attendance records for a secretary
 */
export async function getSecretaryAttendance(
  secretaryUid: string,
  useCache = true
): Promise<Attendance[]> {
  const cacheKey = `attendance_secretary_${secretaryUid}`;

  if (useCache) {
    const cached = getCachedData<Attendance[]>(cacheKey);
    if (cached) return cached;
  }

  const accessibleSectionIds = await getAccessibleSectionIdsForSecretary(secretaryUid);
  const attendance = await getAttendanceBySectionIds(accessibleSectionIds);

  if (useCache) {
    setCachedData(cacheKey, attendance);
  }

  return attendance;
}

/**
 * Get attendance records for a secretary on a specific date
 */
export async function getSecretaryAttendanceForDate(
  secretaryUid: string,
  date: string,
  useCache = true
): Promise<Attendance[]> {
  const cacheKey = `attendance_secretary_${secretaryUid}_${date}`;

  if (useCache) {
    const cached = getCachedData<Attendance[]>(cacheKey);
    if (cached) return cached;
  }

  const accessibleSectionIds = await getAccessibleSectionIdsForSecretary(secretaryUid, true);
  const attendance = await getAttendanceBySectionIds(accessibleSectionIds, { date });

  if (useCache) {
    setCachedData(cacheKey, attendance);
  }

  return attendance;
}

/**
 * Get attendance sessions for a teacher with optional date range filtering
 */
export async function getTeacherAttendanceSessions(
  teacherId: string,
  startDate?: string,
  endDate?: string,
  useCache = true
): Promise<Attendance[]> {
  const cacheKey = `attendance_teacher_sessions_${teacherId}_${startDate ?? "all"}_${endDate ?? "all"}`;

  if (useCache) {
    const cached = getCachedData<Attendance[]>(cacheKey);
    if (cached) return cached;
  }

  const attendanceRef = collection(db, "attendance");
  let q;

  if (startDate && endDate) {
    q = query(
      attendanceRef,
      where("teacherId", "==", teacherId),
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
  } else if (startDate) {
    q = query(
      attendanceRef,
      where("teacherId", "==", teacherId),
      where("date", ">=", startDate)
    );
  } else if (endDate) {
    q = query(
      attendanceRef,
      where("teacherId", "==", teacherId),
      where("date", "<=", endDate)
    );
  } else {
    q = query(attendanceRef, where("teacherId", "==", teacherId));
  }

  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [attendance] (teacherId sessions query)", {
    teacherId,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
  });
  const snapshot = await getDocs(q);

  const sessions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Attendance));

  sessions.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.id.localeCompare(a.id);
  });

  if (useCache) {
    setCachedData(cacheKey, sessions);
  }

  return sessions;
}

/**
 * Submit attendance for a class session
 * Creates attendance document with records subcollection
 * @deprecated Use submitFullAttendance instead for the new attendance layer structure
 */
export async function submitAttendance(
  appointmentId: string,
  sectionId: string,
  teacherId: string,
  secretaryUid: string,
  secretaryLrn: string,
  subject: string,
  date: string,
  schoolYear: string,
  records: Array<{
    lrn: string;
    studentName: string;
    status: "present" | "late" | "absent";
    remarks: string;
  }>
): Promise<string> {
  const batch = writeBatch(db);

  // Create attendance document
  const attendanceRef = doc(collection(db, "attendance"));

  const attendanceData: Omit<Attendance, "id" | "createdAt"> = {
    appointmentId,
    sectionId,
    teacherId,
    secretaryUid,
    secretaryLrn,
    subject,
    date,
    schoolYear,
    status: "open",
    records: {},
  };

  batch.set(attendanceRef, {
    ...attendanceData,
    createdAt: new Date(),
  });

  // Add records subcollection
  records.forEach((record) => {
    const recordRef = doc(attendanceRef, "records", record.lrn);
    batch.set(recordRef, {
      studentName: record.studentName,
      status: record.status,
      remarks: record.remarks,
      timeRecorded: new Date(),
    });
  });

  await batch.commit();
  invalidateCache(`attendance_teacher_${teacherId}_${date}`);
  invalidateCache(`attendance_secretary_${secretaryUid}`);

  return attendanceRef.id;
}

/**
 * Get attendance records for a specific date and appointment
 */

/**
 * Get attendance session by ID
 */
export async function getAttendanceSession(
  attendanceId: string
): Promise<Attendance | null> {
  const attendanceRef = doc(db, "attendance", attendanceId);
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDoc] | [attendance/{attendanceId}]");
  const attendanceSnap = await getDoc(attendanceRef);

  if (!attendanceSnap.exists()) return null;

  return {
    id: attendanceSnap.id,
    ...attendanceSnap.data()
  } as Attendance;
}

// ==================== Attendance Session Functions (Secretary) ====================

/**
 * Check if an attendance session already exists for the given section and date
 * Uses the deterministic document ID pattern: {date}_{sectionSlug}
 */
export async function checkExistingSession(
  sectionSlug: string,
  date: string
): Promise<Attendance | null> {
  const attendanceId = buildSectionAttendanceId(date, sectionSlug);
  const attendanceRef = doc(db, "attendance", attendanceId);

  console.log("🔍 checkExistingSession | Input params:", {
    date,
    sectionSlug,
    constructedAttendanceId: attendanceId
  });

  console.log("🔥 FIRESTORE | [firestore.ts] | [getDoc] | [attendance/{attendanceId}] (check existing session)");
  console.log("📖 Attempting to read attendance document with ID:", attendanceId);
  
  try {
    const attendanceSnap = await getDoc(attendanceRef);
    console.log("✅ getDoc succeeded for attendanceId:", attendanceId);
    console.log("📄 Document exists:", attendanceSnap.exists());
    
    if (attendanceSnap.exists()) {
      const data = attendanceSnap.data();
      console.log("📄 Document data:", {
        id: attendanceSnap.id,
        secretaryUid: data.secretaryUid,
        teacherId: data.teacherId,
        status: data.status
      });
      return {
        id: attendanceSnap.id,
        ...data
      } as Attendance;
    }
    
    console.log("ℹ️ No existing session found for this date - this is normal for first-time attendance");
    return null;
  } catch (error) {
    const errorWithDetails = error as { code?: string; message?: string };
    console.error("❌ getDoc FAILED for attendanceId:", attendanceId);
    console.error("❌ Error details:", error);
    console.error("❌ Error code:", errorWithDetails.code);
    console.error("❌ Error message:", errorWithDetails.message);
    throw error;
  }
}

/**
 * Start an attendance session by creating the attendance/{id} document
 * This marks the commencement of attendance record for the day
 * Idempotent: returns existing session ID if already exists
 */
export async function startAttendanceSession(
  appointment: Appointment,
  sectionSlug: string,
  date: string,
  schoolYear: string
): Promise<string> {
  const attendanceId = buildSectionAttendanceId(date, sectionSlug);
  const attendanceRef = doc(db, "attendance", attendanceId);

  const existingSnap = await getDoc(attendanceRef);
  if (existingSnap.exists()) {
    console.log("⚠️ Session already exists, returning existing ID:", attendanceId);
    return attendanceId;
  }

  const attendanceData: Omit<Attendance, "id" | "createdAt"> = {
    appointmentId: appointment.id,
    sectionId: appointment.sectionId,
    teacherId: appointment.teacherId,
    secretaryUid: appointment.secretaryUid,
    secretaryLrn: appointment.secretaryLrn,
    date,
    schoolYear,
    status: "open",
    records: {},
    createdByUid: appointment.secretaryUid,
    createdByRole: "secretary",
  };

  await setDoc(attendanceRef, {
    ...attendanceData,
    createdAt: new Date(),
  });

  console.log("✅ Attendance session started:", attendanceId);
  return attendanceId;
}

/**
 * Start an attendance session as a teacher
 * Creates the attendance/{id} document with teacher as creator
 * Idempotent: returns existing session ID if already exists
 */
export async function startAttendanceSessionAsTeacher(
  sectionId: string,
  teacherId: string,
  sectionSlug: string,
  date: string,
  schoolYear: string,
  teacherUid: string
): Promise<string> {
  const attendanceId = buildSectionAttendanceId(date, sectionSlug);
  const attendanceRef = doc(db, "attendance", attendanceId);

  const existingSnap = await getDoc(attendanceRef);
  if (existingSnap.exists()) {
    console.log("⚠️ Session already exists (teacher start), returning existing ID:", attendanceId);
    return attendanceId;
  }

  const attendanceData: Omit<Attendance, "id" | "createdAt"> = {
    sectionId,
    teacherId,
    date,
    schoolYear,
    status: "open",
    records: {},
    createdByUid: teacherUid,
    createdByRole: "teacher",
  };

  await setDoc(attendanceRef, {
    ...attendanceData,
    createdAt: new Date(),
  });

  console.log("✅ Attendance session started by teacher:", attendanceId);
  return attendanceId;
}

function buildStudentSummaryId(
  sectionSlug: string,
  lastName: string,
  lrn: string,
  schoolYear: string
): string {
  return `${sectionSlug}_${lastName.toUpperCase().replace(/\s+/g, '-')}_${lrn}_${schoolYear}`;
}

function extractLastNameFromStudentName(studentName: string): string {
  return studentName.split(",")[0]?.trim() || studentName.trim();
}

/**
 * Submit full attendance for a session
 * Performs atomic batch write to 3 collections:
 * 1. attendance/{id} - update records map and lock status
 * 2. attendanceRecords/{id} - create flat audit log per student
 * 3. studentSummaries/{id} - upsert running totals per student
 */
export async function submitFullAttendance(
  attendanceId: string,
  sectionId: string,
  teacherId: string,
  defaultSubmittedByUid: string,
  sectionSlug: string,
  date: string,
  schoolYear: string,
  students: Array<{
    lrn: string;
    studentName: string;
    lastName: string;
    status: AttendanceStatus;
  }>,
  actor?: AttendanceSubmitActor
): Promise<void> {
  const attendanceRef = doc(db, "attendance", attendanceId);
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDoc] | [attendance/{attendanceId}] (submit lock check)", { attendanceId });
  const attendanceSnap = await getDoc(attendanceRef);

  if (!attendanceSnap.exists()) {
    throw new Error("Session not found.");
  }

  const existingSession = attendanceSnap.data();
  if (existingSession.status === "locked") {
    throw new Error("Session already submitted and locked.");
  }

  const submittedByUid = actor?.uid ?? defaultSubmittedByUid;
  const submittedByRole = actor?.role ?? "secretary";

  const batch = writeBatch(db);
  const monthKey = date.slice(0, 7);
  const recordsMap: Record<string, AttendanceRecord> = {};
  
  students.forEach((student) => {
    recordsMap[student.lrn] = {
      studentName: student.studentName,
      status: student.status,
      timeRecorded: new Date(),
      recordedByUid: submittedByUid,
    };
  });

  batch.update(attendanceRef, {
    records: recordsMap,
    status: "locked",
    lockedAt: new Date(),
    submittedByUid,
    submittedByRole,
  });

  // 2. Create flat attendance records (audit log)
  students.forEach((student) => {
    const recordId = `${date}_${sectionSlug}_${student.lrn}`;
    const recordRef = doc(db, "attendanceRecords", recordId);
    
    batch.set(recordRef, {
      attendanceId,
      teacherId,
      lrn: student.lrn,
      sectionId,
      date,
      schoolYear,
      status: student.status,
      timeRecorded: new Date(),
      recordedByUid: submittedByUid,
    });
  });

  // 3. Upsert student summaries (running totals)
  students.forEach((student) => {
    const summaryId = buildStudentSummaryId(sectionSlug, student.lastName, student.lrn, schoolYear);
    const summaryRef = doc(db, "studentSummaries", summaryId);
    
    // Use atomic increments so totals remain consistent across repeated submissions.
    const monthlyStatusPath = `trend.${monthKey}.${student.status}`;

    batch.set(summaryRef, {
      lrn: student.lrn,
      sectionId,
      schoolYear,
      totalDays: increment(1),
      [student.status]: increment(1),
      [monthlyStatusPath]: increment(1),
    }, { merge: true });
  });

  await batch.commit();
  console.log("✅ Full attendance submitted:", attendanceId);
  
  // Invalidate caches
  invalidateCache(`attendance_secretary_${defaultSubmittedByUid}`);
  invalidateCache(`attendance_teacher_${teacherId}_${date}`);
}

/**
 * Teacher override for a submitted attendance record.
 * Updates the session map, flat audit log, and the precomputed student summary together.
 */
export async function overrideAttendanceRecord(
  attendanceId: string,
  sectionSlug: string,
  lrn: string,
  nextStatus: AttendanceStatus,
  teacherId: string,
  teacherName: string
): Promise<void> {
  const attendanceRef = doc(db, "attendance", attendanceId);
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDoc] | [attendance/{attendanceId}] (teacher override)", { attendanceId, lrn, nextStatus });
  const attendanceSnap = await getDoc(attendanceRef);

  if (!attendanceSnap.exists()) {
    throw new Error("Attendance session not found.");
  }

  const attendance = {
    id: attendanceSnap.id,
    ...attendanceSnap.data(),
  } as Attendance;

  const existingRecord = attendance.records?.[lrn];
  if (!existingRecord) {
    throw new Error("Student record not found in attendance session.");
  }

  if (existingRecord.status === nextStatus) {
    return;
  }

  const batch = writeBatch(db);
  const updatedAt = new Date();
  const monthKey = attendance.date.slice(0, 7);
  const currentStatus = existingRecord.status;
  const lastName = extractLastNameFromStudentName(existingRecord.studentName);
  const summaryId = buildStudentSummaryId(sectionSlug, lastName, lrn, attendance.schoolYear);
  const summaryRef = doc(db, "studentSummaries", summaryId);
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDoc] | [studentSummaries/{summaryId}] (teacher override)", { summaryId });
  const summarySnap = await getDoc(summaryRef);

  if (!summarySnap.exists()) {
    throw new Error("Student summary not found for this attendance record.");
  }

  const summary = summarySnap.data() as Omit<StudentSummary, "id">;
  const monthTrend = summary.trend?.[monthKey] ?? { present: 0, late: 0, absent: 0, excused: 0 };

  batch.update(attendanceRef, {
    [`records.${lrn}`]: {
      ...existingRecord,
      status: nextStatus,
      updatedAt,
      updatedByTeacherId: teacherId,
      updatedByTeacherName: teacherName,
    },
  });

  const flatRecordRef = doc(db, "attendanceRecords", `${attendance.date}_${sectionSlug}_${lrn}`);
  batch.update(flatRecordRef, {
    status: nextStatus,
    updatedAt,
    updatedByTeacherId: teacherId,
    updatedByTeacherName: teacherName,
    remarks: deleteField(),
  });

  batch.set(summaryRef, {
    present: Math.max(0, (summary.present ?? 0) + (nextStatus === "present" ? 1 : 0) - (currentStatus === "present" ? 1 : 0)),
    late: Math.max(0, (summary.late ?? 0) + (nextStatus === "late" ? 1 : 0) - (currentStatus === "late" ? 1 : 0)),
    absent: Math.max(0, (summary.absent ?? 0) + (nextStatus === "absent" ? 1 : 0) - (currentStatus === "absent" ? 1 : 0)),
    excused: Math.max(0, (summary.excused ?? 0) + (nextStatus === "excused" ? 1 : 0) - (currentStatus === "excused" ? 1 : 0)),
    trend: {
      ...summary.trend,
      [monthKey]: {
        present: Math.max(0, (monthTrend.present ?? 0) + (nextStatus === "present" ? 1 : 0) - (currentStatus === "present" ? 1 : 0)),
        late: Math.max(0, (monthTrend.late ?? 0) + (nextStatus === "late" ? 1 : 0) - (currentStatus === "late" ? 1 : 0)),
        absent: Math.max(0, (monthTrend.absent ?? 0) + (nextStatus === "absent" ? 1 : 0) - (currentStatus === "absent" ? 1 : 0)),
        excused: Math.max(0, (monthTrend.excused ?? 0) + (nextStatus === "excused" ? 1 : 0) - (currentStatus === "excused" ? 1 : 0)),
      },
    },
  }, { merge: true });

  await batch.commit();

  invalidateCache(`attendance_teacher_${attendance.teacherId}_${attendance.date}`);
  invalidateCache(`attendance_secretary_${attendance.secretaryUid}`);
  invalidateCache(`summaries_section_${attendance.sectionId}_${attendance.schoolYear}`);
  invalidateCache(`summary_${summaryId}`);
}

/**
 * Subscribe to real-time updates for an attendance session
 * Use this ONLY on the active attendance page
 */
/**
 * Get section slug from section ID
 * Helper function to construct the sectionSlug: {gradeLevel}-{sectionName}
 */
export async function getSectionSlug(sectionId: string): Promise<string | null> {
  const sectionRef = doc(db, "sections", sectionId);
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDoc] | [sections/{sectionId}] (get section slug)", { sectionId, sectionPath: sectionRef.path });
  const sectionSnap = await getDoc(sectionRef);

  if (sectionSnap.exists()) {
    const section = sectionSnap.data() as Section;
    console.log("✅ Section found:", { id: sectionId, gradeLevel: section.gradeLevel, sectionName: section.sectionName });
    const slug = buildSectionSlug(section.gradeLevel, section.sectionName);
    console.log("📋 Generated slug:", slug);
    return slug;
  }

  console.error("❌ Section not found:", sectionId);
  return null;
}

/**
 * Get secretary's attendance history with pagination
 * Loads sessions in chunks to reduce initial read cost
 * 
 * @param secretaryUid - The secretary's UID
 * @param limitCount - Number of sessions to fetch (default: 10)
 * @param lastVisibleDoc - Last document from previous page (for pagination)
 * @returns Object with sessions, lastVisible document, and hasMore flag
 */
export async function getSecretaryAttendanceHistoryPaginated(
  secretaryUid: string,
  limitCount: number = 10,
  offset: number = 0
): Promise<{ sessions: Attendance[]; nextOffset: number | null; hasMore: boolean }> {
  const accessibleSectionIds = await getAccessibleSectionIdsForSecretary(secretaryUid);
  const allSessions = await getAttendanceBySectionIds(accessibleSectionIds);
  const sessions = allSessions.slice(offset, offset + limitCount);
  const nextOffset = offset + limitCount < allSessions.length ? offset + limitCount : null;

  return {
    sessions,
    nextOffset,
    hasMore: nextOffset !== null,
  };
}

/**
 * Calculate attendance stats from records map
 * Returns counts for present, late, absent
 */
export function calculateAttendanceStats(
  records?: Record<string, AttendanceRecord>
): { present: number; late: number; absent: number; excused: number; total: number } {
  if (!records) {
    return { present: 0, late: 0, absent: 0, excused: 0, total: 0 };
  }

  const stats = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    total: Object.keys(records).length,
  };

  Object.values(records).forEach((record) => {
    if (record.status === "present") stats.present++;
    else if (record.status === "late") stats.late++;
    else if (record.status === "absent") stats.absent++;
    else if (record.status === "excused") stats.excused++;
  });

  return stats;
}

// ==================== Student Summary Functions ====================

/**
 * Get all student summaries for a section by querying sectionId and schoolYear
 * More efficient when you have all students from a section
 */
export async function getSectionSummariesBySection(
  sectionId: string,
  schoolYear: string,
  useCache = true
): Promise<StudentSummary[]> {
  const cacheKey = `summaries_section_${sectionId}_${schoolYear}`;

  if (useCache) {
    const cached = getCachedData<StudentSummary[]>(cacheKey);
    if (cached) return cached;
  }

  const summariesRef = collection(db, "studentSummaries");
  const q = query(
    summariesRef,
    where("sectionId", "==", sectionId),
    where("schoolYear", "==", schoolYear)
  );
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [studentSummaries] (sectionId + schoolYear filter)", { sectionId, schoolYear });
  const snapshot = await getDocs(q);

  const summaries = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as StudentSummary));

  if (useCache) {
    setCachedData(cacheKey, summaries);
  }

  return summaries;
}

/**
 * Get a single student's summary by deterministic document ID
 * Most efficient method when you know the student's details
 */
export async function getStudentSummaryById(
  sectionSlug: string,
  lastName: string,
  lrn: string,
  schoolYear: string,
  useCache = true
): Promise<StudentSummary | null> {
  const summaryId = `${sectionSlug}_${lastName.toUpperCase().replace(/\s+/g, '-')}_${lrn}_${schoolYear}`;
  const cacheKey = `summary_${summaryId}`;

  if (useCache) {
    const cached = getCachedData<StudentSummary>(cacheKey);
    if (cached) return cached;
  }

  const summaryRef = doc(db, "studentSummaries", summaryId);
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDoc] | [studentSummaries/{summaryId}]", { summaryId });
  const summarySnap = await getDoc(summaryRef);

  if (summarySnap.exists()) {
    const summary = {
      id: summarySnap.id,
      ...summarySnap.data()
    } as StudentSummary;

    if (useCache) {
      setCachedData(cacheKey, summary);
    }

    return summary;
  }

  return null;
}

/**
 * Get a single student's summary by LRN and section (when you don't know the lastName)
 */
export async function getStudentSummary(
  sectionId: string,
  lrn: string,
  schoolYear: string,
  useCache = true
): Promise<StudentSummary | null> {
  const cacheKey = `summary_${sectionId}_${lrn}_${schoolYear}`;

  if (useCache) {
    const cached = getCachedData<StudentSummary>(cacheKey);
    if (cached) return cached;
  }

  const summariesRef = collection(db, "studentSummaries");
  const q = query(
    summariesRef,
    where("sectionId", "==", sectionId),
    where("schoolYear", "==", schoolYear),
    where("lrn", "==", lrn)
  );
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [studentSummaries] (single student query)");
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const summary = {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  } as StudentSummary;

  if (useCache) {
    setCachedData(cacheKey, summary);
  }

  return summary;
}

/**
 * Calculate class-level analytics from student summaries
 * Returns aggregated statistics for the entire class
 */
export function calculateClassAnalytics(
  summaries: StudentSummary[]
): {
  totalStudents: number;
  averageAttendanceRate: number;
  perfectAttendance: number;
  atRiskStudents: number;
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  totalDays: number;
} {
  if (summaries.length === 0) {
    return {
      totalStudents: 0,
      averageAttendanceRate: 0,
      perfectAttendance: 0,
      atRiskStudents: 0,
      totalPresent: 0,
      totalLate: 0,
      totalAbsent: 0,
      totalDays: 0,
    };
  }

  let totalPresent = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalDays = 0;
  let perfectAttendanceCount = 0;
  let atRiskCount = 0;

  summaries.forEach((summary) => {
    // Defensive checks for undefined fields
    const present = summary.present ?? 0;
    const late = summary.late ?? 0;
    const absent = summary.absent ?? 0;
    const summaryTotalDays = summary.totalDays ?? 0;
    const excused = summary.excused ?? 0;
    const inferredTotalDays = present + late + absent + excused;
    const effectiveTotalDays = Math.max(summaryTotalDays, inferredTotalDays);

    totalPresent += present;
    totalLate += late;
    totalAbsent += absent;
    totalDays += effectiveTotalDays;

    const attendanceRate = effectiveTotalDays > 0
      ? ((present + late + excused) / effectiveTotalDays) * 100
      : 0;

    if (attendanceRate === 100 && effectiveTotalDays > 0) {
      perfectAttendanceCount++;
    }

    if (attendanceRate < 75 && effectiveTotalDays > 0) {
      atRiskCount++;
    }
  });

  const averageAttendanceRate = totalDays > 0
    ? ((totalPresent + totalLate) / totalDays) * 100
    : 0;

  return {
    totalStudents: summaries.length,
    averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100 || 0,
    perfectAttendance: perfectAttendanceCount,
    atRiskStudents: atRiskCount,
    totalPresent,
    totalLate,
    totalAbsent,
    totalDays,
  };
}

/**
 * Aggregate monthly trends from all student summaries
 * Returns month-by-month attendance statistics
 */
export function aggregateMonthlyTrends(
  summaries: StudentSummary[]
): Array<{
  month: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  attendanceRate: number;
}> {
  const monthMap = new Map<string, { present: number; late: number; absent: number; excused: number }>();

  // Aggregate all months from all students
  summaries.forEach((summary) => {
    Object.entries(summary.trend).forEach(([month, data]) => {
      // Defensive checks for undefined fields
      const present = data.present ?? 0;
      const late = data.late ?? 0;
      const absent = data.absent ?? 0;
      const excused = data.excused ?? 0;
      
      const existing = monthMap.get(month) || { present: 0, late: 0, absent: 0, excused: 0 };
      monthMap.set(month, {
        present: existing.present + present,
        late: existing.late + late,
        absent: existing.absent + absent,
        excused: existing.excused + excused,
      });
    });
  });

  // Convert to array and sort by month
  const trends = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      present: data.present,
      late: data.late,
      absent: data.absent,
      excused: data.excused,
      attendanceRate: data.present + data.late + data.absent + data.excused > 0
        ? Math.round(((data.present + data.late + data.excused) / (data.present + data.late + data.absent + data.excused)) * 100 * 100) / 100
        : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return trends;
}
