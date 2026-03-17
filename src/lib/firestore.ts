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
  limit,
  startAfter,
  writeBatch,
  QueryDocumentSnapshot,
  orderBy,
  FirestoreError,
  addDoc,
  updateDoc,
  Unsubscribe
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
  createdAt: Date | Timestamp;
}

// ==================== Student Types (in sections/{id}/students) ====================

export interface Student {
  lrn: string;
  lastName: string;
  firstName: string;
  middleName: string;
  sex: "male" | "female";
  birthDate: Date | Timestamp | string;
  religion: string;
  address: string;
  parentFather: string;
  parentMother: string;
  guardian: string;
  learningModality: string;
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
  subject: string;
  date: string;              // "2025-03-17"
  schoolYear: string;
  records?: Record<string, AttendanceRecord>;  // Subcollection: records/{lrn}
}

// ==================== Cache Implementation ====================
// In-memory cache to reduce Firestore reads for frequently accessed data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache TTL for queries

function getCachedData<T>(key: string): T | null {
  const entry = queryCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  queryCache.delete(key);
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  queryCache.set(key, { data, timestamp: Date.now() });
}

function invalidateCache(pattern: string): void {
  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
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
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserData;
  }

  return null;
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
    createdAt: new Date(),
  };

  await setDoc(sectionRef, sectionData);
  invalidateCache(`sections_${teacherId}`);

  return sectionRef.id;
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
  
  const studentData: Student = {
    ...student,
    createdAt: new Date(),
  };

  await setDoc(studentRef, studentData);
  invalidateCache(`students_${sectionId}`);
}

/**
 * Update student information
 */
export async function updateStudent(
  sectionId: string,
  lrn: string,
  updates: Partial<Student>
): Promise<void> {
  const studentRef = doc(db, `sections/${sectionId}/students`, lrn);
  await updateDoc(studentRef, updates);
  invalidateCache(`students_${sectionId}`);
}

/**
 * Delete a student from a section
 */
export async function deleteStudent(
  sectionId: string,
  lrn: string
): Promise<void> {
  const studentRef = doc(db, `sections/${sectionId}/students`, lrn);
  await deleteDoc(studentRef);
  invalidateCache(`students_${sectionId}`);
}

/**
 * Batch import students to a section
 */
export async function importStudentsBatch(
  sectionId: string,
  students: Array<Omit<Student, "createdAt">>
): Promise<void> {
  const batch = writeBatch(db);

  students.forEach((student) => {
    const studentRef = doc(db, `sections/${sectionId}/students`, student.lrn);
    batch.set(studentRef, {
      ...student,
      createdAt: new Date(),
    });
  });

  await batch.commit();
  invalidateCache(`students_${sectionId}`);
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
 */
export async function submitAttendance(
  appointmentId: string,
  sectionId: string,
  teacherId: string,
  secretaryUid: string,
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
  
  const attendanceData: Omit<Attendance, "id"> = {
    appointmentId,
    sectionId,
    teacherId,
    secretaryUid,
    subject,
    date,
    schoolYear,
  };

  batch.set(attendanceRef, attendanceData);

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
  const snapshot = await getDocs(recordsRef);

  const records: Record<string, AttendanceRecord> = {};
  snapshot.docs.forEach((doc) => {
    records[doc.id] = doc.data() as AttendanceRecord;
  });

  return records;
}

// ==================== Utility Functions ====================

/**
 * Export function to clear all caches (useful for testing or manual refresh)
 */
export function clearAllCaches(): void {
  queryCache.clear();
}
