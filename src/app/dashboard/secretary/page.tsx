"use client";

import AuthGuard from "@/components/AuthGuard";
import { RoleGuard } from "@/hooks/useRequireRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SecretaryPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="secretary">
        <SecretaryRedirect />
      </RoleGuard>
    </AuthGuard>
  );
}

function SecretaryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard/secretary/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
