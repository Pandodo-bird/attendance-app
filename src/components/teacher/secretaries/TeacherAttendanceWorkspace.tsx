"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ClipboardCheck, Calendar } from "lucide-react";
import { AttendanceHeader, BulkAttendanceActions, StudentAttendanceRow } from "@/components/secretary/attendance";
import { PopupAlert } from "@/components/ui";
import type { AttendanceStatus, Attendance, Section } from "@/lib/firestore";

interface StudentAttendance {
  lrn: string;
  studentName: string;
  lastName: string;
  firstName: string;
  status: AttendanceStatus | null;
}

interface TeacherAttendanceWorkspaceProps {
  activeSections: Section[];
  filteredActiveSections: Section[];
  attendanceSessions: Attendance[];
  today: string;
  selectedTeacherAttendanceSectionId: string | null;
  teacherAttendanceSection: Section | null;
  teacherSelectedDate: string;
  teacherHasSessionForDate: boolean;
  teacherSessionSubmitted: boolean;
  teacherIsEditing: boolean;
  teacherAttendanceRecords: StudentAttendance[];
  teacherStudentsLoading: boolean;
  teacherAttendanceError: string | null;
  teacherSubmitError: string | null;
  teacherCurrentPage: number;
  teacherExistingSession?: Attendance | null;
  onSelectSection: (sectionId: string) => void;
  onBackToSections: () => void;
  onDateChange: (date: string) => void;
  onStartSession: () => void;
  onSubmitAttendance: () => void;
  onMarkAllPresent: () => void;
  onClearAll: () => void;
  onStatusChange: (lrn: string, status: AttendanceStatus) => void;
  onPageChange: (page: number) => void;
  onClearAttendanceError: () => void;
  onClearSubmitError: () => void;
}

const STUDENTS_PER_PAGE = 10;

function getTodaySessionStatusForSection(
  sectionId: string,
  attendanceSessions: Attendance[],
  today: string
): "none" | "open" | "locked" {
  const session = attendanceSessions.find(
    (item) => item.sectionId === sectionId && item.date === today
  );

  if (!session) {
    return "none";
  }

  return session.status;
}

function formatSectionSessionStatus(status: "none" | "open" | "locked"): string {
  switch (status) {
    case "open":
      return "Session in progress";
    case "locked":
      return "Submitted today";
    default:
      return "No session today";
  }
}

function formatSectionActionLabel(status: "none" | "open" | "locked"): string {
  switch (status) {
    case "locked":
      return "Review today's submission";
    case "open":
      return "Continue today's attendance";
    default:
      return "Start today's attendance";
  }
}

