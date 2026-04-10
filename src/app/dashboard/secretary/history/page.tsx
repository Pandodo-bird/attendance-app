"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, ChevronRight, FileText, RefreshCw, X, Users, CheckCircle, XCircle, FileBadge } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/lib/networkStatus";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AttendanceHistoryCursor, getSecretaryAttendanceHistoryPaginated, calculateAttendanceStats, Attendance, getSectionById, Section } from "@/lib/firestore";
import { readSecretaryBootstrapCache } from "@/lib/secretaryOfflineBootstrap";
import { readSecretaryHistoryCache, replaceSecretaryHistoryCache } from "@/lib/secretaryOfflineHistory";
import { OfflineAttendanceQueueItem, useOfflineHistoryQueueItems } from "@/lib/offlineQueue";
import SecretaryStatusStrip from "@/components/SecretaryStatusStrip";
import { PopupAlert } from "@/components/ui";

interface AttendanceSessionCardProps {
  session: Attendance;
  section?: Section | null;
  badgeLabel?: string;
  badgeColor?: { bg: string; text: string };
  isOfflinePending?: boolean;
  onClick: () => void;
}

interface HistorySessionItem {
  session: Attendance;
  source: "remote" | "local";
  queueStatus?: OfflineAttendanceQueueItem["status"];
}

const HISTORY_PAGE_SIZE = 10;

function buildLocalHistorySession(item: OfflineAttendanceQueueItem): Attendance {
  const records = Object.fromEntries(
    item.students.map((student) => [
      student.lrn,
      {
        studentName: student.studentName,
        status: student.status,
        timeRecorded: new Date(item.updatedAt),
        recordedByUid: item.secretaryUid,
      },
    ])
  );

  return {
    id: item.attendanceId,
    sectionId: item.sectionId,
    teacherId: item.teacherId,
    secretaryUid: item.secretaryUid,
    date: item.date,
    schoolYear: item.schoolYear,
    status: "locked",
    records,
    createdAt: new Date(item.createdAt),
    lockedAt: new Date(item.updatedAt),
    submittedByUid: item.secretaryUid,
    submittedByRole: "secretary",
  };
}

function getLocalBadge(status: OfflineAttendanceQueueItem["status"]): { label: string; color: { bg: string; text: string } } {
  if (status === "syncing") {
    return { label: "Syncing", color: { bg: "#DBEAFE", text: "#1D4ED8" } };
  }

  if (status === "failed") {
    return { label: "Retrying", color: { bg: "#FEF3C7", text: "#92400E" } };
  }

  if (status === "needs_review") {
    return { label: "Needs Review", color: { bg: "#FEE2E2", text: "#991B1B" } };
  }

  return { label: "Offline — Pending Sync", color: { bg: "#FEF3C7", text: "#92400E" } };
}

