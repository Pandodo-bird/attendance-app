"use client";

import { motion } from "framer-motion";
import { CalendarDays, Info, Lock, Pencil, UserRound, X } from "lucide-react";
import { AttendanceRecord, AttendanceStatus } from "@/lib/firestore";
import { PendingOverridePayload, SessionWithStats } from "./types";

interface DailyRecordDetailsModalProps {
  isOpen: boolean;
  today: string;
  session: SessionWithStats | null;
  editableSessionIds: Record<string, boolean>;
  savingRecordKey: string | null;
  onClose: () => void;
  onToggleSessionEditing: (sessionId: string) => void;
  onSetPendingOverride: (payload: PendingOverridePayload) => void;
}

function getStatusStyles(status: AttendanceStatus): { backgroundColor: string; color: string } {
  switch (status) {
    case "present":
      return { backgroundColor: "#DCFCE7", color: "#166534" };
    case "late":
      return { backgroundColor: "#FEF3C7", color: "#92400E" };
    case "absent":
      return { backgroundColor: "#FEE2E2", color: "#B91C1C" };
    case "excused":
      return { backgroundColor: "#DBEAFE", color: "#1D4ED8" };
  }
}

function getDayBadge(date: string, today: string): string {
  if (date === today) return "Today";
  return "Recorded";
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

function formatDateTime(value?: Date | { toDate?: () => Date } | null): string {
  if (!value) return "Time unavailable";

  const parsedDate = value instanceof Date
    ? value
    : typeof value === "object" && "toDate" in value && typeof value.toDate === "function"
      ? value.toDate()
      : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return "Time unavailable";
  }

  return parsedDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DailyRecordDetailsModal({
  isOpen,
  today,
  session,
  editableSessionIds,
  savingRecordKey,
  onClose,
  onToggleSessionEditing,
  onSetPendingOverride,
}: DailyRecordDetailsModalProps) {
  if (!isOpen || !session) {
    return null;
  }

  const studentEntries = Object.entries(session.records ?? {}).sort((a, b) =>
    a[1].studentName.localeCompare(b[1].studentName)
  );
  const isEditingEnabled = Boolean(editableSessionIds[session.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4">
      <motion.div
        className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-xl flex flex-col"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#F1F5F9" }}>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: session.date === today ? "#DBEAFE" : "#E2E8F0",
                  color: session.date === today ? "#1D4ED8" : "#475569",
                }}
              >
                {getDayBadge(session.date, today)}
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
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "#64748B" }}>
              <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1" style={{ backgroundColor: "#F8FAFC" }}>
                <CalendarDays size={14} />
                <span className="font-semibold" style={{ color: "#334155" }}>Section</span>
                <span>{session.sectionLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1" style={{ backgroundColor: "#F8FAFC" }}>
                <UserRound size={14} />
                <span className="font-semibold" style={{ color: "#334155" }}>Recorder</span>
                <span>{session.recorderName}</span>
              </span>
              <span className="rounded-md px-2 py-1" style={{ backgroundColor: "#F8FAFC", color: "#475569" }}>
                Session: <span className="font-semibold uppercase">{session.status}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl p-2"
            style={{ color: "#64748B", backgroundColor: "#F8FAFC" }}
            aria-label="Close details modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2" style={{ borderColor: "#F1F5F9" }}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span
              className="px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: session.presentCount === 0 ? "#F1F5F9" : "#DCFCE7",
                color: session.presentCount === 0 ? "#94A3B8" : "#166534",
              }}
            >
              Present: {session.presentCount}
            </span>
            <span
              className="px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: session.lateCount === 0 ? "#F1F5F9" : "#FEF3C7",
                color: session.lateCount === 0 ? "#94A3B8" : "#92400E",
              }}
            >
              Late: {session.lateCount}
            </span>
            <span
              className="px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: session.absentCount === 0 ? "#F1F5F9" : "#FEE2E2",
                color: session.absentCount === 0 ? "#94A3B8" : "#B91C1C",
              }}
            >
              Absent: {session.absentCount}
            </span>
            <span
              className="px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: session.excusedCount === 0 ? "#F1F5F9" : "#DBEAFE",
                color: session.excusedCount === 0 ? "#94A3B8" : "#1D4ED8",
              }}
            >
              Excused: {session.excusedCount}
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ backgroundColor: "#E2E8F0", color: "#334155" }}>
              Total Students: {session.totalStudents}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onToggleSessionEditing(session.id)}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors w-fit"
            style={{
              backgroundColor: isEditingEnabled ? "#1E3A5F" : "#EEF2FF",
              border: `1px solid ${isEditingEnabled ? "#1E3A5F" : "#C7D2FE"}`,
              color: isEditingEnabled ? "#FFFFFF" : "#1E3A8A",
            }}
            aria-pressed={isEditingEnabled}
          >
            {isEditingEnabled ? <Lock size={13} /> : <Pencil size={13} />}
            {isEditingEnabled ? "Disable Editing" : "Enable Editing"}
          </button>
        </div>

        <div className="overflow-y-auto">
          {studentEntries.length === 0 ? (
            <p className="px-5 py-5 text-xs" style={{ color: "#9CA3AF" }}>
              No individual student records saved for this day.
            </p>
          ) : (
            <div className="rounded-xl overflow-hidden">
              {!isEditingEnabled && (
                <div
                  className="grid grid-cols-12 gap-2 px-5 py-2 border-b"
                  style={{ borderColor: "#F1F5F9", backgroundColor: "#F8FAFC" }}
                >
                  <div className="col-span-12 lg:col-span-9"></div>
                  <div
                    className="col-span-12 lg:col-span-3 inline-flex items-center justify-end gap-1.5 text-[11px] font-semibold"
                    style={{ color: "#64748B" }}
                  >
                    <Lock size={12} />
                    <span>Locked. Enable editing to override.</span>
                  </div>
                </div>
              )}
              <div
                className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-semibold uppercase tracking-wide"
                style={{ backgroundColor: "#F8FAFC", color: "#64748B" }}
              >
                <div className="col-span-12 lg:col-span-7">Student</div>
                <div className="col-span-4 lg:col-span-2">Status</div>
                <div className="col-span-8 lg:col-span-3 text-right">Teacher Override</div>
              </div>

              {studentEntries.map(([lrn, record]) => {
                const typedRecord = record as AttendanceRecord;
                const recordKey = `${session.id}:${lrn}`;
                const isSaving = savingRecordKey === recordKey;
                const statusStyles = getStatusStyles(typedRecord.status);
                const hasTeacherOverride = Boolean(typedRecord.updatedByTeacherName);

                return (
                  <div
                    key={lrn}
                    className="grid grid-cols-12 gap-2 px-5 py-2 items-center border-t"
                    style={{ borderColor: "#F1F5F9" }}
                  >
                    <div className="col-span-12 lg:col-span-7">
                      <p className="text-sm font-medium leading-5" style={{ color: "#111827" }}>
                        {typedRecord.studentName}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                          {lrn}
                        </p>
                        <span
                          className="inline-flex items-center"
                          title={
                            hasTeacherOverride
                              ? `Teacher override saved on ${formatDateTime(typedRecord.updatedAt)}`
                              : `Original record saved on ${formatDateTime(typedRecord.timeRecorded)}`
                          }
                          style={{ color: hasTeacherOverride ? "#1E3A8A" : "#94A3B8" }}
                        >
                          <Info size={12} />
                        </span>
                      </div>
                    </div>

                    <div className="col-span-4 lg:col-span-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                        style={statusStyles}
                      >
                        {typedRecord.status}
                      </span>
                    </div>

                    <div className="col-span-8 lg:col-span-3 flex justify-end">
                      <select
                        value={typedRecord.status}
                        disabled={isSaving || !isEditingEnabled}
                        onChange={(event) => {
                          const nextStatus = event.target.value as AttendanceStatus;
                          if (nextStatus === typedRecord.status) {
                            return;
                          }

                          onSetPendingOverride({
                            session,
                            lrn,
                            studentName: typedRecord.studentName,
                            currentStatus: typedRecord.status,
                            nextStatus,
                          });
                        }}
                        className="w-full max-w-[160px] rounded-md px-2.5 py-1.5 text-xs font-semibold outline-none disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: !isEditingEnabled ? "#F1F5F9" : "#FFFFFF",
                          color: !isEditingEnabled ? "#94A3B8" : "#1E293B",
                          border: `1px solid ${!isEditingEnabled ? "#E2E8F0" : "#94A3B8"}`,
                        }}
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="excused">Excused</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
