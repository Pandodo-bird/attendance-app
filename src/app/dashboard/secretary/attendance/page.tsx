"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import SecretaryHeader from "@/components/SecretaryHeader";
import { RoleGuard } from "@/hooks/useRequireRole";
import { useState } from "react";

export default function AttendancePage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="secretary">
        <AttendanceContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function AttendanceContent() {
  const { user, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      {/* Header */}
      <SecretaryHeader
        title="Record Attendance"
        stats={[
          { label: "TOTAL RECORDS", value: 0 },
          {
            label: "TODAY'S ATTENDANCE",
            value: 0,
          },
        ]}
        searchPlaceholder="Search students..."
        onSearch={(query) => setSearchQuery(query)}
      />

      {/* Content Canvas */}
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Content Area */}
        <div className="rounded-xl p-8" style={{ backgroundColor: "#FFFFFF" }}>
          <p className="text-center" style={{ color: "#9CA3AF" }}>
            Attendance recording content coming soon...
          </p>
        </div>
      </div>
    </>
  );
}
