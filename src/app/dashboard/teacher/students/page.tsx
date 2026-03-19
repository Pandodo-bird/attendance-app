"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { RoleGuard } from "@/hooks/useRequireRole";
import { useState } from "react";

export default function StudentsPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="teacher">
        <StudentsContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function StudentsContent() {
  const { user, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      {/* Header */}
      <TeacherHeader
        title="Students"
        stats={[
          { label: "TOTAL STUDENTS", value: 0 },
          {
            label: "ACTIVE SECTIONS",
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
            Students content coming soon...
          </p>
        </div>
      </div>
    </>
  );
}
