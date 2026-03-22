"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import SecretaryHeader from "@/components/SecretaryHeader";
import { RoleGuard } from "@/hooks/useRequireRole";
import { useState } from "react";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="secretary">
        <ProfileContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      {/* Header */}
      <SecretaryHeader
        title="Profile"
        stats={[
          { label: "ACCOUNT STATUS", value: "Active" },
          {
            label: "ROLE",
            value: "Secretary",
          },
        ]}
        searchPlaceholder="Search..."
        onSearch={(query) => setSearchQuery(query)}
      />

      {/* Content Canvas */}
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Content Area */}
        <div className="rounded-xl p-8" style={{ backgroundColor: "#FFFFFF" }}>
          <p className="text-center" style={{ color: "#9CA3AF" }}>
            Profile content coming soon...
          </p>
        </div>
      </div>
    </>
  );
}
