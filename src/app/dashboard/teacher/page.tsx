"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";

export default function TeacherDashboardPage() {
  return (
    <AuthGuard>
      <TeacherDashboardContent />
    </AuthGuard>
  );
}

function TeacherDashboardContent() {
  const { user, userProfile, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const theme = {
    gradient: "from-purple-500 to-fuchsia-600",
    lightBg: "from-purple-50 via-fuchsia-50 to-pink-50",
    border: "border-purple-200",
    bg: "bg-purple-50",
    text: "text-purple-800",
    darkBg: "dark:bg-purple-900/30",
    darkBorder: "dark:border-purple-700",
    darkText: "dark:text-purple-300",
  };

  return (
    <div className={`min-h-screen bg-linear-to-br ${theme.lightBg} dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-colors duration-300`}>
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-gray-700"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center shadow-lg`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Attendance System</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userProfile?.role || "User"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 text-right">
                <p className="font-medium">{user?.displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-linear-to-r from-red-500 to-rose-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-rose-700 transition text-sm font-medium shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 mb-8 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${theme.gradient} flex items-center justify-center shadow-lg`}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.displayName?.split(" ")[0] || "User"}!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage your classes, students, and track attendance
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>My Sections</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Create and manage your class sections and schedules</p>
            <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
              Manage Sections
            </button>
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Students</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Add and manage students in your sections</p>
            <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
              View Students
            </button>
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Take Attendance</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Mark daily attendance for your classes</p>
            <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
              Start Attendance
            </button>
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Reports</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">View attendance summaries and analytics</p>
            <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
              View Reports
            </button>
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Schedule</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">View and manage your class schedule</p>
            <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
              View Schedule
            </button>
          </div>

          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Settings</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Manage your account settings and preferences</p>
            <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
              Open Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
