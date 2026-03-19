'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
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

// In-memory cache for user profiles to reduce Firestore reads
const profileCache = new Map<string, { data: UserData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  // Track the current user ID to detect user changes
  const currentUserIdRef = useRef<string | null>(null);

  // Memoized function to fetch user profile with caching - avoids unnecessary re-fetches
  const fetchUserProfile = useCallback(async (uid: string, forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      const cached = profileCache.get(uid);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setUserProfile(cached.data);
        setLoading(false);
        return;
      }
    }
    
    try {
      const profile = await getUserProfile(uid);
      // Update cache
      if (profile) {
        profileCache.set(uid, { data: profile, timestamp: Date.now() });
      }
      setUserProfile(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const previousUserId = currentUserIdRef.current;
      setUser(user);
      
      if (user) {
        // Only fetch profile if this is a different user or force refresh needed
        if (previousUserId !== user.uid) {
          currentUserIdRef.current = user.uid;
          // Clear old user's profile and fetch new one
          setUserProfile(null);
          fetchUserProfile(user.uid).finally(() => setLoading(false));
        } else {
          // Same user, keep existing profile if available
          setLoading(false);
        }
      } else {
        currentUserIdRef.current = null;
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

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

  // Generate a secure random password
  const generateSecurePassword = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    // First char should be a letter
    password += chars.charAt(Math.floor(Math.random() * 52));
    // Rest of the password (11 more characters = 12 total)
    for (let i = 0; i < 11; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
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
    await signOut(auth);
  };

  const refreshUserProfile = async () => {
    if (user) {
      // Force refresh by bypassing cache
      await fetchUserProfile(user.uid, true);
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
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
