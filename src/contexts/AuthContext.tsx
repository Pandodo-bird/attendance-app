'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { createUserProfile, getUserProfile, UserData } from "../lib/firestore";
import { clearQueueUiForUser } from "@/lib/offlineQueue";
import { stopSecretarySync } from "@/lib/syncManager";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  userProfile: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, role: "teacher" | "secretary", lrn?: string) => Promise<void>;
  createSecretaryAccount: (displayName: string, email: string, password: string) => Promise<{ email: string; password: string }>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OFFLINE_AUTH_USER_KEY = "offline-auth-user";
const OFFLINE_AUTH_PROFILE_KEY = "offline-auth-profile";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineUser, setOfflineUser] = useState<User | null>(null);
  const [offlineProfile, setOfflineProfile] = useState<UserData | null>(null);
  const queryClient = useQueryClient();
  // Track the current user ID to detect user changes
  const currentUserIdRef = useRef<string | null>(null);

  // Use TanStack Query for user profile with caching (30 min - rarely changes)
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile", user?.uid],
    queryFn: () => getUserProfile(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000, // 30 minutes - user profile rarely changes
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedUser = window.localStorage.getItem(OFFLINE_AUTH_USER_KEY);
    const storedProfile = window.localStorage.getItem(OFFLINE_AUTH_PROFILE_KEY);

    if (storedUser) {
      setOfflineUser(JSON.parse(storedUser) as User);
    }

    if (storedProfile) {
      setOfflineProfile(JSON.parse(storedProfile) as UserData);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (user) {
      window.localStorage.setItem(
        OFFLINE_AUTH_USER_KEY,
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        }),
      );
      setOfflineUser(user);
      return;
    }

    if (window.navigator.onLine) {
      window.localStorage.removeItem(OFFLINE_AUTH_USER_KEY);
      setOfflineUser(null);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (userProfile) {
      window.localStorage.setItem(OFFLINE_AUTH_PROFILE_KEY, JSON.stringify(userProfile));
      setOfflineProfile(userProfile);
      return;
    }

    if (window.navigator.onLine && !user) {
      window.localStorage.removeItem(OFFLINE_AUTH_PROFILE_KEY);
      setOfflineProfile(null);
    }
  }, [user, userProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const previousUserId = currentUserIdRef.current;
      setUser(user);

      if (user) {
        // Only set loading if this is a different user
        if (previousUserId !== user.uid) {
          currentUserIdRef.current = user.uid;
          setLoading(true);
        }
      } else {
        currentUserIdRef.current = null;
      }
      
      // Loading will be handled by the query
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Create a secretary account using server-side API (keeps current user logged in)
  const createSecretaryAccount = async (
    displayName: string,
    email: string,
    password: string
  ) => {
    // Extract LRN from email (format: LRN@app.local)
    const lrn = email.split('@')[0];
    
    try {
      console.log("Creating secretary via API...");
      
      const response = await fetch('/api/create-secretary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName,
          email,
          password,
          lrn,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create secretary account');
      }
      
      console.log("Secretary created successfully via API:", data.userId);
      
      return { email, password };
    } catch (error) {
      console.error("Error in createSecretaryAccount:", error);
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: "teacher" | "secretary",
    lrn?: string  // Only for secretaries
  ) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    await createUserProfile(userCredential.user.uid, role, displayName, email, lrn);
    // Profile will be loaded automatically by onAuthStateChanged
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (user?.uid) {
      await stopSecretarySync(user.uid);
      await clearQueueUiForUser(user.uid);
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(OFFLINE_AUTH_USER_KEY);
      window.localStorage.removeItem(OFFLINE_AUTH_PROFILE_KEY);
    }
    setOfflineUser(null);
    setOfflineProfile(null);

    // Clear query cache for user profile
    queryClient.removeQueries({ queryKey: ["userProfile"] });
    currentUserIdRef.current = null;
    await signOut(auth);
  };

  const refreshUserProfile = async () => {
    if (user) {
      // Force refresh by invalidating the query
      await queryClient.invalidateQueries({ queryKey: ["userProfile", user.uid] });
    }
  };

  const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
  const effectiveUser = user ?? (isOffline ? offlineUser : null);
  const effectiveUserProfile = userProfile ?? (isOffline ? offlineProfile : null);

  const value: AuthContextType = {
    user: effectiveUser,
    userProfile: effectiveUserProfile,
    loading,
    signUp,
    createSecretaryAccount,
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
