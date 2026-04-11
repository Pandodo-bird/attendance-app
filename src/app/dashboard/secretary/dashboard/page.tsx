"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import SecretaryHeader from "@/components/SecretaryHeader";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/hooks/useRequireRole";
import { motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CloudOff,
  CalendarDays,
  ClipboardCheck,
  FileText,
  History,
  School,
  User,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  AttendanceHistoryCursor,
  calculateAttendanceStats,
  getSectionById,
  getSecretaryAppointments,
  getSecretaryAttendanceForDate,
  getSecretaryAttendanceHistoryPaginated,
  type Attendance,
  type Appointment,
  type Section,
} from "@/lib/firestore";
import { readSecretaryBootstrapCache, mergeSecretaryBootstrapCache } from "@/lib/secretaryOfflineBootstrap";
import { useNetworkStatus } from "@/lib/networkStatus";
import { useOfflineHistoryQueueItems, useOfflineQueueSummary, type OfflineAttendanceQueueItem } from "@/lib/offlineQueue";
import { useSecretarySyncStatus } from "@/lib/syncManager";

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
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { items: offlineQueueItems } = useOfflineHistoryQueueItems(user?.uid);
  const offlineQueueSummary = useOfflineQueueSummary(user?.uid);
  const syncStatus = useSecretarySyncStatus(user?.uid);
  const pendingSyncCount = offlineQueueSummary.pending + offlineQueueSummary.syncing + offlineQueueSummary.failed + offlineQueueSummary.needsReview;
  const cachedBootstrap = useMemo(() => readSecretaryBootstrapCache(user?.uid), [user?.uid]);
  const cachedAppointments: Appointment[] = cachedBootstrap?.appointments ?? [];
  const cachedSectionsById: Record<string, Section> = cachedBootstrap?.sectionsById ?? {};
  const cachedHistorySessions: Attendance[] = cachedBootstrap?.attendanceHistorySessions ?? [];

  const formatLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayDateKey = formatLocalDateKey(new Date());

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments", user?.uid],
    queryFn: () => getSecretaryAppointments(user?.uid || ""),
    enabled: !!user?.uid && isOnline,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: todaySessions, isLoading: todaySessionsLoading } = useQuery({
    queryKey: ["secretaryAttendanceToday", user?.uid, todayDateKey],
    queryFn: () => getSecretaryAttendanceForDate(user?.uid || "", todayDateKey),
    enabled: !!user?.uid && isOnline,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: recentHistoryData, isLoading: recentHistoryLoading } = useQuery({
    queryKey: ["attendanceHistoryRecent", user?.uid],
    queryFn: () => getSecretaryAttendanceHistoryPaginated(user?.uid || "", {
      pageSize: 5,
      cursor: null as AttendanceHistoryCursor | null,
    }),
    enabled: !!user?.uid && isOnline,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const resolvedAppointments = appointments ?? cachedAppointments;
  const recentHistorySessions = recentHistoryData?.sessions;
  const hasRecentHistoryResult = recentHistoryData !== undefined;
  const resolvedRecentSessions = recentHistoryData
    ? recentHistoryData.sessions
    : cachedHistorySessions.slice(0, 5);
  const cachedTodaySessions = cachedHistorySessions.filter((session) => session.date === todayDateKey);

  const offlineTodaySessions: Attendance[] = useMemo(() => {
    return offlineQueueItems
      .filter((item) => item.date === todayDateKey)
      .map((item: OfflineAttendanceQueueItem) => ({
        id: item.attendanceId,
        sectionId: item.sectionId,
        teacherId: item.teacherId,
        secretaryUid: item.secretaryUid,
        date: item.date,
        schoolYear: item.schoolYear,
        status: "locked" as const,
        records: Object.fromEntries(
          item.students.map((s) => [
            s.lrn,
            {
              studentName: s.studentName,
              status: s.status,
              timeRecorded: new Date(item.updatedAt),
              recordedByUid: item.secretaryUid,
            },
          ])
        ),
        createdAt: new Date(item.createdAt),
        lockedAt: new Date(item.updatedAt),
        submittedByUid: item.secretaryUid,
        submittedByRole: "secretary" as const,
      }));
  }, [offlineQueueItems, todayDateKey]);

  const uniqueSectionIds = useMemo(
    () => Array.from(new Set(resolvedAppointments.map((appointment) => appointment.sectionId))),
    [resolvedAppointments]
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
    enabled: uniqueSectionIds.length > 0 && isOnline,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!user?.uid || (!appointments && !hasRecentHistoryResult && Object.keys(sectionsById).length === 0)) {
      return;
    }

    const serializableSectionsById = Object.fromEntries(
      Object.entries(sectionsById).filter(([, section]) => section)
    ) as Record<string, Section>;

    mergeSecretaryBootstrapCache(user.uid, {
      appointments,
      sectionsById: Object.keys(serializableSectionsById).length > 0 ? serializableSectionsById : undefined,
      attendanceHistorySessions: recentHistorySessions,
    });
  }, [appointments, hasRecentHistoryResult, recentHistorySessions, sectionsById, user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const wasSyncing = syncStatus.isSyncing;
    if (!wasSyncing && syncStatus.pendingCount === 0 && syncStatus.syncingCount === 0) {
      queryClient.invalidateQueries({ queryKey: ["secretaryAttendanceToday", user?.uid, todayDateKey] });
      queryClient.invalidateQueries({ queryKey: ["attendanceHistoryRecent", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["appointments", user?.uid] });
    }
  }, [syncStatus.pendingCount, syncStatus.syncingCount, syncStatus.isSyncing, queryClient, user?.uid, todayDateKey]);

  const resolvedSectionsById = Object.keys(sectionsById).length > 0 ? sectionsById : cachedSectionsById;

  const resolvedTodaySessions = (() => {
    const serverSessions = isOnline
      ? (todaySessions ?? cachedTodaySessions)
      : cachedTodaySessions;
    const seenIds = new Set<string>(serverSessions.map((s) => s.id));
    const uniqueOffline = offlineTodaySessions.filter((s) => !seenIds.has(s.id));
    return [...serverSessions, ...uniqueOffline];
  })();

  const syncedSectionIds = new Set(resolvedTodaySessions.filter((s) => !offlineQueueItems.some((q) => q.attendanceId === s.id)).map((s) => s.sectionId));
  const locallySavedSectionIds = new Set(offlineQueueItems.filter((item) => item.date === todayDateKey).map((item) => item.sectionId));

  function getSectionStatus(sectionId: string): "not_recorded" | "saved_locally" | "synced" {
    if (syncedSectionIds.has(sectionId)) return "synced";
    if (locallySavedSectionIds.has(sectionId)) return "saved_locally";
    return "not_recorded";
  }

  const notRecordedCount = resolvedAppointments.filter((a) => getSectionStatus(a.sectionId) === "not_recorded").length;
  const assignedSectionsCount = uniqueSectionIds.length;
  const submittedSessions = resolvedTodaySessions.length;

  const recentSessions = resolvedRecentSessions;
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
    isOnline && (
      appointmentsLoading ||
      todaySessionsLoading ||
      recentHistoryLoading ||
      sectionsLoading
    ) && resolvedAppointments.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SecretaryHeader
        title="Dashboard"
        stats={[
          { label: "APPOINTMENTS", value: resolvedAppointments.length },
          { label: "SECTIONS", value: assignedSectionsCount },
          { label: "TODAY", value: submittedSessions },
        ]}
      />

      <motion.div
        className="flex-1 min-h-0 overflow-y-auto px-3 pb-[calc(var(--secretary-mobile-nav-offset)+1rem)] sm:px-4 lg:px-8 lg:pb-8 space-y-4 sm:space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Quick Actions */}
        <div
          className="rounded-2xl p-4 sm:p-6 border"
          style={{ backgroundColor: "#EEF4FB", borderColor: "#CFE0F1" }}
        >
          <div className="mb-4 flex items-center gap-2">
            <span
              className="h-6 w-1 rounded-full"
              style={{ backgroundColor: "#1E3A5F" }}
            />
            <h4 className="text-lg font-bold" style={{ color: "#1E3A5F" }}>
              Quick Actions
            </h4>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <motion.button
              onClick={() => router.push("/dashboard/secretary/attendance")}
              className="p-3 sm:p-4 rounded-xl flex flex-col items-center gap-1.5 sm:gap-2 border"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#D7E2EF" }}
              whileHover={{ backgroundColor: "#F1F7FF", scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#EEF4FB" }}
              >
                <ClipboardCheck size={20} style={{ color: "#1E3A5F" }} />
              </div>
              <span className="text-xs font-semibold text-center" style={{ color: "#374151" }}>
                Attendance
              </span>
            </motion.button>

            <motion.button
              onClick={() => router.push("/dashboard/secretary/history")}
              className="p-3 sm:p-4 rounded-xl flex flex-col items-center gap-1.5 sm:gap-2 border"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#D7E2EF" }}
              whileHover={{ backgroundColor: "#F1F7FF", scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#EEF4FB" }}
              >
                <History size={20} style={{ color: "#1E3A5F" }} />
              </div>
              <span className="text-xs font-semibold text-center" style={{ color: "#374151" }}>
                History
              </span>
            </motion.button>

            <motion.button
              onClick={() => router.push("/dashboard/secretary/profile")}
              className="p-3 sm:p-4 rounded-xl flex flex-col items-center gap-1.5 sm:gap-2 border"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#D7E2EF" }}
              whileHover={{ backgroundColor: "#F1F7FF", scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#EEF4FB" }}
              >
                <User size={20} style={{ color: "#1E3A5F" }} />
              </div>
              <span className="text-xs font-semibold text-center" style={{ color: "#374151" }}>
                Profile
              </span>
            </motion.button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <motion.div
            className="rounded-xl p-3 sm:p-4 border"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, duration: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#E6DEFF" }}>
                <School size={14} style={{ color: "#493598" }} />
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase" style={{ color: "#6B7280" }}>
                Sections
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-bold" style={{ color: "#1F1F1F" }}>
              {isLoading ? "—" : assignedSectionsCount}
            </p>
          </motion.div>

          <motion.div
            className="rounded-xl p-3 sm:p-4 border"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#D4F0E8" }}>
                <CheckCircle size={14} style={{ color: "#00695C" }} />
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase" style={{ color: "#6B7280" }}>
                Submitted
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-bold" style={{ color: "#1F1F1F" }}>
              {isLoading ? "—" : submittedSessions}
            </p>
          </motion.div>

          <motion.div
            className="rounded-xl p-3 sm:p-4 border"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FFE5D0" }}>
                <AlertCircle size={14} style={{ color: "#C45C00" }} />
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase" style={{ color: "#6B7280" }}>
                Not Yet Recorded
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-bold" style={{ color: "#1F1F1F" }}>
              {isLoading ? "—" : notRecordedCount}
            </p>
          </motion.div>

          <motion.div
            className="rounded-xl p-3 sm:p-4 border"
            style={{ backgroundColor: "#FFFFFF", borderColor: pendingSyncCount > 0 ? "#FDE68A" : "#E5E7EB" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: pendingSyncCount > 0 ? "#FEF3C7" : "#DBEAFE" }}>
                {pendingSyncCount > 0 ? (
                  <CloudOff size={14} style={{ color: "#92400E" }} />
                ) : (
                  <Users size={14} style={{ color: "#1E40AF" }} />
                )}
              </div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase" style={{ color: "#6B7280" }}>
                {pendingSyncCount > 0 ? "Pending Sync" : "All Synced"}
              </p>
            </div>
            <p className="text-xl sm:text-2xl font-bold" style={{ color: "#1F1F1F" }}>
              {isLoading ? "—" : (pendingSyncCount > 0 ? pendingSyncCount : "✓")}
            </p>
          </motion.div>
        </div>

        {/* Assigned Sections */}
        <div
          className="rounded-2xl border p-4 sm:p-5"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <School size={16} style={{ color: "#1E3A5F" }} />
            <h5 className="text-sm sm:text-base font-bold" style={{ color: "#1F1F1F" }}>
              Assigned Sections
            </h5>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
            </div>
           ) : resolvedAppointments.length === 0 ? (
            <div className="text-center py-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: "#F1F5F9" }}
              >
                <School size={20} style={{ color: "#9CA3AF" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#374151" }}>
                No Active Appointments
              </p>
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                Wait for your teacher to assign you to a section
              </p>
            </div>
          ) : (
            <div className="space-y-2">
               {resolvedAppointments.map((appointment) => {
                 const section = resolvedSectionsById[appointment.sectionId];
                const sectionName = section
                  ? `${section.gradeLevel} - ${section.sectionName}`
                  : "Loading...";
                const status = getSectionStatus(appointment.sectionId);

                const badgeConfig = status === "synced"
                  ? { label: "Done", bg: "#D1FAE5", text: "#065F46", cardBg: "#F0FDF4", cardBorder: "#BBF7D0" }
                  : status === "saved_locally"
                    ? { label: "Saved Locally", bg: "#FEF3C7", text: "#92400E", cardBg: "#FFFBEB", cardBorder: "#FDE68A" }
                    : { label: "Not Recorded", bg: "#F3F4F6", text: "#6B7280", cardBg: "#F9FAFB", cardBorder: "#E5E7EB" };

                return (
                  <motion.button
                    key={appointment.id}
                    onClick={() => router.push("/dashboard/secretary/attendance")}
                    className="w-full rounded-xl px-3 py-3 border flex items-center justify-between gap-3 text-left"
                    style={{
                      backgroundColor: badgeConfig.cardBg,
                      borderColor: badgeConfig.cardBorder,
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#1F1F1F" }}>
                        {sectionName}
                      </p>
                      <p className="text-xs" style={{ color: "#6B7280" }}>
                        {status === "synced" ? "Attendance submitted" : status === "saved_locally" ? "Will sync when online" : "Tap to take attendance"}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{
                        backgroundColor: badgeConfig.bg,
                        color: badgeConfig.text,
                      }}
                    >
                      {badgeConfig.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div
          className="rounded-2xl border p-4 sm:p-5"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} style={{ color: "#1E3A5F" }} />
            <h5 className="text-sm sm:text-base font-bold" style={{ color: "#1F1F1F" }}>
              Recent Activity
            </h5>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-center py-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: "#F1F5F9" }}
              >
                <CalendarDays size={20} style={{ color: "#9CA3AF" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#374151" }}>
                No Activity Yet
              </p>
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                Your attendance submissions will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs" style={{ color: "#6B7280" }}>
                <span>{recentSessions.length} recent session(s)</span>
                <span>{totalStudentsMarkedRecent} students marked</span>
              </div>
              <div
                className="rounded-lg px-3 py-2"
                style={{ backgroundColor: "#F9FAFB" }}
              >
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  Latest: <span className="font-semibold" style={{ color: "#1F1F1F" }}>{latestSessionDate}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Attention Needed */}
        {!isLoading && notRecordedCount > 0 && (
          <motion.div
            className="rounded-xl p-4 border flex items-start gap-3"
            style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#F59E0B" }}
            >
              <AlertCircle size={16} style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#92400E" }}>
                Attention Needed
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#A16207" }}>
                {notRecordedCount} section(s) still need attendance today
              </p>
            </div>
          </motion.div>
        )}

        {/* Pending Sync Notice */}
        {!isLoading && pendingSyncCount > 0 && (
          <motion.div
            className="rounded-xl p-4 border flex items-start gap-3"
            style={{ backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#92400E" }}
            >
              <CloudOff size={16} style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#92400E" }}>
                Pending Sync
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#A16207" }}>
                {pendingSyncCount} attendance record(s) saved locally and waiting to sync
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
