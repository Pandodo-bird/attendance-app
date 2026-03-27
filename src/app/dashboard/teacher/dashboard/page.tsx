"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/hooks/useRequireRole";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutGrid,
  School,
  UserPlus,
  Users,
} from "lucide-react";
import {
  getTeacherAppointments,
  getTeacherAttendance,
  getTeacherSections,
} from "@/lib/firestore";

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

  const formatLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayDateKey = formatLocalDateKey(new Date());

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections", user?.uid],
    queryFn: () => getTeacherSections(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments", user?.uid],
    queryFn: () => getTeacherAppointments(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: todaySessions = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["teacherAttendanceToday", user?.uid, todayDateKey],
    queryFn: () => getTeacherAttendance(user?.uid || "", todayDateKey),
    enabled: !!user?.uid,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const activeSections = useMemo(
    () => sections.filter((section) => section.status === "active"),
    [sections]
  );

  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "active"),
    [appointments]
  );

  const activeSecretaries = useMemo(
    () => new Set(activeAppointments.map((appointment) => appointment.secretaryUid)).size,
    [activeAppointments]
  );

  const coveredSectionIdsToday = useMemo(
    () => new Set(todaySessions.map((session) => session.sectionId)),
    [todaySessions]
  );

  const appointedSectionIds = useMemo(
    () => new Set(activeAppointments.map((appointment) => appointment.sectionId)),
    [activeAppointments]
  );

  const unassignedSections = useMemo(
    () =>
      activeSections.filter((section) => !appointedSectionIds.has(section.id)).slice(0, 5),
    [activeSections, appointedSectionIds]
  );

  const missingTodaySections = useMemo(
    () =>
      activeSections.filter((section) => !coveredSectionIdsToday.has(section.id)).slice(0, 5),
    [activeSections, coveredSectionIdsToday]
  );

  const expectedSessions = activeAppointments.length;
  const submittedSessions = todaySessions.length;
  const dailyCoverage =
    expectedSessions > 0 ? Math.round((submittedSessions / expectedSessions) * 100) : 0;

  const isLoading = sectionsLoading || appointmentsLoading || attendanceLoading;

  return (
    <>
      {/* Header */}
      <TeacherHeader
        title="Dashboard Overview"
        stats={[
          { label: "ACTIVE SECTIONS", value: activeSections.length },
          { label: "ACTIVE SECRETARIES", value: activeSecretaries },
          { label: "TODAY'S SUBMISSIONS", value: submittedSessions },
        ]}
        searchPlaceholder="Search students, classes..."
      />

      {/* Content Canvas */}
      <motion.div
        className="p-4 lg:p-8 space-y-6 lg:space-y-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div
          className="p-4 lg:p-8 rounded-3xl shadow-sm border"
          style={{ backgroundColor: "#EEF4FB", borderColor: "#CFE0F1" }}
        >
          <div className="mb-4 lg:mb-6 flex items-center gap-3">
            <span
              className="h-7 w-1.5 rounded-full"
              style={{ backgroundColor: "#1E3A5F" }}
            />
            <h4
              className="text-xl lg:text-2xl font-bold"
              style={{ color: "#1E3A5F" }}
            >
              Quick Actions
            </h4>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <motion.button
              onClick={() => router.push("/dashboard/teacher/sections")}
              className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm border"
              style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
              whileHover={{ backgroundColor: "#F1F7FF", scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LayoutGrid size={22} style={{ color: "#1E3A5F" }} />
              <span className="text-xs font-bold text-center" style={{ color: "#6B6B6B" }}>
                Manage Sections
              </span>
            </motion.button>

            <motion.button
              onClick={() => router.push("/dashboard/teacher/students")}
              className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm border"
              style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
              whileHover={{ backgroundColor: "#F1F7FF", scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <GraduationCap size={22} style={{ color: "#1E3A5F" }} />
              <span className="text-xs font-bold text-center" style={{ color: "#6B6B6B" }}>
                View Students
              </span>
            </motion.button>

            <motion.button
              onClick={() => router.push("/dashboard/teacher/attendance")}
              className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm border"
              style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
              whileHover={{ backgroundColor: "#F1F7FF", scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ClipboardCheck size={22} style={{ color: "#1E3A5F" }} />
              <span className="text-xs font-bold text-center" style={{ color: "#6B6B6B" }}>
                Attendance Analytics
              </span>
            </motion.button>

            <motion.button
              onClick={() => router.push("/dashboard/teacher/secretaries")}
              className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm border"
              style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
              whileHover={{ backgroundColor: "#F1F7FF", scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus size={22} style={{ color: "#1E3A5F" }} />
              <span className="text-xs font-bold text-center" style={{ color: "#6B6B6B" }}>
                Secretaries
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
                Reports
              </h5>
            </div>
            <p className="text-sm mb-3" style={{ color: "#6B7280" }}>
              Export and review attendance history.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/teacher/reports")}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF" }}
            >
              Open Reports
            </button>
          </div>
        </div>

        <div
          className="rounded-2xl border p-4 lg:p-5"
          style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} style={{ color: "#1E3A5F" }} />
            <h5 className="font-semibold" style={{ color: "#1F1F1F" }}>
              Attention Needed
            </h5>
          </div>

          {isLoading ? (
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Preparing recommendations...
            </p>
          ) : (
            <div className="space-y-2 text-sm" style={{ color: "#374151" }}>
              {unassignedSections.length > 0 ? (
                <p>
                  <span className="font-semibold">{unassignedSections.length}</span> active section(s) have no secretary appointment.
                </p>
              ) : (
                <p>All active sections have at least one appointed secretary.</p>
              )}

              {missingTodaySections.length > 0 ? (
                <p>
                  <span className="font-semibold">{missingTodaySections.length}</span> active section(s) have no attendance submission yet today.
                </p>
              ) : (
                <p>All active sections already have at least one attendance submission today.</p>
              )}

              {missingTodaySections.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs uppercase font-semibold mb-1" style={{ color: "#6B7280" }}>
                    Missing Today
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missingTodaySections.map((section) => (
                      <span
                        key={section.id}
                        className="px-2 py-1 rounded-md text-xs"
                        style={{ backgroundColor: "#EEF2FF", color: "#3730A3" }}
                      >
                        <School size={12} className="inline mr-1" />
                        {section.gradeLevel} - {section.sectionName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
