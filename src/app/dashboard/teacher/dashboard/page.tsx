"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherSidebar from "@/components/TeacherSidebar";
import TeacherHeader from "@/components/TeacherHeader";

export default function TeacherDashboardPage() {
  return (
    <AuthGuard>
      <TeacherDashboardContent />
    </AuthGuard>
  );
}

function TeacherDashboardContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3FA' }}>
      <div className="flex min-h-screen">
        {/* Side Navigation Bar */}
        <TeacherSidebar />

        {/* Main Content Area */}
        <main className="flex-1 ml-64 min-h-screen flex flex-col">
          {/* Header */}
          <TeacherHeader
            title="Dashboard Overview"
            searchPlaceholder="Search students, classes..."
          />

          {/* Content Canvas */}
          <div className="p-8 space-y-12">
            {/* Quick Actions */}
            <div
              className="p-8 rounded-3xl shadow-sm"
              style={{ backgroundColor: '#F0EDF7' }}
            >
              <h4 className="text-2xl font-bold mb-6" style={{ color: '#1F1F1F' }}>Quick Actions</h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  className="p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm group"
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
                  <span className="text-xs font-bold" style={{ color: '#6B6B6B' }}>New Class</span>
                </button>
                <button
                  className="p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm group"
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
                  <span className="text-xs font-bold" style={{ color: '#6B6B6B' }}>Add Student</span>
                </button>
                <button
                  className="p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm group"
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
                  <span className="text-xs font-bold" style={{ color: '#6B6B6B' }}>Export PDF</span>
                </button>
                <button
                  className="p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm group"
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
                  <span className="text-xs font-bold" style={{ color: '#6B6B6B' }}>Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
