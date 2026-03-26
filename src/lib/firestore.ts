import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
  deleteDoc,
  writeBatch,
  FirestoreError,
  updateDoc,
  Unsubscribe,
  increment,
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
  subject: string;           // e.g. "Math", "Science"
  schoolYear: string;
  status: "active" | "removed";
  appointedAt: Date | Timestamp;
}

// ==================== Attendance Types ====================

export interface AttendanceRecord {
  studentName: string;
  status: "present" | "late" | "absent";
  remarks: string;
  timeRecorded: Date | Timestamp;
}

export interface Attendance {
  id: string;
  appointmentId: string;     // links to appointments/{appointmentId}
  sectionId: string;
  teacherId: string;
  secretaryUid: string;
  secretaryLrn: string;
  subject: string;
  date: string;              // "2025-03-17"
  schoolYear: string;
  status: "open" | "locked";
  records?: Record<string, AttendanceRecord>;  // Map for live view only
  createdAt: Date | Timestamp;
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
  trend: Record<string, { present: number; late: number; absent: number }>;
}

// ==================== Cache Implementation ====================
// In-memory cache to reduce Firestore reads for frequently accessed data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache TTL for queries

export function getCachedData<T>(key: string): T | null {
  const entry = queryCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  queryCache.delete(key);
  return null;
}

export function setCachedData<T>(key: string, data: T): void {
  queryCache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(pattern: string): void {
  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
}

/**
 * Export function to clear all caches (useful for testing or manual refresh)
 */
export function clearAllCaches(): void {
  queryCache.clear();
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
 * Get count of active sections for a teacher (lightweight query)
 */
export async function getTeacherSectionCount(
  teacherId: string,
  useCache = true
): Promise<number> {
  const cacheKey = `sections_count_${teacherId}`;

  if (useCache) {
    const cached = getCachedData<number>(cacheKey);
    if (cached !== null) return cached;
  }

  const sectionsRef = collection(db, "sections");
  const q = query(sectionsRef, where("teacherId", "==", teacherId), where("status", "==", "active"));
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [sections] (teacherId + status filter)");
  const snapshot = await getDocs(q);

  if (useCache) {
    setCachedData(cacheKey, snapshot.size);
  }

  return snapshot.size;
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
 * Subscribe to real-time updates for teacher's sections
 */
export function subscribeToSections(
  teacherId: string,
  callback: (sections: Section[]) => void,
  errorCallback?: (error: FirestoreError) => void
): Unsubscribe {
  const sectionsRef = collection(db, "sections");
  const q = query(sectionsRef, where("teacherId", "==", teacherId));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      console.log("🔥 FIRESTORE | [firestore.ts] | [onSnapshot] | [sections] (teacherId filter)");
      const sections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Section));

      setCachedData(`sections_${teacherId}`, sections);
      callback(sections);
    },
    (error) => {
      errorCallback?.(error as FirestoreError);
    }
  );

  return unsubscribe;
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
  const allStudents: { sectionId: string; sectionName: string; gradeLevel: string; student: Student }[] = [];

  for (const section of sections) {
    if (section.status === 'active') {
      const students = await getSectionStudents(section.id, useCache);
      for (const student of students) {
        if (student.studentStatus === 'active') {
          allStudents.push({
            sectionId: section.id,
            sectionName: section.sectionName,
            gradeLevel: section.gradeLevel,
            student
          });
        }
      }
    }
  }

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
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserData | null> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email));
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [users] (email filter)");
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return snapshot.docs[0].data() as UserData;
  }

  return null;
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
 * Subscribe to real-time updates for students in a section
 */