export default function HistoryPage() {
  const { user } = useAuth();
  const { isOnline, hasResolved } = useNetworkStatus();
  const [selectedSession, setSelectedSession] = useState<Attendance | null>(null);
  const [dismissedFetchError, setDismissedFetchError] = useState<string | null>(null);
  const [cachedSessions, setCachedSessions] = useState<Attendance[]>([]);
  const [historyCacheLoaded, setHistoryCacheLoaded] = useState<boolean>(false);
  const cachedBootstrap = useMemo(() => readSecretaryBootstrapCache(user?.uid), [user?.uid]);
  const cachedSectionsById = useMemo(() => cachedBootstrap?.sectionsById ?? {}, [cachedBootstrap]);
  const currentSchoolYear = useMemo(() => {
    const schoolYears = Array.from(
      new Set((cachedBootstrap?.appointments ?? []).map((appointment) => appointment.schoolYear).filter(Boolean))
    ).sort();

    return schoolYears.at(-1) ?? null;
  }, [cachedBootstrap]);
  const offlineQueueState = useOfflineHistoryQueueItems(user?.uid);

  const {
    data,
    isLoading,
    error: fetchError,
    refetch,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["attendanceHistory", user?.uid],
    queryFn: ({ pageParam }) => getSecretaryAttendanceHistoryPaginated(user?.uid || "", {
      pageSize: HISTORY_PAGE_SIZE,
      cursor: (pageParam as AttendanceHistoryCursor | null) ?? null,
    }),
    initialPageParam: null as AttendanceHistoryCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user?.uid && hasResolved && isOnline,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    let cancelled = false;

    const loadCachedHistory = async () => {
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      if (!user?.uid || !currentSchoolYear) {
        setCachedSessions([]);
        setHistoryCacheLoaded(true);
        return;
      }

      setHistoryCacheLoaded(false);
      const sessions = await readSecretaryHistoryCache(user.uid, currentSchoolYear);
      if (!cancelled) {
        setCachedSessions(sessions);
        setHistoryCacheLoaded(true);
      }
    };

    void loadCachedHistory();

    return () => {
      cancelled = true;
    };
  }, [currentSchoolYear, user?.uid]);

  const sessions = useMemo(() => data?.pages.flatMap((page) => page.sessions) ?? [], [data]);
  const hasRemoteHistoryResult = data !== undefined;
  const hasRemoteData = !isLoading && hasRemoteHistoryResult;
  const isPageLoading = (!!user?.uid && !historyCacheLoaded) || (isOnline && isLoading);
  const mergedHistoryItems = useMemo(() => {
    const remoteItems: HistorySessionItem[] = (hasRemoteData ? sessions : cachedSessions).map((session) => ({
      session,
      source: "remote",
    }));
    const localItems: HistorySessionItem[] = offlineQueueState.items.map((item) => ({
      session: buildLocalHistorySession(item),
      source: "local",
      queueStatus: item.status,
    }));
    const seenAttendanceIds = new Set<string>();
    const merged = [...remoteItems, ...localItems].filter((item) => {
      if (seenAttendanceIds.has(item.session.id)) {
        return false;
      }

      seenAttendanceIds.add(item.session.id);
      return true;
    });

    return merged.sort((a, b) => {
      if (a.session.date !== b.session.date) {
        return b.session.date.localeCompare(a.session.date);
      }

      const aTime = a.session.lockedAt instanceof Date ? a.session.lockedAt.getTime() : 0;
      const bTime = b.session.lockedAt instanceof Date ? b.session.lockedAt.getTime() : 0;
      return bTime - aTime;
    });
  }, [cachedSessions, hasRemoteData, offlineQueueState.items, sessions]);

  const totalSessions = mergedHistoryItems.length;

  const totalStudentsMarked = mergedHistoryItems.reduce((acc, item) => {
    return acc + (item.session.records ? Object.keys(item.session.records).length : 0);
  }, 0);

  const fetchErrorMessage = fetchError
    ? `Failed to load attendance history: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`
    : null;

  useEffect(() => {
    if (fetchError) {
      console.error("FETCH ERROR:", fetchError);
    }
  }, [fetchError]);

  useEffect(() => {
    if (!user?.uid || !currentSchoolYear || !hasRemoteHistoryResult) {
      return;
    }

    void replaceSecretaryHistoryCache(user.uid, currentSchoolYear, sessions);
  }, [currentSchoolYear, hasRemoteHistoryResult, sessions, user?.uid]);

  const handleLoadMore = () => {
    if (hasNextPage) {
      void fetchNextPage();
    }
  };

  const handleRefresh = () => {
    if (isOnline) {
      void refetch();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ backgroundColor: "#F8FAFC" }}>
      {fetchErrorMessage && dismissedFetchError !== fetchErrorMessage && (
        <PopupAlert
          message={fetchErrorMessage}
          type="error"
          onClose={() => setDismissedFetchError(fetchErrorMessage)}
        />
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pb-[var(--secretary-mobile-nav-offset)] sm:p-4 md:p-6 lg:p-8 lg:pb-8">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
          <div className="sticky top-0 z-10 shrink-0 bg-[#F8FAFC] pb-4 sm:pb-6">
            {/* Page Header */}
            <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold" style={{ color: "#1F1F1F" }}>
                  Attendance History
                </h1>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  View your past submissions
                </p>
              </div>
            </div>
            {isOnline && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading || isRefetching}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D5DB", color: "#1E3A5F" }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading || isRefetching ? "animate-spin" : ""}`} />
                {isLoading || isRefetching ? "Refreshing..." : "Refresh History"}
              </button>
            )}
            <SecretaryStatusStrip />
            </div>

            {(isOnline || mergedHistoryItems.length > 0) && !isPageLoading && <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <motion.div
                className="rounded-xl p-3 sm:p-4 border"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0, duration: 0.25 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#E6DEFF" }}>
                    <Calendar className="w-3 h-3" style={{ color: "#493598" }} />
                  </div>
                  <p className="text-[10px] sm:text-xs font-semibold uppercase" style={{ color: "#6B7280" }}>
                    Sessions
                  </p>
                </div>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: "#1F1F1F" }}>
                  {totalSessions}
                </p>
              </motion.div>

              <motion.div
                className="rounded-xl p-3 sm:p-4 border"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.25 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#D4F0E8" }}>
                    <Users className="w-3 h-3" style={{ color: "#00695C" }} />
                  </div>
                  <p className="text-[10px] sm:text-xs font-semibold uppercase" style={{ color: "#6B7280" }}>
                    Records
                  </p>
                </div>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: "#1F1F1F" }}>
                  {totalStudentsMarked}
                </p>
              </motion.div>

              <motion.div
                className="rounded-xl p-3 sm:p-4 border"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.25 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FFE5D0" }}>
                    <Clock className="w-3 h-3" style={{ color: "#C45C00" }} />
                  </div>
                  <p className="text-[10px] sm:text-xs font-semibold uppercase" style={{ color: "#6B7280" }}>
                    Avg/Session
                  </p>
                </div>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: "#1F1F1F" }}>
                  {totalSessions > 0 ? Math.round(totalStudentsMarked / totalSessions) : 0}
                </p>
              </motion.div>
            </div>}
          </div>

          {!isOnline && !isPageLoading && mergedHistoryItems.length === 0 && (
            <motion.div
              className="rounded-2xl p-6 sm:p-12 text-center border"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#F1F5F9" }}
              >
                <Calendar className="w-8 h-8" style={{ color: "#6B7280" }} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: "#1F1F1F" }}>
                No Attendance History
              </h3>
              <p className="text-xs sm:text-sm" style={{ color: "#6B7280" }}>
                No cached history is available on this device yet.
              </p>
            </motion.div>
          )}

          {/* Loading State */}
          {isPageLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm" style={{ color: "#6B7280" }}>Loading history...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {(isOnline || mergedHistoryItems.length > 0) && !isPageLoading && mergedHistoryItems.length === 0 && (
            <motion.div
              className="rounded-2xl p-6 sm:p-12 text-center border"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#F1F5F9" }}
              >
                <Calendar className="w-8 h-8" style={{ color: "#6B7280" }} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: "#1F1F1F" }}>
                No Attendance History
              </h3>
              <p className="text-xs sm:text-sm" style={{ color: "#6B7280" }}>
                You haven&apos;t submitted any attendance records yet
              </p>
            </motion.div>
          )}

          {/* Session Cards */}
          {!isPageLoading && mergedHistoryItems.length > 0 && (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="space-y-2 sm:space-y-3 pb-[calc(var(--secretary-mobile-nav-offset)+1rem)] lg:pb-4">
              {!isOnline && offlineQueueState.items.length === 0 && (
                <div
                  className="rounded-xl border px-3 py-2 text-xs font-medium"
                  style={{ backgroundColor: "#EFF6FF", borderColor: "#BFDBFE", color: "#1D4ED8" }}
                >
                  Showing cached history from this device. New history will load after reconnecting.
                </div>
              )}

              {mergedHistoryItems.map((item) => {
                const localBadge = item.source === "local" && item.queueStatus ? getLocalBadge(item.queueStatus) : null;

                return (
                <AttendanceSessionCardWithSection
                  key={`${item.source}:${item.session.id}`}
                  session={item.session}
                  fallbackSection={cachedSectionsById[item.session.sectionId]}
                  badgeLabel={localBadge?.label}
                  badgeColor={localBadge?.color}
                  isOfflinePending={item.source === "local"}
                  onClick={() => setSelectedSession(item.session)}
                />
                );
              })}

              {/* Load More Button */}
              {isOnline && hasNextPage && (
                <div className="py-6 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isFetchingNextPage}
                    className="w-full px-6 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "#1e3a5f",
                      color: "#FFFFFF",
                    }}
                  >
                    {isFetchingNextPage ? "Loading More..." : "Load More"}
                  </button>
                </div>
              )}

              {/* End of List Message */}
              {(!isOnline || !hasNextPage) && mergedHistoryItems.length > 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm" style={{ color: "#9CA3AF" }}>
                    {isOnline ? "You've reached the end of your history" : "You are offline. Cached history for this device ends here."}
                  </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {selectedSession && (
          <SessionDetailModal
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AttendanceSessionCardWithSection({
  session,
  fallbackSection,
  badgeLabel,
  badgeColor,
  isOfflinePending,
  onClick,
}: {
  session: Attendance;
  fallbackSection?: Section | null;
  badgeLabel?: string;
  badgeColor?: { bg: string; text: string };
  isOfflinePending?: boolean;
  onClick: () => void;
}) {
  const { data: section } = useQuery({
    queryKey: ['section', session.sectionId],
    queryFn: () => getSectionById(session.sectionId),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!session.sectionId,
  });

  return (
    <AttendanceSessionCard
      session={session}
      section={section ?? fallbackSection}
      badgeLabel={badgeLabel}
      badgeColor={badgeColor}
      isOfflinePending={isOfflinePending}
      onClick={onClick}
    />
  );
}

function AttendanceSessionCard({ session, section, badgeLabel, badgeColor, isOfflinePending, onClick }: AttendanceSessionCardProps) {
  const stats = calculateAttendanceStats(session.records);
  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late + stats.excused) / stats.total) * 100)
    : 0;

  const sectionDisplayName = section
    ? `${section.gradeLevel} - ${section.sectionName}`
    : "Unknown Section";

  const submittedBy = session.submittedByRole === "teacher"
    ? "By Teacher"
    : session.submittedByRole === "secretary"
    ? "By Secretary"
    : "Shared";

  return (
    <motion.div
      onClick={onClick}
      className="rounded-xl p-3 sm:p-4 cursor-pointer border"
      style={{
        backgroundColor: isOfflinePending ? "#FEF3C7" : "#FFFFFF",
        borderColor: isOfflinePending ? "#FDE68A" : "#E5E7EB",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0, duration: 0.2 }}
      whileHover={{
        borderColor: isOfflinePending ? "#FCD34D" : "#D1D5DB",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start gap-3">
        {/* Date Badge */}
        <div
          className="w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0"
          style={{ backgroundColor: "#1e3a5f" }}
        >
          <span className="text-xs font-bold leading-none" style={{ color: "#FFFFFF" }}>
            {new Date(session.date).getDate()}
          </span>
          <span className="text-[10px] uppercase leading-none mt-0.5" style={{ color: "#BFDBFE" }}>
            {new Date(session.date).toLocaleDateString("en-US", { month: "short" })}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold truncate" style={{ color: "#1F1F1F" }}>
            {sectionDisplayName}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: "#6C5CE7" }}>
              {submittedBy}
            </span>
            {badgeLabel && badgeColor && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: badgeColor.bg, color: badgeColor.text }}
              >
                {badgeLabel}
              </span>
            )}
            <span className="text-xs" style={{ color: "#9CA3AF" }}>
              •
            </span>
            <span className="text-xs" style={{ color: "#6B7280" }}>
              {stats.total} students
            </span>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" style={{ color: "#10B981" }} />
              <span className="text-xs font-medium" style={{ color: "#10B981" }}>{stats.present}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" style={{ color: "#F59E0B" }} />
              <span className="text-xs font-medium" style={{ color: "#F59E0B" }}>{stats.late}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-3 h-3" style={{ color: "#EF4444" }} />
              <span className="text-xs font-medium" style={{ color: "#EF4444" }}>{stats.absent}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileBadge className="w-3 h-3" style={{ color: "#2563EB" }} />
              <span className="text-xs font-medium" style={{ color: "#2563EB" }}>{stats.excused}</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="text-xs font-bold" style={{ color: "#1e3a5f" }}>
                {attendanceRate}%
              </span>
              <span className="text-xs" style={{ color: "#6B7280" }}>rate</span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 shrink-0 mt-1" style={{ color: "#9CA3AF" }} />
      </div>
    </motion.div>
  );
}

