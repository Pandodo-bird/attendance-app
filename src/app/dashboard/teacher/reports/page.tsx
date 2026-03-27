"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { motion } from "framer-motion";
import { CalendarDays, ShieldCheck, UserRound } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { useAuth } from "@/contexts/AuthContext";
import { RoleGuard } from "@/hooks/useRequireRole";
import {
  Attendance,
  AttendanceRecord,
  AttendanceStatus,
  calculateAttendanceStats,
  getTeacherAppointments,
  getTeacherSections,
  getUserProfilesBatch,
  overrideAttendanceRecord,
  UserData,
} from "@/lib/firestore";
import { db } from "@/lib/firebase";

interface SessionWithStats extends Attendance {
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  totalStudents: number;
  recorderName: string;
  sectionLabel: string;
  sectionSlug: string;
}

interface PendingOverride {
  session: SessionWithStats;
  lrn: string;
  studentName: string;
  currentStatus: AttendanceStatus;
  nextStatus: AttendanceStatus;
}

interface SecretaryGroupedRecords {
  secretaryUid: string;
  secretaryLrn: string;
  secretaryName: string;
  sessions: SessionWithStats[];
}

async function getTeacherAttendanceSessions(teacherId: string): Promise<Attendance[]> {
  const attendanceRef = collection(db, "attendance");
  const q = query(attendanceRef, where("teacherId", "==", teacherId));
  console.log("🔥 FIRESTORE | [teacher/reports/page.tsx] | [getDocs] | [attendance] (teacherId filter)");
  const snapshot = await getDocs(q);

  const sessions = snapshot.docs.map((attendanceDoc) => ({
    id: attendanceDoc.id,
    ...attendanceDoc.data(),
  } as Attendance));

  sessions.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.id.localeCompare(a.id);
  });

  return sessions;
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