export function subscribeToSectionStudents(
  sectionId: string,
  callback: (students: Student[]) => void,
  errorCallback?: (error: FirestoreError) => void
): Unsubscribe {
  const studentsRef = collection(db, `sections/${sectionId}/students`);

  const unsubscribe = onSnapshot(
    studentsRef,
    (snapshot) => {
      console.log("🔥 FIRESTORE | [firestore.ts] | [onSnapshot] | [sections/{sectionId}/students]");
      const students = snapshot.docs.map(doc => ({
        lrn: doc.id,
        ...doc.data()
      } as Student));

      setCachedData(`students_${sectionId}`, students);
      callback(students);
    },
    (error) => {
      errorCallback?.(error as FirestoreError);
    }
  );

  return unsubscribe;
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
export function subscribeToTeacherAppointments(
  teacherId: string,
  callback: (appointments: Appointment[]) => void,
  errorCallback?: (error: FirestoreError) => void
): Unsubscribe {
  const appointmentsRef = collection(db, "appointments");
  const q = query(appointmentsRef, where("teacherId", "==", teacherId));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      console.log("🔥 FIRESTORE | [firestore.ts] | [onSnapshot] | [appointments] (teacherId filter)");
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Appointment));

      setCachedData(`appointments_teacher_${teacherId}`, appointments);
      callback(appointments);
    },
    (error) => {
      errorCallback?.(error as FirestoreError);
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to real-time updates for secretary's active appointments
 */
export function subscribeToSecretaryAppointments(
  secretaryUid: string,
  callback: (appointments: Appointment[]) => void,
  errorCallback?: (error: FirestoreError) => void
): Unsubscribe {
  const appointmentsRef = collection(db, "appointments");
  const q = query(
    appointmentsRef,
    where("secretaryUid", "==", secretaryUid),
    where("status", "==", "active")
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      console.log("🔥 FIRESTORE | [firestore.ts] | [onSnapshot] | [appointments] (secretaryUid + status filter)");
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Appointment));

      setCachedData(`appointments_secretary_${secretaryUid}`, appointments);
      callback(appointments);
    },
    (error) => {
      errorCallback?.(error as FirestoreError);
    }
  );

  return unsubscribe;
}

/**
 * Create a new appointment (appoint a secretary)
 */
