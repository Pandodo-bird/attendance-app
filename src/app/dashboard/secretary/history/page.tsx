"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, ChevronRight, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getSecretaryAttendanceHistoryPaginated, calculateAttendanceStats, Attendance, getSectionById, Section } from "@/lib/firestore";
import { PopupAlert } from "@/components/ui";
import { DocumentSnapshot } from "firebase/firestore";

interface AttendanceSessionCardProps {
  session: Attendance;
  section?: Section | null;
  onClick: () => void;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<Attendance | null>(null);
  const [dismissedFetchError, setDismissedFetchError] = useState<string | null>(null);

  // Infinite query for paginated attendance history (10 sessions per page)
  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    error: fetchError,
  } = useInfiniteQuery({
    queryKey: ["attendanceHistory", user?.uid],
    queryFn: async ({ pageParam }: { pageParam: DocumentSnapshot | null }) => {
      console.log("📄 FETCHING PAGE:", {
        pageParam: pageParam ? "cursor exists" : "first page",
        uid: user?.uid,
      });
      
      const result = await getSecretaryAttendanceHistoryPaginated(
        user?.uid || "",
        10, // Load 10 sessions per page
        pageParam
      );
      
      console.log("✅ RECEIVED:", {
        sessionsCount: result.sessions.length,
        hasMore: result.hasMore,
      });
      
      return result;
    },
    enabled: !!user?.uid,
    initialPageParam: null as DocumentSnapshot | null,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.lastVisible : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - sessions don't change
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Debug: Log only when data actually changes (not on every render)
  const previousTotalRef = useRef<number>(-1);

  useEffect(() => {
    const currentTotal = data?.pages.flatMap(p => p.sessions).length || 0;
    
    // Only log if total changed (prevents duplicate logs in Strict Mode)
    if (currentTotal !== previousTotalRef.current) {
      console.log("📊 DATA CHANGED:", {
        pages: data?.pages.length,
        totalSessions: currentTotal,
        hasNextPage,
      });
      previousTotalRef.current = currentTotal;
    }
  }, [data, hasNextPage]);

  // Flatten all pages into a single array
  const sessions = data?.pages.flatMap(page => page.sessions) || [];
  const totalSessions = sessions.length;

  // Calculate total records across all loaded sessions
  const totalStudentsMarked = sessions.reduce((acc, session) => {
    return acc + (session.records ? Object.keys(session.records).length : 0);
  }, 0);

  const fetchErrorMessage = fetchError
    ? `Failed to load attendance history: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`
    : null;

  // Show error in console if fetch fails
  useEffect(() => {
    if (fetchError) {
      console.error("❌ FETCH ERROR:", fetchError);
    }
  }, [fetchError]);

  // Handle manual load more
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      console.log("📥 Loading more sessions...");
      fetchNextPage();
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      {/* Error Alert */}
      {fetchErrorMessage && dismissedFetchError !== fetchErrorMessage && (
        <PopupAlert
          message={fetchErrorMessage}
          type="error"
          onClose={() => setDismissedFetchError(fetchErrorMessage)}
        />
      )}

      {/* Main Content */}
      <main className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "#1F1F1F" }}>
                Attendance History
              </h1>
            </div>
            <p className="text-xs sm:text-sm" style={{ color: "#6B7280" }}>
              View your past attendance submissions and statistics
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <motion.div
              className="rounded-xl p-5"
              style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0, duration: 0.25 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#E6DEFF" }}>
                  <Calendar className="w-4 h-4" style={{ color: "#493598" }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                  Sessions Loaded
                </p>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#1F1F1F" }}>
                {totalSessions}
              </p>
              {hasNextPage && (
                <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                  Scroll to load more
                </p>
              )}
            </motion.div>

            <motion.div
              className="rounded-xl p-5"
              style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.25 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#D4F0E8" }}>
                  <Clock className="w-4 h-4" style={{ color: "#00695C" }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                  Total Records
                </p>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#1F1F1F" }}>
                {totalStudentsMarked}
              </p>
            </motion.div>

            <motion.div
              className="rounded-xl p-5"
              style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.25 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FFE5D0" }}>
                  <FileText className="w-4 h-4" style={{ color: "#C45C00" }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                  Avg. Per Session
                </p>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#1F1F1F" }}>
                {totalSessions > 0 ? Math.round(totalStudentsMarked / totalSessions) : 0}
              </p>
            </motion.div>
          </div>

          {/* Section Title */}
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-semibold" style={{ color: "#1F1F1F" }}>
              Recent Sessions
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: "#6B7280" }}>
              Click on a session to view detailed attendance
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm" style={{ color: "#6B7280" }}>Loading history...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && sessions.length === 0 && (
            <motion.div
              className="rounded-2xl p-6 sm:p-12 text-center"
              style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
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
              <p className="text-xs sm:text-sm mb-6" style={{ color: "#6B7280" }}>
                You haven&apos;t submitted any attendance records yet. Start by marking attendance for your class.
              </p>
            </motion.div>
          )}

          {/* Session Cards */}
          {!isLoading && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((session) => (
                <AttendanceSessionCardWithSection
                  key={session.id}
                  session={session}
                  onClick={() => setSelectedSession(session)}
                />
              ))}

              {/* Load More Button */}
              {hasNextPage && (
                <div className="py-8 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isFetchingNextPage}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: isFetchingNextPage ? "#9CA3AF" : "#1e3a5f",
                      color: "#FFFFFF",
                    }}
                    onMouseEnter={(e) => {
                      if (!isFetchingNextPage) {
                        e.currentTarget.style.backgroundColor = "#16304a";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isFetchingNextPage) {
                        e.currentTarget.style.backgroundColor = "#1e3a5f";
                      }
                    }}
                  >
                    {isFetchingNextPage ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </span>
                    ) : (
                      "Load More Sessions"
                    )}
                  </button>
                </div>
              )}

              {/* End of List Message */}
              {!hasNextPage && sessions.length > 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "#9CA3AF" }}>
                    You&apos;ve reached the end of your attendance history
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}