function getDayBadge(date: string, today: string): string {
  if (date === today) return "Today";
  return "Recorded";
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

export default function ReportsPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="teacher">
        <ReportsContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function ReportsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingRecordKey, setSavingRecordKey] = useState<string | null>(null);
  const [editableSessionIds, setEditableSessionIds] = useState<Record<string, boolean>>({});
  const [pendingOverride, setPendingOverride] = useState<PendingOverride | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const teacherName = user?.displayName?.trim() || "Teacher";

  const { data: sections = [] } = useQuery({
    queryKey: ["sections", user?.uid],
    queryFn: () => getTeacherSections(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", user?.uid],
    queryFn: () => getTeacherAppointments(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const {
    data: attendanceSessions = [],
    isLoading: isLoadingAttendance,
    error: attendanceError,
  } = useQuery({
    queryKey: ["teacherAttendanceSessions", user?.uid],
    queryFn: () => getTeacherAttendanceSessions(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const secretaryUids = Array.from(new Set(attendanceSessions.map((session) => session.secretaryUid))).sort();
  const { data: secretaryProfiles = new Map<string, UserData>() } = useQuery({
    queryKey: ["secretaryProfiles", user?.uid, secretaryUids],
    queryFn: () => getUserProfilesBatch(secretaryUids),
    enabled: !!user?.uid && secretaryUids.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const sectionLabelById = new Map(
    sections.map((section) => [
      section.id,
      `${section.gradeLevel} - ${section.sectionName}`,
    ])
  );

  const sectionSlugById = new Map(
    sections.map((section) => [
      section.id,
      `${section.gradeLevel}-${section.sectionName.replace(/\s+/g, "-")}`,
    ])
  );

  const filteredSessions = attendanceSessions.filter((session) => {
    if (!searchQuery.trim()) return true;
    const normalizedSearch = searchQuery.toLowerCase();
    const profile = secretaryProfiles.get(session.secretaryUid);
    const secretaryName = profile?.displayName ?? "";
    const sectionLabel = sectionLabelById.get(session.sectionId) ?? "";
    const appointmentSubject =
      appointments.find((appointment) => appointment.id === session.appointmentId)?.subject ??
      session.subject ??
      "";

    return (
      secretaryName.toLowerCase().includes(normalizedSearch) ||
      session.secretaryLrn.toLowerCase().includes(normalizedSearch) ||
      session.date.toLowerCase().includes(normalizedSearch) ||
      sectionLabel.toLowerCase().includes(normalizedSearch) ||
      appointmentSubject.toLowerCase().includes(normalizedSearch)
    );
  });

  const groupedBySecretaryMap = new Map<string, SecretaryGroupedRecords>();
  filteredSessions.forEach((session) => {
    const recorderName = secretaryProfiles.get(session.secretaryUid)?.displayName ?? `Secretary ${session.secretaryLrn}`;
    const sectionLabel = sectionLabelById.get(session.sectionId) ?? session.sectionId;
    const sectionSlug = sectionSlugById.get(session.sectionId) ?? "";
    const stats = calculateAttendanceStats(session.records);
    const sessionWithStats: SessionWithStats = {
      ...session,
      presentCount: stats.present,
      lateCount: stats.late,
      absentCount: stats.absent,
      excusedCount: stats.excused,
      totalStudents: stats.total,
      recorderName,
      sectionLabel,
      sectionSlug,
    };

    const existingGroup = groupedBySecretaryMap.get(session.secretaryUid);
    if (existingGroup) {
      existingGroup.sessions.push(sessionWithStats);
      return;
    }

    groupedBySecretaryMap.set(session.secretaryUid, {
      secretaryUid: session.secretaryUid,
      secretaryLrn: session.secretaryLrn,
      secretaryName: recorderName,
      sessions: [sessionWithStats],
    });
  });

  const groupedRecords = Array.from(groupedBySecretaryMap.values()).sort((a, b) => {
    const aLatestDate = a.sessions[0]?.date ?? "";
    const bLatestDate = b.sessions[0]?.date ?? "";
    return bLatestDate.localeCompare(aLatestDate);
  });

  groupedRecords.forEach((group) => {
    group.sessions.sort((a, b) => b.date.localeCompare(a.date));
  });

  const teacherStats = [
    { label: "SECRETARIES", value: groupedRecords.length },
    { label: "SESSIONS", value: filteredSessions.length },
    { label: "DAYS RECORDED", value: new Set(filteredSessions.map((session) => session.date)).size },
  ];

  const toggleSessionEditing = (sessionId: string): void => {
    setEditableSessionIds((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  const handleOverride = async (): Promise<void> => {
    if (!user?.uid || !pendingOverride) {
      return;
    }

    const { session, lrn, nextStatus } = pendingOverride;

    if (!session.sectionSlug) {
      setSaveError("Section information is missing for this record.");
      return;
    }

    if (!editableSessionIds[session.id]) {
      setSaveError("Enable editing for this session before changing a record.");
      return;
    }

    const recordKey = `${session.id}:${lrn}`;

    try {
      setSaveError(null);
      setSavingRecordKey(recordKey);

      await overrideAttendanceRecord(
        session.id,
        session.sectionSlug,
        lrn,
        nextStatus,
        user.uid,
        teacherName
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["teacherAttendanceSessions", user.uid] }),
        queryClient.invalidateQueries({ queryKey: ["studentSummaries"] }),
        queryClient.invalidateQueries({ queryKey: ["teacherAttendanceToday", user.uid] }),
      ]);
      setPendingOverride(null);
    } catch (error) {
      console.error("Error overriding attendance record:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to override attendance record.");
    } finally {
      setSavingRecordKey(null);
    }
  };

  return (
    <>
      <TeacherHeader
        title="Secretary Records"
        stats={teacherStats}
        searchPlaceholder="Search records by recorder, date, section, subject..."
        onSearch={(query) => setSearchQuery(query)}
      />

      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        <div
          className="rounded-2xl border p-4 lg:p-5"
          style={{ backgroundColor: "#F8FAFC", borderColor: "#DCE7F3" }}
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1E3A5F" }}>
                Daily secretary-submitted attendance
              </p>
              <p className="text-sm" style={{ color: "#475569" }}>
                Each session shows the class date, who recorded it, and the current saved status. Turn on editing for a session before overriding any student entry.
              </p>
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}
            >
              <ShieldCheck size={14} />
              Teacher override enabled
            </div>
          </div>
          {saveError && (
            <p className="mt-3 text-sm" style={{ color: "#B91C1C" }}>
              {saveError}
            </p>
          )}
        </div>

        {isLoadingAttendance ? (
          <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}>
            <p style={{ color: "#6B7280" }}>Loading attendance records...</p>
          </div>
        ) : attendanceError ? (
          <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}>
            <p style={{ color: "#DC2626" }}>
              Failed to load attendance records. Please refresh and try again.
            </p>
          </div>
        ) : groupedRecords.length === 0 ? (
          <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}>
            <p style={{ color: "#9CA3AF" }}>
              No attendance records found for this teacher yet.
            </p>
          </div>
        ) : (
          groupedRecords.map((group, groupIndex) => (
            <motion.div
              key={group.secretaryUid}
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.04, duration: 0.25, ease: "easeOut" }}
            >
              <div className="px-5 py-4 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: "#F1F5F9" }}>
                <div>
                  <p className="text-base font-semibold" style={{ color: "#1F2937" }}>
                    {group.secretaryName}
                  </p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    Secretary LRN: {group.secretaryLrn}
                  </p>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-semibold w-fit"
                  style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}
                >
                  {group.sessions.length} session{group.sessions.length > 1 ? "s" : ""}
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                {group.sessions.map((session) => {
                  const studentEntries = Object.entries(session.records ?? {}).sort((a, b) =>
                    a[1].studentName.localeCompare(b[1].studentName)
                  );
                  const isEditingEnabled = Boolean(editableSessionIds[session.id]);

                  return (
                    <details key={session.id} className="group" open={session.date === today}>
                      <summary
                        className="list-none cursor-pointer px-5 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                        style={{ backgroundColor: session.date === today ? "#FCFDFE" : "#FFFFFF" }}
                      >
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
                            <span className="text-sm" style={{ color: "#94A3B8" }}>
                              {session.subject}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "#64748B" }}>
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays size={14} />
                              {session.sectionLabel}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound size={14} />
                              Recorded by {session.recorderName}
                            </span>
                            <span>Session is {session.status}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleSessionEditing(session.id);
                            }}
                            className="px-3 py-1 rounded-full transition-colors"
                            style={{
                              backgroundColor: isEditingEnabled ? "#1E3A5F" : "#E2E8F0",
                              color: isEditingEnabled ? "#FFFFFF" : "#334155",
                            }}
                          >
                            {isEditingEnabled ? "Editing On" : "Enable Edit"}
                          </button>
                          <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#166534" }}>
                            P {session.presentCount}
                          </span>
                          <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                            L {session.lateCount}
                          </span>
                          <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}>
                            A {session.absentCount}
                          </span>
                          <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8" }}>
                            E {session.excusedCount}
                          </span>
                          <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#E2E8F0", color: "#334155" }}>
                            {session.totalStudents} students
                          </span>
                        </div>
                      </summary>

                      <div className="px-5 pb-5">
                        {studentEntries.length === 0 ? (
                          <p className="text-xs" style={{ color: "#9CA3AF" }}>
                            No individual student records saved for this day.
                          </p>
                        ) : (
                          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
                            <div
                              className="grid grid-cols-12 gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide"
                              style={{ backgroundColor: "#F8FAFC", color: "#64748B" }}
                            >
                              <div className="col-span-12 lg:col-span-4">Student</div>
                              <div className="col-span-4 lg:col-span-2">Status</div>
                              <div className="col-span-8 lg:col-span-3">Activity</div>
                              <div className="col-span-12 lg:col-span-3">Teacher Override</div>
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
                                  className="grid grid-cols-12 gap-3 px-4 py-3 items-center border-t"
                                  style={{ borderColor: "#F1F5F9" }}
                                >
                                  <div className="col-span-12 lg:col-span-4">
                                    <p className="font-medium" style={{ color: "#111827" }}>
                                      {typedRecord.studentName}
                                    </p>
                                    <p className="text-xs" style={{ color: "#94A3B8" }}>
                                      {lrn}
                                    </p>
                                  </div>

                                  <div className="col-span-4 lg:col-span-2">
                                    <span
                                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase"
                                      style={statusStyles}
                                    >
                                      {typedRecord.status}
                                    </span>
                                  </div>

                                  <div className="col-span-8 lg:col-span-3 text-xs">
                                    {hasTeacherOverride ? (
                                      <>
                                        <p className="font-semibold" style={{ color: "#1E3A5F" }}>
                                          Teacher override saved
                                        </p>
                                        <p style={{ color: "#64748B" }}>
                                          Updated {formatDateTime(typedRecord.updatedAt)}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="font-semibold" style={{ color: "#334155" }}>
                                          Original record saved
                                        </p>
                                        <p style={{ color: "#64748B" }}>
                                          Saved {formatDateTime(typedRecord.timeRecorded)}
                                        </p>
                                      </>
                                    )}
                                  </div>

                                  <div className="col-span-12 lg:col-span-3">
                                    <select
                                      value={typedRecord.status}
                                      disabled={isSaving || !isEditingEnabled}
                                      onChange={(event) => {
                                        const nextStatus = event.target.value as AttendanceStatus;
                                        if (nextStatus === typedRecord.status) {
                                          return;
                                        }

                                        setPendingOverride({
                                          session,
                                          lrn,
                                          studentName: typedRecord.studentName,
                                          currentStatus: typedRecord.status,
                                          nextStatus,
                                        });
                                      }}
                                      className="w-full rounded-lg px-3 py-2 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                      style={{
                                        backgroundColor: "#F8FAFC",
                                        color: "#334155",
                                        border: "1px solid #CBD5E1",
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
                    </details>
                  );
                })}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {pendingOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 px-4">
          <motion.div
            className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-lg font-semibold" style={{ color: "#111827" }}>
              Confirm attendance change
            </p>
            <p className="mt-2 text-sm" style={{ color: "#475569" }}>
              You are changing this student&apos;s attendance for {formatDate(pendingOverride.session.date)}.
            </p>

            <div className="mt-4 rounded-xl border p-4 space-y-2" style={{ borderColor: "#E5E7EB", backgroundColor: "#F8FAFC" }}>
              <p className="text-sm font-semibold" style={{ color: "#111827" }}>
                {pendingOverride.studentName}
              </p>
              <p className="text-xs" style={{ color: "#64748B" }}>
                {pendingOverride.lrn} • {pendingOverride.session.subject} • {pendingOverride.session.sectionLabel}
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs font-semibold">
                <span className="rounded-full px-2.5 py-1" style={getStatusStyles(pendingOverride.currentStatus)}>
                  {pendingOverride.currentStatus}
                </span>
                <span style={{ color: "#94A3B8" }}>to</span>
                <span className="rounded-full px-2.5 py-1" style={getStatusStyles(pendingOverride.nextStatus)}>
                  {pendingOverride.nextStatus}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingOverride(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#F3F4F6", color: "#374151" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOverride}
                disabled={Boolean(savingRecordKey)}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF" }}
              >
                {savingRecordKey ? "Saving..." : "Confirm Change"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
