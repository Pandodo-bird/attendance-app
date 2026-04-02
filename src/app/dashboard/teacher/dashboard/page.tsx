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
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  LayoutGrid,
  UserPlus,
} from "lucide-react";
import {
  getTeacherAppointments,
  getTeacherAttendance,
  getTeacherSections,
  getUserProfilesBatch,
  UserData,
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

  const sectionLabelById = useMemo(
    () =>
      new Map(
        sections.map((section) => [
          section.id,
          `${section.gradeLevel} - ${section.sectionName}`,
        ])
      ),
    [sections]
  );

  const appointedSectionIds = useMemo(
    () => new Set(activeAppointments.map((a) => a.sectionId)),
    [activeAppointments]
  );

  const unassignedSections = useMemo(
    () => activeSections.filter((s) => !appointedSectionIds.has(s.id)),
    [activeSections, appointedSectionIds]
  );

  const recorderUids = useMemo(
    () =>
      Array.from(
        new Set(
          todaySessions
            .map((s) => s.createdByUid ?? s.submittedByUid)
            .filter((uid): uid is string => Boolean(uid))
        )
      ),
    [todaySessions]
  );

  const { data: recorderProfiles = new Map<string, UserData>() } = useQuery({
    queryKey: ["recorderProfiles", user?.uid, recorderUids],
    queryFn: () => getUserProfilesBatch(recorderUids),
    enabled: !!user?.uid && recorderUids.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const sectionStatusMap = useMemo(() => {
    const map = new Map<string, "locked" | "open" | "none">();
    activeSections.forEach((section) => {
      const session = todaySessions.find((s) => s.sectionId === section.id);
      map.set(section.id, session ? session.status : "none");
    });
    return map;
  }, [activeSections, todaySessions]);

  const lockedCount = useMemo(
    () => activeSections.filter((s) => sectionStatusMap.get(s.id) === "locked").length,
    [activeSections, sectionStatusMap]
  );
  const openCount = useMemo(
    () => activeSections.filter((s) => sectionStatusMap.get(s.id) === "open").length,
    [activeSections, sectionStatusMap]
  );

  const submittedSessions = todaySessions.length;
  const isLoading = sectionsLoading || appointmentsLoading || attendanceLoading;

  return (
    <>
      {/* Header */}
      <TeacherHeader
        title="Dashboard Overview"
        searchPlaceholder="Search students, classes..."
      />

      {/* Content Canvas */}
      <motion.div
        className="p-4 lg:p-8 space-y-6 lg:space-y-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Today's Section Status */}
        <div
          className="rounded-2xl border p-5 lg:p-6"
          style={{
            background: "linear-gradient(135deg, #F7FBFF 0%, #EEF5FF 58%, #E8F0FB 100%)",
            borderColor: "#D7E2EF",
          }}
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: "#56738F" }}>
                Section Status
              </p>
              <h4 className="mt-2 text-2xl font-bold leading-tight lg:text-3xl" style={{ color: "#102A43" }}>
                Today&apos;s Overview
              </h4>
              <p className="mt-2 max-w-xl text-sm lg:text-[15px]" style={{ color: "#486581" }}>
                Track attendance progress across all your active sections for today.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
              <div className="rounded-2xl border px-4 py-3 text-center" style={{ borderColor: "#D1FAE5", backgroundColor: "rgba(255,255,255,0.72)" }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#15803D" }}>Submitted</p>
                <p className="mt-1.5 text-2xl font-bold" style={{ color: "#16A34A" }}>{lockedCount}</p>
              </div>
              <div className="rounded-2xl border px-4 py-3 text-center" style={{ borderColor: "#FDE68A", backgroundColor: "rgba(255,255,255,0.72)" }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#B45309" }}>Open</p>
                <p className="mt-1.5 text-2xl font-bold" style={{ color: "#D97706" }}>{openCount}</p>
              </div>
              <div className="rounded-2xl border px-4 py-3 text-center" style={{ borderColor: "#E5E7EB", backgroundColor: "rgba(255,255,255,0.72)" }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#9CA3AF" }}>Idle</p>
                <p className="mt-1.5 text-2xl font-bold" style={{ color: "#6B7280" }}>{activeSections.length - lockedCount - openCount}</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <p className="mt-6 text-sm" style={{ color: "#6B7280" }}>Loading sections...</p>
          ) : activeSections.length === 0 ? (
            <p className="mt-6 text-sm" style={{ color: "#9CA3AF" }}>No active sections found.</p>
          ) : (
            <div className="mt-6 space-y-2">
              {activeSections.map((section) => {
                const status = sectionStatusMap.get(section.id) ?? "none";
                return (
                  <div
                    key={section.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                    style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF" }}
                  >
                    {status === "locked" ? (
                      <CheckCircle2 size={18} style={{ color: "#16A34A", flexShrink: 0 }} />
                    ) : status === "open" ? (
                      <Clock size={18} style={{ color: "#D97706", flexShrink: 0 }} />
                    ) : (
                      <span
                        className="w-[18px] h-[18px] rounded-full border-2 flex-shrink-0"
                        style={{ borderColor: "#CBD5E1" }}
                      />
                    )}
                    <p className="text-sm font-medium flex-1 truncate" style={{ color: "#1E293B" }}>
                      {section.gradeLevel} - {section.sectionName}
                    </p>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={
                        status === "locked"
                          ? { backgroundColor: "#DCFCE7", color: "#166534" }
                          : status === "open"
                            ? { backgroundColor: "#FEF3C7", color: "#92400E" }
                            : { backgroundColor: "#F1F5F9", color: "#64748B" }
                      }
                    >
                      {status === "locked" ? "Submitted" : status === "open" ? "In Progress" : "Not Started"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
            <h4
              className="text-xl lg:text-2xl font-bold"
              style={{ color: "#1E3A5F" }}
            >
              Quick Actions
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {[
              {
                key: "sections",
                label: "Manage Sections",
                description: "Create, edit, and organize your class sections for the current school year.",
                countLabel: `${activeSections.length} active section${activeSections.length === 1 ? "" : "s"}`,
                icon: <LayoutGrid size={18} />,
                route: "/dashboard/teacher/sections",
              },
              {
                key: "students",
                label: "View Students",
                description: "Browse enrolled students, view profiles, and manage student records.",
                countLabel: "View all",
                icon: <GraduationCap size={18} />,
                route: "/dashboard/teacher/students",
              },
              {
                key: "attendance",
                label: "Attendance Analytics",
                description: "Analyze attendance trends, review summaries, and track student performance.",
                countLabel: `${submittedSessions} submitted today`,
                icon: <ClipboardCheck size={18} />,
                route: "/dashboard/teacher/attendance",
              },
              {
                key: "secretaries",
                label: "Secretaries",
                description: "Appoint class secretaries and review their recorded attendance sessions.",
                countLabel: `${activeSecretaries} active`,
                icon: <UserPlus size={18} />,
                route: "/dashboard/teacher/secretaries",
              },
            ].map((action) => (
              <motion.button
                key={action.key}
                type="button"
                onClick={() => router.push(action.route)}
                className="group relative overflow-hidden rounded-2xl border p-5 text-left cursor-pointer"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#D7E2EF",
                  color: "#0F172A",
                }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: "#DBEAFE" }}
                />
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}
                  >
                    {action.icon}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: "#F8FAFC", color: "#64748B" }}
                  >
                    {action.countLabel}
                  </span>
                </div>
                <p className="mt-4 text-base font-semibold">{action.label}</p>
                <p className="mt-2 text-sm" style={{ color: "#475569" }}>
                  {action.description}
                </p>

                <div className="mt-5 flex items-center justify-end">
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{
                      backgroundColor: "#F8FAFC",
                      color: "#1E3A5F",
                      border: "1px solid #D7E2EF",
                    }}
                  >
                    <ArrowUpRight size={16} />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Today's Activity + Needs Attention */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* Today's Activity */}
          <div className="rounded-2xl border p-5" style={{ backgroundColor: "#FFFFFF", borderColor: "#D7E2EF" }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#56738F" }}>
              Activity
            </p>
            <h5 className="mt-2 text-lg font-bold" style={{ color: "#102A43" }}>
              Today&apos;s Sessions
            </h5>

            {isLoading ? (
              <p className="mt-4 text-sm" style={{ color: "#6B7280" }}>Loading...</p>
            ) : todaySessions.length === 0 ? (
              <div className="mt-4 rounded-xl border px-4 py-6 text-center" style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}>
                <p className="text-sm" style={{ color: "#9CA3AF" }}>
                  No attendance sessions recorded today.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/teacher/secretaries")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}
                >
                  Take attendance
                  <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {todaySessions.map((session) => {
                  const sectionLabel = sectionLabelById.get(session.sectionId) ?? session.sectionId;
                  const recorderUid = session.submittedByUid ?? session.createdByUid;
                  const recorderName = recorderUid
                    ? recorderProfiles.get(recorderUid)?.displayName ?? "Unknown"
                    : "Unknown";
                  const isLocked = session.status === "locked";

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => router.push("/dashboard/teacher/secretaries")}
                      className="w-full flex items-center gap-3 rounded-xl px-4 py-3 border text-left transition-colors"
                      style={{
                        borderColor: isLocked ? "#D1FAE5" : "#FDE68A",
                        backgroundColor: isLocked ? "#F0FDF4" : "#FFFBEB",
                      }}
                    >
                      {isLocked ? (
                        <CheckCircle2 size={16} style={{ color: "#16A34A", flexShrink: 0 }} />
                      ) : (
                        <Clock size={16} style={{ color: "#D97706", flexShrink: 0 }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#1E293B" }}>
                          {sectionLabel}
                        </p>
                        <p className="text-xs" style={{ color: "#6B7280" }}>
                          by {recorderName}
                        </p>
                      </div>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={
                          isLocked
                            ? { backgroundColor: "#DCFCE7", color: "#166534" }
                            : { backgroundColor: "#FEF3C7", color: "#92400E" }
                        }
                      >
                        {isLocked ? "Submitted" : "Open"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Needs Attention */}
          <div className="rounded-2xl border p-5" style={{ backgroundColor: "#FFFFFF", borderColor: "#D7E2EF" }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#56738F" }}>
              Needs Attention
            </p>
            <h5 className="mt-2 text-lg font-bold" style={{ color: "#102A43" }}>
              Action Items
            </h5>

            {isLoading ? (
              <p className="mt-4 text-sm" style={{ color: "#6B7280" }}>Loading...</p>
            ) : (
              <div className="mt-4 space-y-3">
                {unassignedSections.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#B45309" }}>
                      No Secretary Appointed
                    </p>
                    <div className="space-y-2">
                      {unassignedSections.map((section) => (
                        <div
                          key={section.id}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                          style={{ borderColor: "#FDE68A", backgroundColor: "#FFFBEB" }}
                        >
                          <UserPlus size={16} style={{ color: "#D97706", flexShrink: 0 }} />
                          <p className="text-sm font-medium flex-1 truncate" style={{ color: "#1E293B" }}>
                            {section.gradeLevel} - {section.sectionName}
                          </p>
                          <button
                            type="button"
                            onClick={() => router.push("/dashboard/teacher/secretaries")}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSections.length > todaySessions.length && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#6B7280" }}>
                      No Session Today
                    </p>
                    <div className="space-y-2">
                      {activeSections
                        .filter((s) => !todaySessions.some((sess) => sess.sectionId === s.id))
                        .map((section) => (
                          <div
                            key={section.id}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                            style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}
                          >
                            <ClipboardCheck size={16} style={{ color: "#6B7280", flexShrink: 0 }} />
                            <p className="text-sm font-medium flex-1 truncate" style={{ color: "#1E293B" }}>
                              {section.gradeLevel} - {section.sectionName}
                            </p>
                            <button
                              type="button"
                              onClick={() => router.push("/dashboard/teacher/secretaries")}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}
                            >
                              Record
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {unassignedSections.length === 0 && activeSections.length <= todaySessions.length && (
                  <div className="rounded-xl border px-4 py-6 text-center" style={{ borderColor: "#D1FAE5", backgroundColor: "#F0FDF4" }}>
                    <CheckCircle2 size={20} style={{ color: "#16A34A" }} className="mx-auto" />
                    <p className="mt-2 text-sm font-medium" style={{ color: "#166534" }}>
                      All caught up!
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#15803D" }}>
                      Every section has a secretary and a session today.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
