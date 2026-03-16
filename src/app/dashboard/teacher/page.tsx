"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherSidebar from "@/components/TeacherSidebar";

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
        <main className="flex-1 ml-64 p-8">
          {/* Top Header */}
          <header className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#1F1F1F' }}>Attendance Management</h2>
              <p className="mt-1" style={{ color: '#6B6B6B' }}>Curating your classroom efficiency.</p>
            </div>
            <div className="flex items-center gap-6">
              {/* Search Bar */}
              <div className="relative">
                <input
                  className="border-none rounded-full py-2.5 px-6 pl-12 w-80 text-sm focus:ring-2 focus:ring-[#6C5CE7] transition-all outline-none"
                  placeholder="Search students, classes..."
                  type="text"
                  style={{
                    backgroundColor: '#E5E7EB',
                    color: '#1F1F1F'
                  }}
                />
                <span
                  className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg"
                  style={{ color: '#9CA3AF' }}
                >
                  search
                </span>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                  style={{ color: '#6B6B6B' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span className="material-symbols-outlined">notifications</span>
                </button>
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
                  style={{ color: '#6B6B6B' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span className="material-symbols-outlined">help</span>
                </button>
              </div>
            </div>
          </header>

          {/* Hero Metrics - Bento Grid Layout */}
          <section className="grid grid-cols-12 gap-6 mb-12">
            {/* Total Classes */}
            <div
              className="col-span-12 lg:col-span-4 p-8 rounded-2xl flex flex-col justify-between h-64 relative overflow-hidden shadow-sm"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <div className="relative z-10">
                <span className="text-xs font-bold tracking-widest uppercase mb-4 block" style={{ color: '#6C5CE7' }}>
                  ACTIVE COURSES
                </span>
                <div className="text-5xl font-extrabold tracking-tight" style={{ color: '#1F1F1F' }}>12</div>
              </div>
              <div className="flex items-center gap-2 text-sm relative z-10" style={{ color: '#6B6B6B' }}>
                <span className="material-symbols-outlined" style={{ color: '#22C55E', fontVariationSettings: "'FILL' 1" }}>
                  trending_up
                </span>
                <span>2 new added this semester</span>
              </div>
              <div
                className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full blur-3xl"
                style={{ backgroundColor: 'rgba(108, 92, 231, 0.05)' }}
              ></div>
            </div>

            {/* Total Students */}
            <div
              className="col-span-12 lg:col-span-4 p-8 rounded-2xl flex flex-col justify-between h-64 text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6C5CE7, #5A4BD6)' }}
            >
              <div>
                <span className="text-xs font-bold opacity-80 tracking-widest uppercase mb-4 block">
                  TOTAL STUDENTS
                </span>
                <div className="text-5xl font-extrabold tracking-tight">348</div>
              </div>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <span className="material-symbols-outlined">groups</span>
                <span>Across all active sections</span>
              </div>
            </div>

            {/* Attendance Rate */}
            <div
              className="col-span-12 lg:col-span-4 p-8 rounded-2xl flex flex-col justify-between h-64 shadow-sm"
              style={{
                backgroundColor: '#FFFFFF',
                borderLeft: '4px solid #22C55E'
              }}
            >
              <div>
                <span className="text-xs font-bold tracking-widest uppercase mb-4 block" style={{ color: '#22C55E' }}>
                  TODAY'S ATTENDANCE
                </span>
                <div className="text-5xl font-extrabold tracking-tight" style={{ color: '#1F1F1F' }}>92.4%</div>
              </div>
              <div className="space-y-2">
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: '#F7F6FB' }}
                >
                  <div
                    className="h-full opacity-60"
                    style={{
                      width: '92.4%',
                      backgroundColor: '#22C55E'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-right font-medium" style={{ color: '#9CA3AF' }}>+1.2% from yesterday</p>
              </div>
            </div>
          </section>

          {/* Main Content Grid */}
          <div className="grid grid-cols-12 gap-8">
            {/* Recent Activity Section */}
            <section className="col-span-12 lg:col-span-8">
              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="text-2xl font-bold" style={{ color: '#1F1F1F' }}>Recent Activity</h3>
                <button
                  className="text-sm font-bold flex items-center gap-1 hover:underline"
                  style={{ color: '#6C5CE7' }}
                >
                  View All Reports
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
              <div
                className="rounded-3xl overflow-hidden p-2 shadow-sm"
                style={{ backgroundColor: '#F0EDF7' }}
              >
                <div className="space-y-1">
                  {/* Item 1 */}
                  <div
                    className="flex items-center justify-between p-5 rounded-2xl transition-all cursor-pointer"
                    style={{ backgroundColor: '#FFFFFF' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F7F6FB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#6C5CE7',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <span className="material-symbols-outlined">menu_book</span>
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: '#1F1F1F' }}>Advanced Physics Sec. B</p>
                        <p className="text-xs uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Attendance Marked</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: '#1F1F1F' }}>28/30 Present</p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>10:15 AM</p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div
                    className="flex items-center justify-between p-5 rounded-2xl transition-all cursor-pointer"
                    style={{ backgroundColor: '#FFFFFF' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F7F6FB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#6B6B6B',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <span className="material-symbols-outlined">person_add</span>
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: '#1F1F1F' }}>Marcus Thorne</p>
                        <p className="text-xs uppercase tracking-wider" style={{ color: '#9CA3AF' }}>New Student Enrolled</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="px-3 py-1 text-[10px] font-bold rounded-full"
                        style={{
                          backgroundColor: '#22C55E',
                          color: '#FFFFFF'
                        }}
                      >
                        NEW
                      </span>
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>9:00 AM</p>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div
                    className="flex items-center justify-between p-5 rounded-2xl transition-all cursor-pointer"
                    style={{ backgroundColor: '#FFFFFF' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F7F6FB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#EF4444',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <span className="material-symbols-outlined">warning</span>
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: '#1F1F1F' }}>Literature Survey</p>
                        <p className="text-xs uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Low Attendance Alert</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: '#EF4444' }}>65% Present</p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>Yesterday</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="col-span-12 lg:col-span-4">
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
            </section>
          </div>
        </main>
      </div>

      {/* Material Icons Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>
    </div>
  );
}
