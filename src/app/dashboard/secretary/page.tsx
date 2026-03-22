"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import AuthGuard from "@/components/AuthGuard";
import SecretarySidebar from "@/components/SecretarySidebar";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  subscribeToSecretaryAppointments,
  getSectionById,
} from "@/lib/firestore";
import { Unsubscribe, FirestoreError } from "firebase/firestore";
import { RoleGuard } from "@/hooks/useRequireRole";

// Extended appointment with enriched data
interface EnrichedAppointment {
  id: string;
  appointmentId: string;
  secretaryUid: string;
  secretaryLrn: string;
  teacherId: string;
  sectionId: string;
  sectionName: string;
  gradeLevel: string;
  subject: string;
  schoolYear: string;
  status: "active" | "removed";
  appointedAt: Date | string;
  teacherName?: string;
  studentCount?: number;
}

export default function SecretaryDashboardPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="secretary">
        <SecretaryDashboardContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function SecretaryDashboardContent() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [appointments, setAppointments] = useState<EnrichedAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Real-time subscription to secretary's active appointments
  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (!user?.uid) return;

    // Subscribe to real-time updates for secretary's active appointments
    unsubscribe = subscribeToSecretaryAppointments(
      user.uid,
      async (fetchedAppointments) => {
        try {
          // Enrich appointments with section data using efficient single-document reads
          const enriched = await Promise.all(
            fetchedAppointments.map(async (apt) => {
              // Fetch single section document (not ALL sections)
              const section = await getSectionById(apt.sectionId, true);

              // Use stored studentCount from section document (no need to fetch all students)
              const studentCount = section?.studentCount || 0;

              return {
                ...apt,
                appointmentId: apt.id,
                sectionName: section?.sectionName || "Unknown Section",
                gradeLevel: section?.gradeLevel || "",
                studentCount,
              } as EnrichedAppointment;
            })
          );

          setAppointments(enriched);
          setIsLoading(false);
        } catch (err) {
          console.error("Error enriching appointments:", err);
          setError("Failed to load appointments. Please try again.");
          setIsLoading(false);
        }
      },
      (err: FirestoreError) => {
        console.error("Error fetching appointments:", err);
        if (err.code === "permission-denied") {
          setError(
            "Unable to load appointments. Firestore security rules may need to be configured."
          );
        } else {
          setError("Failed to load appointments. Please try again.");
        }
        setIsLoading(false);
      }
    );

    // Cleanup: Unsubscribe when component unmounts or user changes
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const activeCount = appointments.filter((a) => a.status === "active").length;
  const totalStudents = appointments.reduce((sum, apt) => sum + (apt.studentCount || 0), 0);

  // Navigate to take attendance for an appointment
  const handleTakeAttendance = (appointment: EnrichedAppointment) => {
    router.push(
      `/dashboard/secretary/attendance?appointmentId=${appointment.appointmentId}&sectionId=${appointment.sectionId}&subject=${encodeURIComponent(appointment.subject)}`
    );
  };

  // Navigate to view reports for an appointment
  const handleViewReports = (appointment: EnrichedAppointment) => {
    router.push(
      `/dashboard/secretary/reports?appointmentId=${appointment.appointmentId}&sectionId=${appointment.sectionId}`
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <SecretarySidebar activeItem="dashboard" />
      <main className="flex-1">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center transition-colors duration-300">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg
                  className="w-5 h-5 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-indigo-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
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
              <div
                className={`w-14 h-14 rounded-2xl bg-linear-to-br ${theme.gradient} flex items-center justify-center shadow-lg`}
              >
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Welcome back, {user?.displayName?.split(" ")[0] || "User"}!
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Manage attendance for your appointed subjects
                </p>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Appointments</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
                </div>
              </div>
            </div>

            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStudents}</p>
                </div>
              </div>
            </div>

            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Subjects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {appointments.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Appointments Grid */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Your Appointments
            </h3>
            {error ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <div className="text-center">
                  <span
                    className="material-symbols-outlined text-5xl mb-4"
                    style={{ color: "#EF4444" }}
                  >
                    error
                  </span>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Unable to Load
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <div className="flex items-center justify-center gap-4">
                  <div
                    className="w-8 h-8 border-4 rounded-full animate-spin"
                    style={{ borderColor: "#F97316", borderTopColor: "#FED7AA" }}
                  ></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading appointments...</p>
                </div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <div className="text-center">
                  <span
                    className="material-symbols-outlined text-5xl mb-4"
                    style={{ color: "#9CA3AF" }}
                  >
                    event_busy
                  </span>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    No Appointments Yet
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your teacher hasn&apos;t appointed you to any subjects yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appointments.map((apt) => (
                  <div
                    key={apt.appointmentId}
                    className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}
                      >
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                          {apt.subject}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {apt.sectionName} • Grade {apt.gradeLevel}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">School Year:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {apt.schoolYear}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Students:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {apt.studentCount || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTakeAttendance(apt)}
                        className={`flex-1 py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition text-sm`}
                      >
                        Take Attendance
                      </button>
                      <button
                        onClick={() => handleViewReports(apt)}
                        className={`py-2 px-4 rounded-lg border ${theme.border} text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm`}
                      >
                        Reports
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>
                  Reports & Analytics
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                View attendance reports and statistics for your appointments
              </p>
              <button
                className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}
              >
                View Reports
              </button>
            </div>

            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>My Profile</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                View and update your student profile information
              </p>
              <button
                className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}
              >
                View Profile
              </button>
            </div>

            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border ${theme.border} ${theme.darkBorder} transition-colors duration-300 hover:shadow-xl`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.gradient} flex items-center justify-center`}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className={`font-bold text-lg ${theme.text} ${theme.darkText}`}>Settings</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Manage system settings and preferences
              </p>
              <button
                className={`w-full py-2 px-4 rounded-lg bg-linear-to-r ${theme.gradient} text-white font-medium hover:opacity-90 transition`}
              >
                Open Settings
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
