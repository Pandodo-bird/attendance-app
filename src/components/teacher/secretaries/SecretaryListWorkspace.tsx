"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, UserPlus, Users } from "lucide-react";
import { SecretaryCard } from "@/components/teacher/secretaries";
import type { SessionWithStats } from "@/components/teacher/secretary-records";

interface SecretaryCardItem {
  secretaryUid: string;
  secretaryLrn: string;
  secretaryName: string;
  sectionId: string;
  sectionName: string;
  gradeLevel: string;
  schoolYear: string;
  appointedAt: Date | string | { toDate: () => Date };
}

interface SecretaryGroupedRecords {
  secretaryUid: string;
  secretaryLrn: string;
  secretaryName: string;
  sessions: SessionWithStats[];
}

interface SecretaryListWorkspaceProps {
  secretaryCards: SecretaryCardItem[];
  selectedSecretaryRecordsGroup: SecretaryGroupedRecords | null;
  activeSecretaryCount: number;
  today: string;
  getTodaySessionStatusForSection: (sectionId: string) => "none" | "open" | "locked";
  isLoadingSelectedSecretaryHistory?: boolean;
  selectedSecretaryHistoryErrorMessage?: string | null;
  hasMoreSelectedSecretaryHistory?: boolean;
  isFetchingNextSecretaryHistoryPage?: boolean;
  onLoadMoreSelectedSecretaryHistory?: () => void;
  onSelectSecretary: (secretaryUid: string) => void;
  onBackToSecretaries: () => void;
  onSelectSession: (sessionId: string) => void;
  onAppointSecretary?: () => void;
}