function SessionDetailModal({
  session,
  onClose,
}: {
  session: Attendance;
  onClose: () => void;
}) {
  const stats = calculateAttendanceStats(session.records);
  const records = session.records || {};
  const students = Object.entries(records).sort((a, b) => {
    const nameA = a[1].studentName;
    const nameB = b[1].studentName;
    return nameA.localeCompare(nameB);
  });

  const formattedDate = new Date(session.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const statusColors: Record<string, { bg: string; text: string }> = {
    present: { bg: "#D1FAE5", text: "#065F46" },
    late: { bg: "#FEF3C7", text: "#92400E" },
    absent: { bg: "#FEE2E2", text: "#991B1B" },
    excused: { bg: "#DBEAFE", text: "#1E40AF" },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "#FFFFFF" }}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 border-b shrink-0"
          style={{ borderColor: "#E5E7EB" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-base sm:text-lg font-bold" style={{ color: "#1F1F1F" }}>
                Attendance Details
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                {formattedDate}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#F3F4F6" }}
            >
              <X className="w-4 h-4" style={{ color: "#6B7280" }} />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-5 gap-2">
            <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "#D1FAE5" }}>
              <p className="text-sm sm:text-base font-bold" style={{ color: "#065F46" }}>{stats.present}</p>
              <p className="text-[10px] font-medium" style={{ color: "#047857" }}>Present</p>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "#FEF3C7" }}>
              <p className="text-sm sm:text-base font-bold" style={{ color: "#92400E" }}>{stats.late}</p>
              <p className="text-[10px] font-medium" style={{ color: "#B45309" }}>Late</p>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "#FEE2E2" }}>
              <p className="text-sm sm:text-base font-bold" style={{ color: "#991B1B" }}>{stats.absent}</p>
              <p className="text-[10px] font-medium" style={{ color: "#B91C1C" }}>Absent</p>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "#DBEAFE" }}>
              <p className="text-sm sm:text-base font-bold" style={{ color: "#1D4ED8" }}>{stats.excused}</p>
              <p className="text-[10px] font-medium" style={{ color: "#1E40AF" }}>Excused</p>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "#E0E7FF" }}>
              <p className="text-sm sm:text-base font-bold" style={{ color: "#3730A3" }}>{stats.total}</p>
              <p className="text-[10px] font-medium" style={{ color: "#4338CA" }}>Total</p>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-4">
          {students.length > 0 ? (
            <div className="space-y-2">
              {students.map(([lrn, record]) => (
                <div
                  key={lrn}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: "#F9FAFB" }}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-medium truncate" style={{ color: "#1F1F1F" }}>
                      {record.studentName}
                    </p>
                    {record.remarks && (
                      <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                        {record.remarks}
                      </p>
                    )}
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase shrink-0"
                    style={{
                      backgroundColor: statusColors[record.status]?.bg || "#F3F4F6",
                      color: statusColors[record.status]?.text || "#6B7280",
                    }}
                  >
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "#6B7280" }}>
                No attendance records for this session
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t shrink-0"
          style={{ borderColor: "#E5E7EB" }}
        >
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            style={{ backgroundColor: "#1e3a5f", color: "#FFFFFF" }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
