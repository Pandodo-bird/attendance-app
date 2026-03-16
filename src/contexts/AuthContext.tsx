"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getUserProfile, UserData } from "@/lib/firestore";

interface AuthContextType {
  user: User | null;
  userProfile: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, role: "teacher" | "secretary") => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoized function to fetch user profile - avoids unnecessary re-fetches
  const fetchUserProfile = useCallback(async (uid: string) => {
    try {
      const profile = await getUserProfile(uid);
      setUserProfile(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Only fetch profile if not already loaded for this user
        setUserProfile((prevProfile) => {
          // Skip fetch if we already have a profile for this user
          if (prevProfile) {
            setLoading(false);
            return prevProfile;
          }
          // Fetch profile for new user
          fetchUserProfile(user.uid).finally(() => setLoading(false));
          return null; // Will be set when fetch completes
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  const signUp = async (email: string, password: string, displayName: string, role: "teacher" | "secretary") => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    await createUserProfile(userCredential.user.uid, role, displayName, email);
    // Profile will be loaded automatically by onAuthStateChanged
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    logout,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
