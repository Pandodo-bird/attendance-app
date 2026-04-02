"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import type { SessionWithStats } from "@/components/teacher/secretary-records";

interface SecretaryGroupedRecords {
  secretaryUid: string;
  secretaryLrn: string;
  secretaryName: string;
  sessions: SessionWithStats[];
}

interface SectionHistoryWorkspaceProps {
  filteredSharedSectionGroups: SecretaryGroupedRecords[];
  selectedSectionHistoryGroup: SecretaryGroupedRecords | null;
  sectionHistorySessionCount: number;
  sectionHistoryStartDate: string;
  sectionHistoryEndDate: string;
  showDateFilter: boolean;
  today: string;
  editableSessionIds: Record<string, boolean>;
  onSelectSection: (groupUid: string) => void;
  onBackToHistory: () => void;
  onSelectSession: (sessionId: string) => void;
  onToggleDateFilter: () => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClearDateFilter: () => void;
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

function formatRecorderRole(role?: "teacher" | "secretary"): string {
  if (role === "teacher") {
    return "Teacher";
  }

  if (role === "secretary") {
    return "Secretary";
  }

  return "Recorder";
}

export function SectionHistoryWorkspace({
  filteredSharedSectionGroups,
  selectedSectionHistoryGroup,
  sectionHistorySessionCount,
  sectionHistoryStartDate,
  sectionHistoryEndDate,
  showDateFilter,
  today,
  editableSessionIds,
  onSelectSection,
  onBackToHistory,
  onSelectSession,
  onToggleDateFilter,
  onStartDateChange,
  onEndDateChange,
  onClearDateFilter,
}: SectionHistoryWorkspaceProps) {
  return (
    <div className="space-y-4">
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
              Shared Section History
            </p>
            <h4 className="mt-3 text-2xl font-bold leading-tight lg:text-3xl" style={{ color: "#102A43" }}>
              Choose a section to view its full attendance history.
            </h4>
            <p className="mt-3 max-w-3xl text-sm lg:text-[15px]" style={{ color: "#486581" }}>
              Open a class to see all recorded attendance days in one place, including sessions submitted by both teachers and secretaries.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-2xl border px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#829AB1" }}>
                Sections
              </p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "#102A43" }}>
                {filteredSharedSectionGroups.length}
              </p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#829AB1" }}>
                Sessions
              </p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "#102A43" }}>
                {sectionHistorySessionCount}
              </p>
            </div>
            <div className="col-span-2 rounded-2xl border px-4 py-3" style={{ backgroundColor: "rgba(16,42,67,0.06)", borderColor: "#C9D9EA" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#627D98" }}>
                Current Selection
              </p>
              <p className="mt-2 text-base font-semibold" style={{ color: "#102A43" }}>
                {selectedSectionHistoryGroup?.sessions[0]?.sectionLabel ?? "No section selected"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          {!showDateFilter ? (
            <button
              type="button"
              onClick={onToggleDateFilter}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF", color: "#56738F" }}
            >
              <Calendar size={14} />
              Filter by Date Range
            </button>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: "#56738F" }}>
                  From
                </label>
                <input
                  type="date"
                  value={sectionHistoryStartDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF", color: "#102A43" }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: "#56738F" }}>
                  To
                </label>
                <input
                  type="date"
                  value={sectionHistoryEndDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF", color: "#102A43" }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.18em] mb-1.5 invisible" style={{ color: "#56738F" }}>
                  Placeholder
                </label>
                <button
                  type="button"
                  onClick={onClearDateFilter}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors"
                  style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF", color: "#6B7280" }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedSectionHistoryGroup ? (
        <>
          <button
            type="button"
            onClick={onBackToHistory}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
            style={{ backgroundColor: "#F8FBFF", borderColor: "#C9D9EA", color: "#1E3A5F" }}
          >
            <ArrowLeft size={16} />
            Back to Section History
          </button>

          <motion.div
            key={selectedSectionHistoryGroup.secretaryUid}
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="px-5 py-4 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: "#F1F5F9" }}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold" style={{ color: "#1F2937" }}>
                  {selectedSectionHistoryGroup.secretaryName}
                </p>
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}
                >
                  Shared Section View
                </span>
              </div>
              <div
                className="px-3 py-1 rounded-full text-xs font-semibold w-fit"
                style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}
              >
                {selectedSectionHistoryGroup.sessions.length} session{selectedSectionHistoryGroup.sessions.length > 1 ? "s" : ""}
              </div>
            </div>

            {selectedSectionHistoryGroup.sessions.length === 0 ? (
              <div className="px-5 py-8 text-sm text-center" style={{ color: "#94A3B8" }}>
                No attendance sessions recorded for this section yet.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                {selectedSectionHistoryGroup.sessions.map((session) => {
                  const isEditingEnabled = Boolean(editableSessionIds[session.id]);
                  const recorderRole = formatRecorderRole(session.submittedByRole ?? session.createdByRole);

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
                              {`Recorded by ${recorderRole}`}
                            </span>
                            <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: isEditingEnabled ? "#E0E7FF" : "#F1F5F9", color: isEditingEnabled ? "#1E3A8A" : "#64748B" }}>
                              {isEditingEnabled ? "Editing Enabled" : "Editing Locked"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "#64748B" }}>
                            <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1" style={{ backgroundColor: "#F8FAFC" }}>
                              <span className="font-semibold" style={{ color: "#334155" }}>Recorded By</span>
                              <span>{`${session.recorderName} (${recorderRole})`}</span>
                            </span>
                            <span className="rounded-md px-2 py-1" style={{ backgroundColor: "#F8FAFC", color: "#475569" }}>
                              Session Status: <span className="font-semibold uppercase">{session.status}</span>
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
        </>
      ) : filteredSharedSectionGroups.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSharedSectionGroups.map((group) => {
            const latestSession = group.sessions[0];
            const teacherRecordedCount = group.sessions.filter(
              (session) => session.submittedByRole === "teacher" || session.createdByRole === "teacher"
            ).length;
            const secretaryRecordedCount = group.sessions.filter(
              (session) => session.submittedByRole === "secretary" || session.createdByRole === "secretary"
            ).length;
            const isSelected = group.secretaryUid === group.secretaryUid;
            const latestRecorderRole = latestSession
              ? formatRecorderRole(latestSession.submittedByRole ?? latestSession.createdByRole)
              : "Recorder";

            return (
              <button
                key={group.secretaryUid}
                type="button"
                onClick={() => onSelectSection(group.secretaryUid)}
                className="rounded-[24px] border p-5 text-left transition-colors"
                style={{
                  backgroundColor: isSelected ? "#1E3A5F" : "#FFFFFF",
                  borderColor: isSelected ? "#1E3A5F" : "#D7E2EF",
                  boxShadow: isSelected ? "0 18px 34px rgba(30,58,95,0.16)" : "0 8px 20px rgba(15,23,42,0.04)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
                      style={{
                        backgroundColor: isSelected ? "rgba(255,255,255,0.14)" : "#EEF5FF",
                        color: isSelected ? "#D9EAFD" : "#1E3A5F",
                      }}
                    >
                      Section History
                    </span>
                    <p className="mt-4 text-xl font-bold leading-tight" style={{ color: isSelected ? "#FFFFFF" : "#102A43" }}>
                      {latestSession?.sectionLabel ?? group.secretaryName}
                    </p>
                    <p className="mt-2 text-sm" style={{ color: isSelected ? "#D9EAFD" : "#627D98" }}>
                      {group.sessions.length} recorded day{group.sessions.length === 1 ? "" : "s"} available
                    </p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.14)" : "#F8FAFC", color: isSelected ? "#D9EAFD" : "#627D98" }}>
                    {latestSession ? formatDate(latestSession.date) : "No records"}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: isSelected ? "#D9EAFD" : "#627D98" }}>Teacher-recorded sessions</span>
                    <span className="font-semibold" style={{ color: isSelected ? "#FFFFFF" : "#102A43" }}>
                      {teacherRecordedCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: isSelected ? "#D9EAFD" : "#627D98" }}>Secretary-recorded sessions</span>
                    <span className="font-semibold" style={{ color: isSelected ? "#FFFFFF" : "#102A43" }}>
                      {secretaryRecordedCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: isSelected ? "#D9EAFD" : "#627D98" }}>Latest recorder</span>
                    <span className="font-semibold" style={{ color: isSelected ? "#FFFFFF" : "#102A43" }}>
                      {latestSession ? `${latestSession.recorderName} (${latestRecorderRole})` : "Unavailable"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: isSelected ? "#D9EAFD" : "#627D98" }}>Latest recorded day</span>
                    <span className="font-semibold" style={{ color: isSelected ? "#FFFFFF" : "#102A43" }}>
                      {latestSession ? formatDate(latestSession.date) : "Unavailable"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: isSelected ? "rgba(255,255,255,0.14)" : "#E6EDF5" }}>
                  <span className="text-sm font-semibold" style={{ color: isSelected ? "#FFFFFF" : "#1E3A5F" }}>
                    Open section history
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: isSelected ? "#D9EAFD" : "#627D98" }}>
                    Select
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl p-6 text-center border" style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}>
          <p style={{ color: "#6B7280" }}>
            No shared section history matched your search.
          </p>
        </div>
      )}
    </div>
  );
}
