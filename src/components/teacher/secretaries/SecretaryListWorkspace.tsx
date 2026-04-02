"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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
  onSelectSecretary: (secretaryUid: string) => void;
  onBackToSecretaries: () => void;
  onSelectSession: (sessionId: string) => void;
}

function formatDate(dateString: string): string {
  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateString;
  }

  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SecretaryListWorkspace({
  secretaryCards,
  selectedSecretaryRecordsGroup,
  activeSecretaryCount,
  today,
  getTodaySessionStatusForSection,
  onSelectSecretary,
  onBackToSecretaries,
  onSelectSession,
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
            <div className="col-span-2 rounded-2xl border px-4 py-3" style={{ backgroundColor: "rgba(16,42,67,0.06)", borderColor: "#C9D9EA" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#627D98" }}>
                Current Selection
              </p>
              <p className="mt-2 text-base font-semibold" style={{ color: "#102A43" }}>
                {selectedSecretaryRecordsGroup?.secretaryName ?? "No secretary selected"}
              </p>
            </div>
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
            style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="px-5 py-4 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: "#F1F5F9" }}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold" style={{ color: "#1F2937" }}>
                  {selectedSecretaryRecordsGroup.secretaryName}
                </p>
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: "#EEF2FF", color: "#1E3A8A" }}
                >
                  LRN {selectedSecretaryRecordsGroup.secretaryLrn}
                </span>
              </div>
              <div
                className="px-3 py-1 rounded-full text-xs font-semibold w-fit"
                style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}
              >
                {selectedSecretaryRecordsGroup.sessions.length} session{selectedSecretaryRecordsGroup.sessions.length > 1 ? "s" : ""}
              </div>
            </div>

            {selectedSecretaryRecordsGroup.sessions.length === 0 ? (
              <div className="px-5 py-8 text-sm text-center" style={{ color: "#94A3B8" }}>
                No attendance sessions submitted by this secretary yet.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                {selectedSecretaryRecordsGroup.sessions.map((session) => {
                  const isEditingEnabled = Boolean(false);

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onSelectSession(session.id)}
                      className="w-full text-left px-5 py-4 transition-colors"
                      style={{ backgroundColor: session.date === today ? "#EFF5FD" : "#F8FBFF" }}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide"
                              style={{
                                backgroundColor: session.date === today ? "#DBEAFE" : "#E2E8F0",
                                color: session.date === today ? "#1D4ED8" : "#475569",
                              }}
                            >
                              {session.date === today ? "Today" : "Recorded"}
                            </span>
                            <span className="text-sm font-semibold" style={{ color: "#111827" }}>
                              {formatDate(session.date)}
                            </span>
                            <span
                              className="px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-wide"
                              style={{ backgroundColor: "#F1F5F9", color: "#475569" }}
                            >
                              {session.submittedByRole === "teacher" ? "Recorded by Teacher" : session.submittedByRole === "secretary" ? "Recorded by Secretary" : "Shared Attendance"}
                            </span>
                            <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: isEditingEnabled ? "#E0E7FF" : "#F1F5F9", color: isEditingEnabled ? "#1E3A8A" : "#64748B" }}>
                              {isEditingEnabled ? "Editing Enabled" : "Editing Locked"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "#64748B" }}>
                            <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1" style={{ backgroundColor: "#F8FAFC" }}>
                              <span className="font-semibold" style={{ color: "#334155" }}>Section</span>
                              <span>{session.sectionLabel}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1" style={{ backgroundColor: "#F8FAFC" }}>
                              <span className="font-semibold" style={{ color: "#334155" }}>Recorder</span>
                              <span>{session.recorderName}</span>
                            </span>
                            <span className="rounded-md px-2 py-1" style={{ backgroundColor: "#F8FAFC", color: "#475569" }}>
                              Session: <span className="font-semibold uppercase">{session.status}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 text-xs font-semibold lg:max-w-[360px]">
                          <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: session.presentCount === 0 ? "#F1F5F9" : "#DCFCE7", color: session.presentCount === 0 ? "#94A3B8" : "#166534" }}>
                            Present: {session.presentCount}
                          </span>
                          <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: session.lateCount === 0 ? "#F1F5F9" : "#FEF3C7", color: session.lateCount === 0 ? "#94A3B8" : "#92400E" }}>
                            Late: {session.lateCount}
                          </span>
                          <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: session.absentCount === 0 ? "#F1F5F9" : "#FEE2E2", color: session.absentCount === 0 ? "#94A3B8" : "#B91C1C" }}>
                            Absent: {session.absentCount}
                          </span>
                          <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: session.excusedCount === 0 ? "#F1F5F9" : "#DBEAFE", color: session.excusedCount === 0 ? "#94A3B8" : "#1D4ED8" }}>
                            Excused: {session.excusedCount}
                          </span>
                          <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: "#E2E8F0", color: "#334155" }}>
                            Total Students: {session.totalStudents}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
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
