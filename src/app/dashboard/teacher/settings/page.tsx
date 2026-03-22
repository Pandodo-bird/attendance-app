"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { RoleGuard } from "@/hooks/useRequireRole";
import { useState } from "react";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="teacher">
        <SettingsContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function SettingsContent() {
  const { user, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      {/* Header */}
      <TeacherHeader
        title="Settings"
        stats={[
          { label: "ACCOUNT STATUS", value: "Active" },
          {
            label: "ROLE",
            value: "Teacher",
          },
        ]}
        searchPlaceholder="Search settings..."
        onSearch={(query) => setSearchQuery(query)}
      />

      {/* Content Canvas */}
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Content Area */}
        <div className="rounded-xl p-8" style={{ backgroundColor: "#FFFFFF" }}>
          <p className="text-center" style={{ color: "#9CA3AF" }}>
            Settings content coming soon...
          </p>
        </div>
      </div>
    </>
  );
}