function AttendanceSessionCardWithSection({
  session,
  onClick,
}: {
  session: Attendance;
  onClick: () => void;
}) {
  const { data: section } = useQuery({
    queryKey: ['section', session.sectionId],
    queryFn: () => getSectionById(session.sectionId),
    staleTime: 30 * 60 * 1000, // 30 minutes - sections rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!session.sectionId,
  });

  return <AttendanceSessionCard session={session} section={section} onClick={onClick} />;
}

function AttendanceSessionCard({ session, section, onClick }: AttendanceSessionCardProps) {
  const stats = calculateAttendanceStats(session.records);
  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late + stats.excused) / stats.total) * 100)
    : 0;

  const formattedDate = new Date(session.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const sectionDisplayName = section
    ? `${section.gradeLevel} - ${section.sectionName}`
    : "Unknown Section";

  return (
    <motion.div
      onClick={onClick}
      className="rounded-xl p-4 sm:p-5 cursor-pointer transition-colors"
      style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0, duration: 0.2 }}
      whileHover={{
        borderColor: "#D1D5DB",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Side - Date, Section & Subject */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: "#1e3a5f" }}
            >
              <Calendar className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
              {formattedDate}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold mb-1" style={{ color: "#1F1F1F" }}>
            {sectionDisplayName}
          </h3>
          <p className="text-sm font-medium" style={{ color: "#6C5CE7" }}>
            {session.subject}
          </p>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            {stats.total} students marked
          </p>
        </div>

        {/* Middle - Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 lg:mx-6">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: "#10B981" }}>
              {stats.present}
            </p>
            <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Present
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: "#F59E0B" }}>
              {stats.late}
            </p>
            <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Late
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: "#EF4444" }}>
              {stats.absent}
            </p>
            <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Absent
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: "#2563EB" }}>
              {stats.excused}
            </p>
            <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Excused
            </p>
          </div>
          <div className="text-center min-w-[60px]">
            <p className="text-2xl font-bold" style={{ color: "#1e3a5f" }}>
              {attendanceRate}%
            </p>
            <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Rate
            </p>
          </div>
        </div>

        {/* Right Side - Arrow */}
        <div className="flex items-center justify-end lg:justify-center">
          <ChevronRight className="w-5 h-5" style={{ color: "#9CA3AF" }} />
        </div>
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

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        className="rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: "#FFFFFF" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 sm:p-6 border-b"
          style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-1" style={{ color: "#1F1F1F" }}>
                {session.subject}
              </h2>
              <p className="text-xs sm:text-sm" style={{ color: "#6B7280" }}>
                {formattedDate}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: "#F3F4F6" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#E5E7EB";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#F3F4F6";
              }}
            >
              <span style={{ fontSize: "20px", color: "#6B7280" }}>&times;</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "#D1FAE5" }}>
              <p className="text-lg font-bold" style={{ color: "#065F46" }}>{stats.present}</p>
              <p className="text-xs font-medium" style={{ color: "#047857" }}>Present</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "#FEF3C7" }}>
              <p className="text-lg font-bold" style={{ color: "#92400E" }}>{stats.late}</p>
              <p className="text-xs font-medium" style={{ color: "#B45309" }}>Late</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "#FEE2E2" }}>
              <p className="text-lg font-bold" style={{ color: "#991B1B" }}>{stats.absent}</p>
              <p className="text-xs font-medium" style={{ color: "#B91C1C" }}>Absent</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "#DBEAFE" }}>
              <p className="text-lg font-bold" style={{ color: "#1D4ED8" }}>{stats.excused}</p>
              <p className="text-xs font-medium" style={{ color: "#1E40AF" }}>Excused</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "#E0E7FF" }}>
              <p className="text-lg font-bold" style={{ color: "#3730A3" }}>{stats.total}</p>
              <p className="text-xs font-medium" style={{ color: "#4338CA" }}>Total</p>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {students.length > 0 ? (
            <div className="space-y-2">
              {students.map(([lrn, record]) => (
                <div
                  key={lrn}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg"
                  style={{ backgroundColor: "#F9FAFB" }}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "#1F1F1F" }}>
                      {record.studentName}
                    </p>
                    {record.remarks && (
                      <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                        {record.remarks}
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor:
                          record.status === "present"
                            ? "#D1FAE5"
                            : record.status === "late"
                            ? "#FEF3C7"
                            : record.status === "excused"
                            ? "#DBEAFE"
                            : "#FEE2E2",
                        color:
                          record.status === "present"
                            ? "#065F46"
                            : record.status === "late"
                            ? "#92400E"
                            : record.status === "excused"
                            ? "#1E40AF"
                            : "#991B1B",
                      }}
                    >
                      {record.status}
                    </span>
                  </div>
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
          className="p-4 border-t flex justify-end"
          style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            style={{ backgroundColor: "#1e3a5f", color: "#FFFFFF" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#16304a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#1e3a5f";
            }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
