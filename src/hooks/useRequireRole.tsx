"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type UserRole = "teacher" | "secretary";

interface UseRequireRoleReturn {
  isLoading: boolean;
  hasAccess: boolean;
  userRole: UserRole | null;
}

/**
 * Hook to protect routes based on user role.
 * Checks the user's role from Firestore and redirects if they don't match.
 * 
 * @param requiredRole - The role required to access the protected route
 * @returns Object with loading state, access status, and user's role
 */
export function useRequireRole(requiredRole: UserRole): UseRequireRoleReturn {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // If no user is logged in, they'll be redirected by AuthGuard
      if (!user) {
        setIsLoading(false);
        return;
      }

      // If user profile is still loading, wait for it
      if (!userProfile) {
        setIsLoading(false);
        return;
      }

      // Get the user's role from Firestore profile
      const role = userProfile.role as UserRole;
      setUserRole(role);

      // Check if the user's role matches the required role
      if (role !== requiredRole) {
        // Redirect to the appropriate dashboard based on user's actual role
        if (role === "teacher") {
          router.push("/dashboard/teacher");
        } else if (role === "secretary") {
          router.push("/dashboard/secretary");
        } else {
          // If role is unknown, redirect to home/login
          router.push("/");
        }
        setHasAccess(false);
      } else {
        setHasAccess(true);
      }

      setIsLoading(false);
    };

    checkRole();
  }, [user, userProfile, authLoading, requiredRole, router]);

  return { isLoading, hasAccess, userRole };
}

/**
 * Component wrapper for role-based route protection.
 * Use this to wrap components that need role protection.
 */
export function RoleGuard({
  children,
  requiredRole,
  fallback,
}: {
  children: React.ReactNode;
  requiredRole: UserRole;
  fallback?: React.ReactNode;
}) {
  const { isLoading, hasAccess } = useRequireRole(requiredRole);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#F5F3FA" }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: "#6C5CE7", borderTopColor: "#e7deff" }}
          ></div>
          <p className="text-sm" style={{ color: "#484553" }}>
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess && fallback) {
    return <>{fallback}</>;
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
