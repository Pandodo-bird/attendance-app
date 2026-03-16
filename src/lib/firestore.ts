import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot, Timestamp, deleteDoc } from "firebase/firestore";

export interface TeacherData {
  role: "teacher";
  displayName: string;
  email: string;
  createdAt: Date | Timestamp;
  sections?: string[];
  subjects?: string[];
}

export interface SecretaryData {
  role: "secretary";
  displayName: string;
  email: string;
  createdAt: Date | Timestamp;
  assignedSections?: string[];
}

export type UserData = TeacherData | SecretaryData;

export interface Secretary {
  id: string;
  userId: string;
  teacherId: string;
  displayName: string;
  email: string;
  status: "active" | "inactive";
  role: string;
  createdAt: Date | Timestamp;
  lastActive?: Date | Timestamp;
}

export interface Section {
  id: string;
  teacherId: string;
  name: string;
  gradeLevel: string;
  status: "ACTIVE" | "ACTION_REQ" | "INACTIVE";
  attendanceRate: number;
  schedule: string;
  studentIds: string[];
  totalStudents: number;
  createdAt: Date | Timestamp;
}

export async function createUserProfile(
  uid: string,
  role: "teacher" | "secretary",
  displayName: string,
  email: string
): Promise<void> {
  const userRef = doc(db, "users", uid);

  const userData: UserData = {
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

// ==================== Secretary Functions ====================

/**
 * Get all secretaries for a teacher
 * Optimized: Single query, no unnecessary reads
 */
export async function getTeacherSecretaries(teacherId: string): Promise<Secretary[]> {
  const secretariesRef = collection(db, "secretaries");
  const q = query(secretariesRef, where("teacherId", "==", teacherId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Secretary));
}

/**
 * Subscribe to real-time updates for teacher's secretaries
 * Optimized: Uses onSnapshot for real-time updates, prevents repeated reads
 */
export function subscribeToSecretaries(
  teacherId: string,
  callback: (secretaries: Secretary[]) => void,
  errorCallback?: (error: Error) => void
) {
  const secretariesRef = collection(db, "secretaries");
  const q = query(secretariesRef, where("teacherId", "==", teacherId));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const secretaries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Secretary));
      callback(secretaries);
    },
    (error) => {
      // Pass error to callback if provided
      errorCallback?.(error as Error);
    }
  );

  return unsubscribe;
}

/**
 * Add a new secretary
 * Optimized: Single write operation
 */
export async function createSecretary(
  teacherId: string,
  userId: string,
  displayName: string,
  email: string,
  role: string
): Promise<string> {
  const secretaryRef = doc(collection(db, "secretaries"));
  const secretaryData: Omit<Secretary, "id"> = {
    teacherId,
    userId,
    displayName,
    email,
    status: "active",
    role,
    createdAt: new Date(),
  };
  
  await setDoc(secretaryRef, secretaryData);
  return secretaryRef.id;
}

/**
 * Update secretary status
 * Optimized: Updates only the changed field
 */
export async function updateSecretaryStatus(
  secretaryId: string,
  status: "active" | "inactive"
): Promise<void> {
  const secretaryRef = doc(db, "secretaries", secretaryId);
  await setDoc(secretaryRef, { status }, { merge: true });
}

/**
 * Delete a secretary
 */
export async function deleteSecretary(secretaryId: string): Promise<void> {
  const secretaryRef = doc(db, "secretaries", secretaryId);
  await deleteDoc(secretaryRef);
}

// ==================== Section Functions ====================

/**
 * Get all sections for a teacher
 * Optimized: Single query with where clause
 */
export async function getTeacherSections(teacherId: string): Promise<Section[]> {
  const sectionsRef = collection(db, "sections");
  const q = query(sectionsRef, where("teacherId", "==", teacherId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Section));
}

/**
 * Subscribe to real-time updates for teacher's sections
 * Optimized: Uses onSnapshot for real-time updates, prevents repeated reads
 */
export function subscribeToSections(
  teacherId: string,
  callback: (sections: Section[]) => void
) {
  const sectionsRef = collection(db, "sections");
  const q = query(sectionsRef, where("teacherId", "==", teacherId));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const sections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Section));
    callback(sections);
  });
  
  return unsubscribe;
}
