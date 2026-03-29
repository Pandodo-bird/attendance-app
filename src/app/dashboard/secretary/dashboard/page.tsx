"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import SecretaryHeader from "@/components/SecretaryHeader";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/hooks/useRequireRole";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  History,
  School,
  User,
} from "lucide-react";
import {
  calculateAttendanceStats,
  getSectionById,
  getSecretaryAppointments,
  getSecretaryAttendanceForDate,
  getSecretaryAttendanceHistoryPaginated,
} from "@/lib/firestore";

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
  const { user } = useAuth();
  const router = useRouter();

  const formatLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayDateKey = formatLocalDateKey(new Date());

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments", user?.uid],
    queryFn: () => getSecretaryAppointments(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: todaySessions = [], isLoading: todaySessionsLoading } = useQuery({
    queryKey: ["secretaryAttendanceToday", user?.uid, todayDateKey],
    queryFn: () => getSecretaryAttendanceForDate(user?.uid || "", todayDateKey),
    enabled: !!user?.uid,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: recentHistoryData, isLoading: recentHistoryLoading } = useQuery({
    queryKey: ["attendanceHistoryRecent", user?.uid],
    queryFn: () => getSecretaryAttendanceHistoryPaginated(user?.uid || "", 5, null),
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const uniqueSectionIds = useMemo(
    () => Array.from(new Set(appointments.map((appointment) => appointment.sectionId))),
    [appointments]
  );

  const { data: sectionsById = {}, isLoading: sectionsLoading } = useQuery({
    queryKey: ["sectionsById", [...uniqueSectionIds].sort().join("|")],
    queryFn: async () => {
      const sectionEntries = await Promise.all(
        uniqueSectionIds.map(async (sectionId) => {
          const section = await getSectionById(sectionId);
          return [sectionId, section] as const;
        })
      );

      return sectionEntries.reduce<Record<string, Awaited<ReturnType<typeof getSectionById>>>>(
        (acc, [sectionId, section]) => {
          acc[sectionId] = section;
          return acc;
        },
        {}
      );
    },
    enabled: uniqueSectionIds.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const assignedSectionsCount = uniqueSectionIds.length;
  const expectedSessions = appointments.length;
  const submittedSessions = todaySessions.length;
  const pendingSessions = Math.max(0, expectedSessions - submittedSessions);
  const dailyCoverage =
    expectedSessions > 0 ? Math.round((submittedSessions / expectedSessions) * 100) : 0;

  const recentSessions = recentHistoryData?.sessions ?? [];
  const totalStudentsMarkedRecent = recentSessions.reduce((acc, session) => {
    const stats = calculateAttendanceStats(session.records);
    return acc + stats.total;
  }, 0);

  const latestSessionDate = recentSessions[0]?.date
    ? new Date(recentSessions[0].date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No submissions yet";

  const isLoading =
    appointmentsLoading ||
    todaySessionsLoading ||
    recentHistoryLoading ||
    sectionsLoading;

  return (
    <>
      {/* Header */}
      <SecretaryHeader
        title="Dashboard Overview"
        stats={[
          { label: "ACTIVE APPOINTMENTS", value: expectedSessions },
          { label: "ASSIGNED SECTIONS", value: assignedSectionsCount },
          { label: "TODAY'S SUBMISSIONS", value: submittedSessions },
        ]}
        searchPlaceholder="Search sections, subjects..."
      />

      {/* Content Canvas */}
      <motion.div
        className="p-4 lg:p-8 space-y-6 lg:space-y-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Quick Actions */}
        <div
          className="p-4 lg:p-8 rounded-3xl shadow-sm border"
          style={{ backgroundColor: "#EEF4FB", borderColor: "#CFE0F1" }}
        >
          <div className="mb-4 lg:mb-6 flex items-center gap-3">
            <span
              className="h-7 w-1.5 rounded-full"
              style={{ backgroundColor: "#1E3A5F" }}
            />
            <h4 className="text-xl lg:text-2xl font-bold" style={{ color: "#1E3A5F" }}>
              Quick Actions
            </h4>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            <motion.button
              onClick={() => router.push("/dashboard/secretary/attendance")}
              className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm border"
              style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
              whileHover={{ backgroundColor: "#F1F7FF", scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ClipboardCheck size={22} style={{ color: "#1E3A5F" }} />
              <span className="text-xs font-bold text-center" style={{ color: "#6B6B6B" }}>
                Today&apos;s Attendance
              </span>
            </motion.button>

            <motion.button
              onClick={() => router.push("/dashboard/secretary/history")}
              className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm border"
              style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
              whileHover={{ backgroundColor: "#F1F7FF", scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <History size={22} style={{ color: "#1E3A5F" }} />
              <span className="text-xs font-bold text-center" style={{ color: "#6B6B6B" }}>
                History
              </span>
            </motion.button>

            <motion.button
              onClick={() => router.push("/dashboard/secretary/profile")}
              className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm border"
              style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
              whileHover={{ backgroundColor: "#F1F7FF", scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <User size={22} style={{ color: "#1E3A5F" }} />
              <span className="text-xs font-bold text-center" style={{ color: "#6B6B6B" }}>
                Profile
              </span>
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          <div
            className="xl:col-span-2 rounded-2xl border p-4 lg:p-5"
            style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={18} style={{ color: "#1E3A5F" }} />
              <h5 className="font-semibold" style={{ color: "#1F1F1F" }}>
                Today&apos;s Attendance Snapshot
              </h5>
            </div>

            {isLoading ? (
              <p className="text-sm" style={{ color: "#6B7280" }}>
                Loading dashboard summary...
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: "#EEF4FB" }}>
                  <p className="text-xs font-semibold uppercase" style={{ color: "#6B7280" }}>
                    Expected Sessions
                  </p>
                  <p className="text-2xl font-semibold" style={{ color: "#1F1F1F" }}>
                    {expectedSessions}
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "#EEF4FB" }}>
                  <p className="text-xs font-semibold uppercase" style={{ color: "#6B7280" }}>
                    Submitted
                  </p>
                  <p className="text-2xl font-semibold" style={{ color: "#1F1F1F" }}>
                    {submittedSessions}
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "#EEF4FB" }}>
                  <p className="text-xs font-semibold uppercase" style={{ color: "#6B7280" }}>
                    Coverage
                  </p>
                  <p className="text-2xl font-semibold" style={{ color: "#1F1F1F" }}>
                    {dailyCoverage}%
                  </p>
                </div>
              </div>
            )}
          </div>

          <div
            className="rounded-2xl border p-4 lg:p-5"
            style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} style={{ color: "#1E3A5F" }} />
              <h5 className="font-semibold" style={{ color: "#1F1F1F" }}>
                Recent Activity
              </h5>
            </div>
            {isLoading ? (
              <p className="text-sm" style={{ color: "#6B7280" }}>
                Loading recent sessions...
              </p>
            ) : (
              <div className="space-y-2 text-sm" style={{ color: "#374151" }}>
                <p>
                  <span className="font-semibold">{recentSessions.length}</span> recent session(s) loaded.
                </p>
                <p>
                  <span className="font-semibold">{totalStudentsMarkedRecent}</span> students marked in recent sessions.
                </p>
                <p>
                  Latest submission: <span className="font-semibold">{latestSessionDate}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div
          className="rounded-2xl border p-4 lg:p-5"
          style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <School size={18} style={{ color: "#1E3A5F" }} />
            <h5 className="font-semibold" style={{ color: "#1F1F1F" }}>
              Assigned Sections & Subjects
            </h5>
          </div>

          {isLoading ? (
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Loading appointments...
            </p>
          ) : appointments.length === 0 ? (
            <p className="text-sm" style={{ color: "#6B7280" }}>
              You don&apos;t have active appointments yet. Please wait for your teacher to assign one.
            </p>
          ) : (
            <div className="space-y-2">
              {appointments.map((appointment) => {
                const section = sectionsById[appointment.sectionId];
                const sectionName = section
                  ? `${section.gradeLevel} - ${section.sectionName}`
                  : "Section loading...";
                const hasSubmittedToday = todaySessions.some(
                  (session) =>
                    session.sectionId === appointment.sectionId &&
                    session.subject === appointment.subject
                );

                return (
                  <div
                    key={appointment.id}
                    className="rounded-xl px-3 py-3 border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    style={{ backgroundColor: "#EEF4FB", borderColor: "#D7E2EF" }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#1F1F1F" }}>
                        {sectionName}
                      </p>
                      <p className="text-xs" style={{ color: "#6B7280" }}>
                        Subject: {appointment.subject}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full self-start sm:self-auto"
                      style={{
                        backgroundColor: hasSubmittedToday ? "#D1FAE5" : "#FEF3C7",
                        color: hasSubmittedToday ? "#065F46" : "#92400E",
                      }}
                    >
                      {hasSubmittedToday ? "Submitted Today" : "Pending Today"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isLoading && expectedSessions > 0 && (
          <div
            className="rounded-2xl border p-4 lg:p-5"
            style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
          >
            <h5 className="font-semibold mb-2" style={{ color: "#1F1F1F" }}>
              Attention Needed
            </h5>
            <p className="text-sm" style={{ color: "#374151" }}>
              {pendingSessions > 0
                ? `${pendingSessions} appointment(s) still need attendance submission today.`
                : "All your assigned appointments already have attendance submitted today."}
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
}
