import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export interface TeacherData {
  role: "teacher";
  displayName: string;
  email: string;
  createdAt: Date;
  sections?: string[];
  subjects?: string[];
}

export interface SecretaryData {
  role: "secretary";
  displayName: string;
  email: string;
  createdAt: Date;
  assignedSections?: string[];
}

export type UserData = TeacherData | SecretaryData;

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
