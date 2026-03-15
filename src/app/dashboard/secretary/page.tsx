"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";
import SecretarySidebar from "@/components/SecretarySidebar";

export default function SecretaryDashboardPage() {
  return (
    <AuthGuard>
      <SecretaryDashboardContent />
    </AuthGuard>
  );
}

function SecretaryDashboardContent() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const theme = {
    gradient: "from-orange-500 to-rose-500",
    lightBg: "from-orange-50 via-rose-50 to-pink-50",
    border: "border-orange-200",
    bg: "bg-orange-50",
    text: "text-orange-800",
    darkBg: "dark:bg-orange-900/30",
    darkBorder: "dark:border-orange-700",
    darkText: "dark:text-orange-300",
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <SecretarySidebar activeItem="dashboard" />
      <main className="flex-1">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center transition-colors duration-300">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
            <button
              onClick={handleLogout}
              className="bg-linear-to-r from-red-500 to-rose-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-rose-700 transition text-sm font-medium shadow-md"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="p-6">
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
                  Handle administrative tasks and generate reports
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Staff Management</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Manage teacher and staff records</p>
              <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
                Manage Staff
              </button>
            </div>

            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Student Records</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">View and manage all student information</p>
              <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
                View Records
              </button>
            </div>

            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Reports & Analytics</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Generate attendance reports and statistics</p>
              <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
                Generate Reports
              </button>
            </div>

            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Class Schedules</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Manage school-wide class schedules</p>
              <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
                View Schedules
              </button>
            </div>

            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Documents</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Manage forms and official documents</p>
              <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
                View Documents
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
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Manage system settings and preferences</p>
              <button className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}>
                Open Settings
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