function formatDateLong(dateString: string): string {
  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateString;
  }

  return parsedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SecretaryListWorkspace({
  secretaryCards,
  selectedSecretaryRecordsGroup,
  activeSecretaryCount,
  today,
  getTodaySessionStatusForSection,
  isLoadingSelectedSecretaryHistory = false,
  selectedSecretaryHistoryErrorMessage = null,
  hasMoreSelectedSecretaryHistory = false,
  isFetchingNextSecretaryHistoryPage = false,
  onLoadMoreSelectedSecretaryHistory,
  onSelectSecretary,
  onBackToSecretaries,
  onSelectSession,
  onAppointSecretary,
}: SecretaryListWorkspaceProps) {
  return (
    <div className="space-y-6">
      <div
        className="rounded-[28px] border p-5 lg:p-6"
        style={{
          background: "linear-gradient(135deg, #F7FBFF 0%, #EEF5FF 58%, #E8F0FB 100%)",
          borderColor: "#D7E2EF",
        }}
      >
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: "#56738F" }}>
              Secretary List
            </p>
            <h4 className="mt-3 text-2xl font-bold leading-tight lg:text-3xl" style={{ color: "#102A43" }}>
              View your appointed secretaries and open their recorded sessions.
            </h4>
            <p className="mt-3 max-w-3xl text-sm lg:text-[15px]" style={{ color: "#486581" }}>
              Use this workspace to manage secretary assignments and review the attendance sessions each secretary has submitted for your sections.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-2xl border px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#829AB1" }}>
                Active Secretaries
              </p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "#102A43" }}>
                {activeSecretaryCount}
              </p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#829AB1" }}>
                Recorded Sessions
              </p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "#102A43" }}>
                {selectedSecretaryRecordsGroup?.sessions.length ?? 0}
              </p>
            </div>
            {onAppointSecretary && (
              <motion.button
                type="button"
                onClick={onAppointSecretary}
                className="col-span-2 border-2 border-dashed rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#C9B8D6", color: "#484553" }}
                whileHover={{
                  borderColor: "#6C5CE7",
                  color: "#6C5CE7",
                  scale: 1.02,
                }}
                transition={{ duration: 0.15 }}
              >
                <motion.div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#f1ecf7" }}
                  whileHover={{ backgroundColor: "#D4C4E8", scale: 1.05 }}
                  transition={{ duration: 0.15 }}
                >
                  <UserPlus size={20} />
                </motion.div>
                <div className="text-left">
                  <p className="text-sm font-bold">Appoint Secretary</p>
                  <p className="text-xs" style={{ color: "#829AB1" }}>Create a new secretary account</p>
                </div>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {selectedSecretaryRecordsGroup ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={onBackToSecretaries}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
            style={{ backgroundColor: "#F8FBFF", borderColor: "#C9D9EA", color: "#1E3A5F" }}
          >
            <ArrowLeft size={16} />
            Back to Secretaries
          </button>

          <motion.div
            key={selectedSecretaryRecordsGroup.secretaryUid}
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#D7E2EF" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div
              className="px-5 py-5 lg:px-6 lg:py-6"
              style={{
                background: "linear-gradient(135deg, #102A43 0%, #1E3A5F 60%, #25496E 100%)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                  >
                    <Users size={22} style={{ color: "#FFFFFF" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "#FFFFFF" }}>
                      {selectedSecretaryRecordsGroup.secretaryName}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                      LRN {selectedSecretaryRecordsGroup.secretaryLrn}
                    </p>
                  </div>
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
                >
                  {selectedSecretaryRecordsGroup.sessions.length} session{selectedSecretaryRecordsGroup.sessions.length !== 1 ? "s" : ""}
                </div>
              </div>

              {selectedSecretaryRecordsGroup.sessions.length > 0 && (() => {
                const uniqueSections = Array.from(
                  new Set(selectedSecretaryRecordsGroup.sessions.map((s) => s.sectionLabel))
                );
                const uniqueRecorders = Array.from(
                  new Set(selectedSecretaryRecordsGroup.sessions.map((s) => s.recorderName))
                );

                return (
                  <div className="mt-4 pt-4 flex flex-wrap gap-x-6 gap-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                          Section{uniqueSections.length > 1 ? "s" : ""}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                          {uniqueSections.length === 1 ? uniqueSections[0] : `${uniqueSections.length} sections`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                          Recorder{uniqueRecorders.length > 1 ? "s" : ""}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                          {uniqueRecorders.length === 1 ? uniqueRecorders[0] : `${uniqueRecorders.length} recorders`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {isLoadingSelectedSecretaryHistory ? (
              <div className="px-5 py-10 text-sm text-center" style={{ color: "#64748B" }}>
                Loading secretary sessions...
              </div>
            ) : selectedSecretaryHistoryErrorMessage ? (
              <div className="px-5 py-10 text-sm text-center" style={{ color: "#DC2626" }}>
                Failed to load secretary sessions. {selectedSecretaryHistoryErrorMessage}
              </div>
            ) : selectedSecretaryRecordsGroup.sessions.length === 0 ? (
              <div className="px-5 py-10 text-sm text-center" style={{ color: "#94A3B8" }}>
                No attendance sessions submitted by this secretary yet.
              </div>
            ) : (
              <>
                <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                  {selectedSecretaryRecordsGroup.sessions.map((session) => {
                    const isToday = session.date === today;

                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => onSelectSession(session.id)}
                        className="w-full text-left px-5 py-4 lg:px-6 transition-colors group"
                        style={{ backgroundColor: isToday ? "#F0F7FF" : "#FFFFFF" }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: isToday ? "#DBEAFE" : "#F1F5F9",
                                color: isToday ? "#1D4ED8" : "#64748B",
                              }}
                            >
                              <Calendar size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold" style={{ color: "#111827" }}>
                                  {formatDateLong(session.date)}
                                </span>
                                {isToday && (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                                    style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8" }}
                                  >
                                    Today
                                  </span>
                                )}
                              </div>
                              <p className="text-xs mt-0.5 truncate" style={{ color: "#94A3B8" }}>
                                {session.submittedByRole === "teacher" ? "Recorded by Teacher" : session.submittedByRole === "secretary" ? "Recorded by Secretary" : "Shared Attendance"}
                                {" · "}
                                <span className="uppercase font-semibold">{session.status}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
                              style={{
                                backgroundColor: session.presentCount > 0 ? "#DCFCE7" : "#F1F5F9",
                                color: session.presentCount > 0 ? "#166534" : "#94A3B8",
                              }}
                            >
                              <span style={{ opacity: 0.7 }}>P</span>
                              {session.presentCount}
                            </span>
                            <span
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
                              style={{
                                backgroundColor: session.lateCount > 0 ? "#FEF3C7" : "#F1F5F9",
                                color: session.lateCount > 0 ? "#92400E" : "#94A3B8",
                              }}
                            >
                              <span style={{ opacity: 0.7 }}>L</span>
                              {session.lateCount}
                            </span>
                            <span
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
                              style={{
                                backgroundColor: session.absentCount > 0 ? "#FEE2E2" : "#F1F5F9",
                                color: session.absentCount > 0 ? "#B91C1C" : "#94A3B8",
                              }}
                            >
                              <span style={{ opacity: 0.7 }}>A</span>
                              {session.absentCount}
                            </span>
                            <span
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
                              style={{
                                backgroundColor: session.excusedCount > 0 ? "#DBEAFE" : "#F1F5F9",
                                color: session.excusedCount > 0 ? "#1D4ED8" : "#94A3B8",
                              }}
                            >
                              <span style={{ opacity: 0.7 }}>E</span>
                              {session.excusedCount}
                            </span>
                            <div
                              className="w-px h-5 mx-1"
                              style={{ backgroundColor: "#E2E8F0" }}
                            />
                            <span className="text-[11px] font-semibold" style={{ color: "#64748B" }}>
                              {session.totalStudents} total
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {hasMoreSelectedSecretaryHistory && onLoadMoreSelectedSecretaryHistory && (
                  <div className="border-t px-5 py-4 flex justify-center" style={{ borderColor: "#F1F5F9" }}>
                    <button
                      type="button"
                      onClick={onLoadMoreSelectedSecretaryHistory}
                      disabled={isFetchingNextSecretaryHistoryPage}
                      className="rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#FFFFFF", borderColor: "#C9D9EA", color: "#1E3A5F" }}
                    >
                      {isFetchingNextSecretaryHistoryPage ? "Loading more..." : "Load More Sessions"}
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      ) : secretaryCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {secretaryCards.map((card, groupIndex) => {
            const todaySessionStatus = getTodaySessionStatusForSection(card.sectionId);

            return (
              <SecretaryCard
                key={card.secretaryUid}
                secretaryUid={card.secretaryUid}
                secretaryLrn={card.secretaryLrn}
                secretaryName={card.secretaryName}
                secretaryEmail=""
                sectionId={card.sectionId}
                sectionName={card.sectionName}
                gradeLevel={card.gradeLevel}
                schoolYear={card.schoolYear}
                status="active"
                appointedAt={card.appointedAt}
                onViewRecords={() => {
                  onSelectSecretary(card.secretaryUid);
                }}
                todaySessionStatus={todaySessionStatus}
                index={groupIndex}
                viewRecordsOnly={false}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl p-6 text-center border" style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}>
          <p style={{ color: "#6B7280" }}>
            No active secretary appointments yet. Teacher section attendance is still available above.
          </p>
        </div>
      )}
    </div>
  );
}
