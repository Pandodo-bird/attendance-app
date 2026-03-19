"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/hooks/useRequireRole";

export default function TeacherDashboardPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="teacher">
        <TeacherDashboardContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function TeacherDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <>
      {/* Header */}
      <TeacherHeader
        title="Dashboard Overview"
        searchPlaceholder="Search students, classes..."
      />

      {/* Content Canvas */}
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-12">
            {/* Quick Actions */}
            <div
              className="p-4 lg:p-8 rounded-3xl shadow-sm"
              style={{ backgroundColor: '#F0EDF7' }}
            >
              <h4 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6" style={{ color: '#1F1F1F' }}>Quick Actions</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <button
                  onClick={() => router.push('/dashboard/teacher/sections')}
                  className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm group"
                  style={{ backgroundColor: '#FFFFFF' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F7F6FB';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span
                    className="material-symbols-outlined group-hover:scale-110 transition-transform"
                    style={{ color: '#6C5CE7' }}
                  >
                    add_box
                  </span>
                  <span className="text-xs font-bold text-center" style={{ color: '#6B6B6B' }}>New Section</span>
                </button>
                <button
                  className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm group"
                  style={{ backgroundColor: '#FFFFFF' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F7F6FB';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span
                    className="material-symbols-outlined group-hover:scale-110 transition-transform"
                    style={{ color: '#6C5CE7' }}
                  >
                    people_alt
                  </span>
                  <span className="text-xs font-bold text-center" style={{ color: '#6B6B6B' }}>Add Student</span>
                </button>
                <button
                  className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm group"
                  style={{ backgroundColor: '#FFFFFF' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F7F6FB';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span
                    className="material-symbols-outlined group-hover:scale-110 transition-transform"
                    style={{ color: '#6C5CE7' }}
                  >
                    description
                  </span>
                  <span className="text-xs font-bold text-center" style={{ color: '#6B6B6B' }}>Export PDF</span>
                </button>
                <button
                  className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm group"
                  style={{ backgroundColor: '#FFFFFF' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F7F6FB';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span
                    className="material-symbols-outlined group-hover:scale-110 transition-transform"
                    style={{ color: '#6C5CE7' }}
                  >
                    calendar_today
                  </span>
                  <span className="text-xs font-bold text-center" style={{ color: '#6B6B6B' }}>Schedule</span>
                </button>
              </div>
            </div>
          </div>
    </>
  );
}