function formatSessionTimestamp(value: Date | string | { toDate?: () => Date } | undefined): string {
  let parsedDate: Date | null = null;

  if (!value) {
    parsedDate = new Date();
  } else if (value instanceof Date) {
    parsedDate = value;
  } else if (typeof value === "string") {
    const fromString = new Date(value);
    parsedDate = Number.isNaN(fromString.getTime()) ? new Date() : fromString;
  } else if (typeof value === "object" && typeof value.toDate === "function") {
    const fromTimestamp = value.toDate();
    parsedDate = fromTimestamp instanceof Date && !Number.isNaN(fromTimestamp.getTime())
      ? fromTimestamp
      : new Date();
  } else {
    parsedDate = new Date();
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDisplayEndIndex(end: number, total: number): number {
  return Math.min(end, total);
}

export function TeacherAttendanceWorkspace({
  activeSections,
  filteredActiveSections,
  attendanceSessions,
  today,
  selectedTeacherAttendanceSectionId,
  teacherAttendanceSection,
  teacherSelectedDate,
  teacherHasSessionForDate,
  teacherSessionSubmitted,
  teacherIsEditing,
  teacherAttendanceRecords,
  teacherStudentsLoading,
  teacherAttendanceError,
  teacherSubmitError,
  teacherCurrentPage,
  teacherExistingSession,
  onSelectSection,
  onBackToSections,
  onDateChange,
  onStartSession,
  onSubmitAttendance,
  onMarkAllPresent,
  onClearAll,
  onStatusChange,
  onPageChange,
  onClearAttendanceError,
  onClearSubmitError,
}: TeacherAttendanceWorkspaceProps) {
  const todayReadySectionsCount = activeSections.filter((section) =>
    attendanceSessions.some((session) => session.sectionId === section.id && session.date === today)
  ).length;

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
              Teacher Section Attendance
            </p>
            <h4 className="mt-3 text-2xl font-bold leading-tight lg:text-3xl" style={{ color: "#102A43" }}>
              Choose a section and take attendance for that class.
            </h4>
            <p className="mt-3 max-w-3xl text-sm lg:text-[15px]" style={{ color: "#486581" }}>
              Pick the section you want to handle today. You can manually record attendance yourself, continue an open session, or open a submitted session to review it when no secretary is assigned or a secretary is unable to record attendance.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-2xl border px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#829AB1" }}>
                Active Sections
              </p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "#102A43" }}>
                {filteredActiveSections.length}
              </p>
            </div>
            <div className="rounded-2xl border px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#829AB1" }}>
                Sections With Session Today
              </p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "#102A43" }}>
                {todayReadySectionsCount}
              </p>
            </div>
            <div className="col-span-2 rounded-2xl border px-4 py-3" style={{ backgroundColor: "rgba(16,42,67,0.06)", borderColor: "#C9D9EA" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#627D98" }}>
                Current Selection
              </p>
              <p className="mt-2 text-base font-semibold" style={{ color: "#102A43" }}>
                {teacherAttendanceSection
                  ? `${teacherAttendanceSection.gradeLevel} - ${teacherAttendanceSection.sectionName}`
                  : "No section selected"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredActiveSections.map((section) => {
            const sessionStatus = getTodaySessionStatusForSection(section.id, attendanceSessions, today);
            const isSelected = selectedTeacherAttendanceSectionId === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
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
                      Grade {section.gradeLevel}
                    </span>
                    <p className="mt-4 text-xl font-bold leading-tight" style={{ color: isSelected ? "#FFFFFF" : "#102A43" }}>
                      {section.sectionName}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      backgroundColor:
                        sessionStatus === "locked"
                          ? isSelected ? "rgba(16,185,129,0.16)" : "#DCFCE7"
                          : sessionStatus === "open"
                            ? isSelected ? "rgba(251,191,36,0.18)" : "#FEF3C7"
                            : isSelected ? "rgba(255,255,255,0.12)" : "#F1F5F9",
                      color:
                        sessionStatus === "locked"
                          ? isSelected ? "#BBF7D0" : "#166534"
                          : sessionStatus === "open"
                            ? isSelected ? "#FDE68A" : "#92400E"
                            : isSelected ? "#D9EAFD" : "#64748B",
                    }}
                  >
                    {sessionStatus === "locked" ? "Submitted" : sessionStatus === "open" ? "Open" : "Idle"}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: isSelected ? "#D9EAFD" : "#627D98" }}>School Year</span>
                    <span className="font-semibold" style={{ color: isSelected ? "#FFFFFF" : "#102A43" }}>
                      {section.schoolYear}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: isSelected ? "#D9EAFD" : "#627D98" }}>Session Status</span>
                    <span className="font-semibold" style={{ color: isSelected ? "#FFFFFF" : "#102A43" }}>
                      {formatSectionSessionStatus(sessionStatus)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: isSelected ? "rgba(255,255,255,0.14)" : "#E6EDF5" }}>
                  <span className="text-sm font-semibold" style={{ color: isSelected ? "#FFFFFF" : "#1E3A5F" }}>
                    {formatSectionActionLabel(sessionStatus)}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: isSelected ? "#D9EAFD" : "#627D98" }}>
                    Select
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {filteredActiveSections.length === 0 && (
          <div className="mt-6 rounded-2xl border px-4 py-6 text-center" style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF" }}>
            <p style={{ color: "#627D98" }}>No sections matched your search.</p>
          </div>
        )}
      </div>

      {selectedTeacherAttendanceSectionId ? (
        <>
          <button
            type="button"
            onClick={onBackToSections}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
            style={{ backgroundColor: "#F8FBFF", borderColor: "#C9D9EA", color: "#1E3A5F" }}
          >
            <ArrowLeft size={16} />
            Back to Sections
          </button>

          {teacherAttendanceError && (
            <PopupAlert
              message={teacherAttendanceError}
              type="error"
              onClose={onClearAttendanceError}
            />
          )}

          <div className="rounded-2xl border p-5" style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold" style={{ color: "#0F172A" }}>
                  Teacher attendance for {teacherAttendanceSection ? `${teacherAttendanceSection.gradeLevel} - ${teacherAttendanceSection.sectionName}` : "selected section"}
                </p>
                <p className="text-sm" style={{ color: "#475569" }}>
                  Shared section attendance session
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}>
                <ClipboardCheck size={14} />
                Teacher recording mode
              </div>
            </div>
          </div>

          <AttendanceHeader
            selectedDate={teacherSelectedDate}
            onDateChange={onDateChange}
            hasSessionToday={teacherHasSessionForDate}
            sessionSubmitted={teacherSessionSubmitted}
            isEditing={teacherIsEditing}
            allowCorrections={false}
            onStartSession={onStartSession}
            onEnableEditing={() => undefined}
          />

          {teacherStudentsLoading ? (
            <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}>
              <p style={{ color: "#6B7280" }}>Loading students...</p>
            </div>
          ) : teacherHasSessionForDate || teacherSessionSubmitted ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {teacherSubmitError && (
                <PopupAlert
                  message={teacherSubmitError}
                  type="error"
                  onClose={onClearSubmitError}
                />
              )}

              {teacherSessionSubmitted && !teacherIsEditing && (
                <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: "#D1FAE5", border: "1px solid #A7F3D0" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#10B981" }}>
                      <ClipboardCheck className="w-5 h-5" style={{ color: "#FFFFFF" }} />
                    </div>
                    <div>
                      <p className="text-base font-bold" style={{ color: "#065F46" }}>
                        Teacher-submitted session completed
                      </p>
                      <p className="text-sm" style={{ color: "#047857" }}>
                        Attendance successfully submitted for {teacherAttendanceSection?.sectionName ?? "this section"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <p className="text-2xl font-bold" style={{ color: "#10B981" }}>
                        {teacherAttendanceRecords.filter((record) => record.status === "present").length}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "#6B7280" }}>Present</p>
                    </div>
                    <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <p className="text-2xl font-bold" style={{ color: "#F59E0B" }}>
                        {teacherAttendanceRecords.filter((record) => record.status === "late").length}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "#6B7280" }}>Late</p>
                    </div>
                    <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <p className="text-2xl font-bold" style={{ color: "#EF4444" }}>
                        {teacherAttendanceRecords.filter((record) => record.status === "absent").length}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "#6B7280" }}>Absent</p>
                    </div>
                    <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <p className="text-2xl font-bold" style={{ color: "#2563EB" }}>
                        {teacherAttendanceRecords.filter((record) => record.status === "excused").length}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "#6B7280" }}>Excused</p>
                    </div>
                    <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <p className="text-2xl font-bold" style={{ color: "#1E3A5F" }}>
                        {teacherAttendanceRecords.length}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "#6B7280" }}>Total Students</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs" style={{ color: "#047857" }}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Submitted on {formatSessionTimestamp(teacherExistingSession?.lockedAt as Date | string | { toDate?: () => Date } | undefined)}
                    </span>
                  </div>
                </div>
              )}

              {(teacherIsEditing || !teacherSessionSubmitted) && (
                <BulkAttendanceActions
                  onMarkAllPresent={onMarkAllPresent}
                  onClearAll={onClearAll}
                  allPresent={teacherAttendanceRecords.every((record) => record.status === "present")}
                  allMarked={teacherAttendanceRecords.every((record) => record.status !== null)}
                  disabled={!teacherIsEditing && !teacherHasSessionForDate}
                />
              )}

              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}>
                <div className="hidden md:block">
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                    <div className="col-span-5" style={{ color: "#6B7280" }}>Student Name</div>
                    <div className="col-span-3 text-center" style={{ color: "#6B7280" }}>LRN</div>
                    <div className="col-span-4 text-center" style={{ color: "#6B7280" }}>Attendance Status</div>
                  </div>
                  <div className="divide-y divide-[#E5E7EB]">
                    {teacherAttendanceRecords.slice((teacherCurrentPage - 1) * STUDENTS_PER_PAGE, teacherCurrentPage * STUDENTS_PER_PAGE).map((record, index) => (
                      <StudentAttendanceRow
                        key={record.lrn}
                        lrn={record.lrn}
                        studentName={record.studentName}
                        status={record.status}
                        index={index}
                        isEditable={teacherIsEditing || !teacherSessionSubmitted}
                        onStatusChange={onStatusChange}
                      />
                    ))}
                  </div>
                </div>

                <div className="md:hidden divide-y divide-[#E5E7EB]">
                  {teacherAttendanceRecords.slice((teacherCurrentPage - 1) * STUDENTS_PER_PAGE, teacherCurrentPage * STUDENTS_PER_PAGE).map((record, index) => (
                    <MobileStudentAttendanceCard
                      key={record.lrn}
                      lrn={record.lrn}
                      studentName={record.studentName}
                      status={record.status}
                      isEditable={teacherIsEditing || !teacherSessionSubmitted}
                      onStatusChange={onStatusChange}
                      index={index}
                    />
                  ))}
                </div>
              </div>

              {Math.ceil(teacherAttendanceRecords.length / STUDENTS_PER_PAGE) > 1 && (
                <motion.div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <p className="text-sm" style={{ color: "#6B7280" }}>
                    Showing <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{(teacherCurrentPage - 1) * STUDENTS_PER_PAGE + 1}</span> to{" "}
                    <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{getDisplayEndIndex(teacherCurrentPage * STUDENTS_PER_PAGE, teacherAttendanceRecords.length)}</span> of{" "}
                    <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{teacherAttendanceRecords.length}</span> students
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPageChange(Math.max(teacherCurrentPage - 1, 1))}
                      disabled={teacherCurrentPage === 1}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: teacherCurrentPage === 1 ? "#F3F4F6" : "#FFFFFF", color: teacherCurrentPage === 1 ? "#9CA3AF" : "#374151", border: "1px solid #E5E7EB" }}
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(teacherAttendanceRecords.length / STUDENTS_PER_PAGE) }, (_, index) => index + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => onPageChange(page)}
                          className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                          style={{ backgroundColor: teacherCurrentPage === page ? "#1E3A5F" : "#FFFFFF", color: teacherCurrentPage === page ? "#FFFFFF" : "#374151", border: "1px solid #E5E7EB" }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => onPageChange(Math.min(teacherCurrentPage + 1, Math.ceil(teacherAttendanceRecords.length / STUDENTS_PER_PAGE)))}
                      disabled={teacherCurrentPage === Math.ceil(teacherAttendanceRecords.length / STUDENTS_PER_PAGE)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: teacherCurrentPage === Math.ceil(teacherAttendanceRecords.length / STUDENTS_PER_PAGE) ? "#F3F4F6" : "#FFFFFF", color: teacherCurrentPage === Math.ceil(teacherAttendanceRecords.length / STUDENTS_PER_PAGE) ? "#9CA3AF" : "#374151", border: "1px solid #E5E7EB" }}
                    >
                      Next
                    </button>
                  </div>
                </motion.div>
              )}

              {(teacherIsEditing || !teacherSessionSubmitted) && (
                <motion.div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 sm:gap-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.2 }}>
                  {!teacherAttendanceRecords.every((record) => record.status !== null) && (
                    <p className="text-sm sm:self-center sm:mr-auto" style={{ color: "#F59E0B" }}>
                      Please mark attendance for all students.
                    </p>
                  )}
                  <button
                    onClick={onSubmitAttendance}
                    disabled={!teacherAttendanceRecords.every((record) => record.status !== null) || !teacherHasSessionForDate}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF" }}
                  >
                    Submit Attendance
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}>
              <p style={{ color: "#6B7280" }}>Start a session to begin marking attendance for this section.</p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}>
          <p style={{ color: "#6B7280" }}>Select a section above to start teacher attendance.</p>
        </div>
      )}
    </div>
  );
}

