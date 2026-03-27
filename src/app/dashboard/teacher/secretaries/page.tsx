"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, UserPlus } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { DailyRecordDetailsModal, type PendingOverridePayload, type SessionWithStats } from "@/components/teacher/secretary-records";
import { ActiveSecretariesCounter, SecretaryCard, SecretaryCreationForm } from "@/components/teacher/secretaries";
import { useAuth } from "@/contexts/AuthContext";
import { RoleGuard } from "@/hooks/useRequireRole";
import {
  Attendance,
  AttendanceStatus,
  calculateAttendanceStats,
  getTeacherAppointments,
  getTeacherSections,
  getUserProfilesBatch,
  overrideAttendanceRecord,
  UserData,
} from "@/lib/firestore";
import { db } from "@/lib/firebase";

interface SecretaryGroupedRecords {
  secretaryUid: string;
  secretaryLrn: string;
  secretaryName: string;
  sessions: SessionWithStats[];
}

async function getTeacherAttendanceSessions(teacherId: string): Promise<Attendance[]> {
  const attendanceRef = collection(db, "attendance");
  const q = query(attendanceRef, where("teacherId", "==", teacherId));
  console.log("🔥 FIRESTORE | [teacher/secretaries/page.tsx] | [getDocs] | [attendance] (teacherId filter)");
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

export default function SecretariesPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="teacher">
        <SecretariesContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function SecretariesContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingRecordKey, setSavingRecordKey] = useState<string | null>(null);
  const [editableSessionIds, setEditableSessionIds] = useState<Record<string, boolean>>({});
  const [pendingOverride, setPendingOverride] = useState<PendingOverridePayload | null>(null);
  const [selectedSecretaryUid, setSelectedSecretaryUid] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [shouldRefreshAfterClose, setShouldRefreshAfterClose] = useState(false);

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

  useEffect(() => {
    if (!selectedSecretaryUid) {
      setSelectedSessionId(null);
      return;
    }

    const secretaryStillVisible = groupedRecords.some((group) => group.secretaryUid === selectedSecretaryUid);
    if (!secretaryStillVisible) {
      setSelectedSecretaryUid(null);
      setSelectedSessionId(null);
    }
  }, [groupedRecords, selectedSecretaryUid]);

  const selectedSecretaryGroup = selectedSecretaryUid
    ? groupedRecords.find((group) => group.secretaryUid === selectedSecretaryUid) ?? null
    : null;
  const selectedSession = selectedSecretaryGroup?.sessions.find((session) => session.id === selectedSessionId) ?? null;

  const teacherStats = [
    {
      label: "ACTIVE SECRETARIES",
      value: <ActiveSecretariesCounter teacherId={user?.uid || ""} />,
    },
    {
      label: "SESSIONS",
      value: selectedSecretaryGroup ? selectedSecretaryGroup.sessions.length : filteredSessions.length,
    },
    {
      label: "DAYS RECORDED",
      value: new Set(
        (selectedSecretaryGroup ? selectedSecretaryGroup.sessions : filteredSessions).map((session) => session.date)
      ).size,
    },
    {
      label: "",
      value: (
        <button
          type="button"
          onClick={() => {
            setShowRegisterModal(true);
            setShouldRefreshAfterClose(false);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors h-[50px]"
          style={{ backgroundColor: "#2D3748", color: "#FFFFFF" }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = "#1A202C";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = "#2D3748";
          }}
        >
          <UserPlus size={18} strokeWidth={2} />
          <span className="text-sm">Appoint Secretary</span>
        </button>
      ),
    },
  ];

  const handleCloseRegisterModal = (): void => {
    if (shouldRefreshAfterClose && user?.uid) {
      queryClient.invalidateQueries({ queryKey: ["appointments", user.uid] });
      queryClient.invalidateQueries({ queryKey: ["teacherAttendanceSessions", user.uid] });
      queryClient.invalidateQueries({ queryKey: ["secretaryProfiles", user.uid] });
      setShouldRefreshAfterClose(false);
    }
    setShowRegisterModal(false);
  };

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
        title="Secretaries & Records"
        stats={teacherStats}
        searchPlaceholder={
          selectedSecretaryGroup
            ? "Search records by date, section, or subject..."
            : "Search secretary by name or LRN..."
        }
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
                Start by selecting a secretary to open their attendance history. Turn on editing for a session before overriding any student entry.
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
        ) : selectedSecretaryGroup ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setSelectedSecretaryUid(null);
                setSelectedSessionId(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#1E3A5F" }}
            >
              <ArrowLeft size={16} />
              Back to Secretaries
            </button>

            <motion.div
              key={selectedSecretaryGroup.secretaryUid}
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="px-5 py-4 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: "#F1F5F9" }}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold" style={{ color: "#1F2937" }}>
                    {selectedSecretaryGroup.secretaryName}
                  </p>
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: "#EEF2FF", color: "#1E3A8A" }}
                  >
                    LRN {selectedSecretaryGroup.secretaryLrn}
                  </span>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-semibold w-fit"
                  style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}
                >
                  {selectedSecretaryGroup.sessions.length} session{selectedSecretaryGroup.sessions.length > 1 ? "s" : ""}
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                {selectedSecretaryGroup.sessions.map((session) => {
                  const isEditingEnabled = Boolean(editableSessionIds[session.id]);

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSessionId(session.id)}
                      className="w-full text-left px-5 py-4 transition-colors"
                      style={{ backgroundColor: session.date === today ? "#FCFDFE" : "#FFFFFF" }}
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
                              Subject: {session.subject}
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
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupedRecords.map((group, groupIndex) => {
              const latestSession = group.sessions[0];
              const sectionParts = latestSession?.sectionLabel?.split(" - ") ?? [];
              const latestGradeLevel = sectionParts[0] ?? "";
              const latestSectionName = sectionParts.slice(1).join(" - ") || latestSession?.sectionLabel || "Unknown";

              return (
                <SecretaryCard
                  key={group.secretaryUid}
                  secretaryUid={group.secretaryUid}
                  secretaryLrn={group.secretaryLrn}
                  secretaryName={group.secretaryName}
                  secretaryEmail=""
                  sectionId={latestSession?.sectionId ?? ""}
                  sectionName={latestSectionName}
                  gradeLevel={latestGradeLevel}
                  subject={latestSession?.subject ?? "N/A"}
                  schoolYear={latestSession?.schoolYear ?? "N/A"}
                  status="active"
                  appointedAt={latestSession?.createdAt ?? latestSession?.date ?? new Date().toISOString()}
                  onViewRecords={() => setSelectedSecretaryUid(group.secretaryUid)}
                  index={groupIndex}
                  viewRecordsOnly={true}
                />
              );
            })}
          </div>
        )}
      </div>

      <DailyRecordDetailsModal
        isOpen={Boolean(selectedSession)}
        today={today}
        session={selectedSession}
        editableSessionIds={editableSessionIds}
        savingRecordKey={savingRecordKey}
        onClose={() => setSelectedSessionId(null)}
        onToggleSessionEditing={toggleSessionEditing}
        onSetPendingOverride={(payload) => setPendingOverride(payload)}
      />

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

      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseRegisterModal}
          ></div>

          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div
              className="p-6 lg:p-8 border-b flex-shrink-0"
              style={{ borderColor: "#e6e0ec", backgroundColor: "#faf8fc" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: "#1c1a22" }}>
                    Register Secretary
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "#484553" }}>
                    Create a new secretary account for your section
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseRegisterModal}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: "#f1ecf7", color: "#484553" }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = "#e7deff";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "#f1ecf7";
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-6 lg:p-8 flex-1 overflow-y-auto">
              <SecretaryCreationForm
                teacherId={user?.uid || ""}
                onSuccess={() => {
                  setShouldRefreshAfterClose(true);
                }}
                onCancel={handleCloseRegisterModal}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
