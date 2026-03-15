"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardRedirect />
    </AuthGuard>
  );
}

function DashboardRedirect() {
  const { userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userProfile?.role === "teacher") {
      router.push("/dashboard/teacher");
    } else {
      router.push("/dashboard/secretary");
    }
  }, [userProfile, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