interface MobileStudentAttendanceCardProps {
  lrn: string;
  studentName: string;
  status: AttendanceStatus | null;
  isEditable: boolean;
  onStatusChange: (lrn: string, status: AttendanceStatus) => void;
  index: number;
}

function MobileStudentAttendanceCard({
  lrn,
  studentName,
  status,
  isEditable,
  onStatusChange,
  index,
}: MobileStudentAttendanceCardProps) {
  return (
    <motion.div
      className="p-4"
      style={{ backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F9FAFB" }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      <div className="mb-3">
        <p className="text-sm font-semibold" style={{ color: "#1F1F1F" }}>
          {studentName}
        </p>
        <p className="text-xs font-mono mt-1" style={{ color: "#6B7280" }}>
          LRN: {lrn}
        </p>
      </div>

      {isEditable ? (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onStatusChange(lrn, "present")}
            className="px-2.5 py-2 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: status === "present" ? "#10B981" : "#F3F4F6",
              color: status === "present" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Present
          </button>
          <button
            onClick={() => onStatusChange(lrn, "late")}
            className="px-2.5 py-2 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: status === "late" ? "#F59E0B" : "#F3F4F6",
              color: status === "late" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Late
          </button>
          <button
            onClick={() => onStatusChange(lrn, "absent")}
            className="px-2.5 py-2 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: status === "absent" ? "#EF4444" : "#F3F4F6",
              color: status === "absent" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Absent
          </button>
        </div>
      ) : (
        <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide" style={{
          backgroundColor:
            status === "present"
              ? "#D1FAE5"
              : status === "late"
              ? "#FEF3C7"
              : status === "absent"
              ? "#FEE2E2"
              : "#F3F4F6",
          color:
            status === "present"
              ? "#065F46"
              : status === "late"
              ? "#92400E"
              : status === "absent"
              ? "#991B1B"
              : "#6B7280",
        }}>
          {status || "Unmarked"}
        </div>
      )}
    </motion.div>
  );
}