export async function createAppointment(
  teacherId: string,
  secretaryUid: string,
  secretaryLrn: string,
  sectionId: string,
  subject: string,
  schoolYear: string
): Promise<string> {
  const appointmentRef = doc(collection(db, "appointments"));
  
  const appointmentData: Appointment = {
    id: appointmentRef.id,
    secretaryUid,
    secretaryLrn,
    teacherId,
    sectionId,
    subject,
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

  const attendanceRef = collection(db, "attendance");
  const q = query(attendanceRef, where("secretaryUid", "==", secretaryUid));
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [attendance] (secretaryUid filter)");
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
export async function getAttendanceByAppointment(
  appointmentId: string,
  date: string
): Promise<Attendance | null> {
  const attendanceRef = collection(db, "attendance");
  const q = query(
    attendanceRef,
    where("appointmentId", "==", appointmentId),
    where("date", "==", date)
  );
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [attendance] (appointmentId + date filter)");
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as Attendance;
}

/**
 * Get student attendance records from attendance/{id}/records subcollection
 */
export async function getAttendanceRecords(
  attendanceId: string
): Promise<Record<string, AttendanceRecord>> {
  const recordsRef = collection(db, `attendance/${attendanceId}/records`);
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [attendance/{attendanceId}/records]");
  const snapshot = await getDocs(recordsRef);

  const records: Record<string, AttendanceRecord> = {};
  snapshot.docs.forEach((doc) => {
    records[doc.id] = doc.data() as AttendanceRecord;
  });

  return records;
}

// ==================== Attendance Session Functions (Secretary) ====================

/**
 * Check if an attendance session already exists for the given appointment and date
 * Uses the deterministic document ID pattern: {date}_{sectionSlug}_{subject}_{secretaryLrn}
 */
export async function checkExistingSession(
  appointment: Appointment,
  sectionSlug: string,
  date: string
): Promise<Attendance | null> {
  const attendanceId = `${date}_${sectionSlug}_${appointment.subject.replace(/\s+/g, '-')}_${appointment.secretaryLrn}`;
  const attendanceRef = doc(db, "attendance", attendanceId);
  
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDoc] | [attendance/{attendanceId}] (check existing session)");
  const attendanceSnap = await getDoc(attendanceRef);

  if (attendanceSnap.exists()) {
    return {
      id: attendanceSnap.id,
      ...attendanceSnap.data()
    } as Attendance;
  }

  return null;
}

/**
 * Start an attendance session by creating the attendance/{id} document
 * This marks the commencement of attendance record for the day
 */
export async function startAttendanceSession(
  appointment: Appointment,
  sectionSlug: string,
  date: string,
  schoolYear: string
): Promise<string> {
  const attendanceId = `${date}_${sectionSlug}_${appointment.subject.replace(/\s+/g, '-')}_${appointment.secretaryLrn}`;
  const attendanceRef = doc(db, "attendance", attendanceId);

  const attendanceData: Omit<Attendance, "id" | "createdAt"> = {
    appointmentId: appointment.id,
    sectionId: appointment.sectionId,
    teacherId: appointment.teacherId,
    secretaryUid: appointment.secretaryUid,
    secretaryLrn: appointment.secretaryLrn,
    subject: appointment.subject,
    date,
    schoolYear,
    status: "open",
    records: {},
  };

  await setDoc(attendanceRef, {
    ...attendanceData,
    createdAt: new Date(),
  });

  console.log("✅ Attendance session started:", attendanceId);
  return attendanceId;
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
  appointment: Appointment,
  sectionSlug: string,
  date: string,
  schoolYear: string,
  students: Array<{
    lrn: string;
    studentName: string;
    lastName: string;
    status: "present" | "late" | "absent";
    remarks: string;
  }>
): Promise<void> {
  const batch = writeBatch(db);
  const monthKey = date.slice(0, 7); // "YYYY-MM"

  // 1. Update attendance session header with records map and lock it
  const attendanceRef = doc(db, "attendance", attendanceId);
  const recordsMap: Record<string, AttendanceRecord> = {};
  
  students.forEach((student) => {
    recordsMap[student.lrn] = {
      studentName: student.studentName,
      status: student.status,
      remarks: student.remarks,
      timeRecorded: new Date(),
    };
  });

  batch.update(attendanceRef, {
    records: recordsMap,
    status: "locked",
  });

  // 2. Create flat attendance records (audit log)
  students.forEach((student) => {
    const recordId = `${date}_${sectionSlug}_${student.lrn}`;
    const recordRef = doc(db, "attendanceRecords", recordId);
    
    batch.set(recordRef, {
      attendanceId,
      teacherId: appointment.teacherId,
      lrn: student.lrn,
      sectionId: appointment.sectionId,
      subject: appointment.subject,
      date,
      schoolYear,
      status: student.status,
      remarks: student.remarks,
      timeRecorded: new Date(),
    });
  });

  // 3. Upsert student summaries (running totals)
  students.forEach((student) => {
    const summaryId = `${sectionSlug}_${student.lastName.toUpperCase().replace(/\s+/g, '-')}_${student.lrn}_${schoolYear}`;
    const summaryRef = doc(db, "studentSummaries", summaryId);
    
    // Use set with merge to upsert
    batch.set(summaryRef, {
      lrn: student.lrn,
      sectionId: appointment.sectionId,
      schoolYear,
      totalDays: 1,
      [student.status]: 1,
      trend: {
        [monthKey]: {
          [student.status]: 1,
        },
      },
    }, { merge: true });
  });

  await batch.commit();
  console.log("✅ Full attendance submitted:", attendanceId);
  
  // Invalidate caches
  invalidateCache(`attendance_secretary_${appointment.secretaryUid}`);
  invalidateCache(`attendance_teacher_${appointment.teacherId}_${date}`);
}

/**
 * Subscribe to real-time updates for an attendance session
 * Use this ONLY on the active attendance page
 */
export function subscribeToAttendanceSession(
  attendanceId: string,
  callback: (attendance: Attendance | null) => void,
  errorCallback?: (error: FirestoreError) => void
): Unsubscribe {
  const attendanceRef = doc(db, "attendance", attendanceId);

  const unsubscribe = onSnapshot(
    attendanceRef,
    (doc) => {
      console.log("🔥 FIRESTORE | [firestore.ts] | [onSnapshot] | [attendance/{attendanceId}]");
      if (doc.exists()) {
        callback({
          id: doc.id,
          ...doc.data()
        } as Attendance);
      } else {
        callback(null);
      }
    },
    (error) => {
      errorCallback?.(error as FirestoreError);
    }
  );

  return unsubscribe;
}

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
    const slug = `${section.gradeLevel}-${section.sectionName.replace(/\s+/g, '-')}`;
    console.log("📋 Generated slug:", slug);
    return slug;
  }

  console.error("❌ Section not found:", sectionId);
  return null;
}
