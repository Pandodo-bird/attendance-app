"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherSidebar from "@/components/TeacherSidebar";
import TeacherHeader from "@/components/TeacherHeader";
import { useState } from "react";
import { ImportModal, StudentData } from "@/components/section";

export default function TeacherDashboardPage() {
  return (
    <AuthGuard>
      <TeacherDashboardContent />
    </AuthGuard>
  );
}

function TeacherDashboardContent() {
  const { user } = useAuth();
  const [showImportModal, setShowImportModal] = useState(false);

  const handleOpenModal = () => {
    setShowImportModal(true);
  };

  const handleCloseModal = () => {
    setShowImportModal(false);
  };

  const handleSave = (sectionName: string, gradeLevel: string, students: StudentData[]) => {
    // TODO: Add Firestore storage function
    console.log('Grade Level:', gradeLevel);
    console.log('Section Name:', sectionName);
    console.log('Students to save:', students);
    // Will implement Firestore save in next step
    handleCloseModal();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3FA' }}>
      <div className="flex min-h-screen">
        {/* Side Navigation Bar */}
        <TeacherSidebar />

        {/* Main Content Area */}
        <main className="flex-1 ml-0 lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
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
                  onClick={handleOpenModal}
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
        </main>
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </div>
  );
}
