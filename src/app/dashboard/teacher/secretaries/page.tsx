"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Calendar, ClipboardCheck, UserPlus } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { DailyRecordDetailsModal, type PendingOverridePayload, type SessionWithStats } from "@/components/teacher/secretary-records";
import { SecretaryCard, SecretaryCreationForm } from "@/components/teacher/secretaries";
import { AttendanceHeader, BulkAttendanceActions, StudentAttendanceRow } from "@/components/secretary/attendance";
import { PopupAlert } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { RoleGuard } from "@/hooks/useRequireRole";
import {
  Attendance,
  AttendanceStatus,
  Appointment,
  buildSectionAttendanceId,
  buildSectionSlug,
  calculateAttendanceStats,
  getAttendanceSession,
  getTeacherAppointments,
  getTeacherAttendanceSessions,
  getTeacherSections,
  getUserProfilesBatch,
  getSectionStudents,
  overrideAttendanceRecord,
  startAttendanceSessionAsTeacher,
  submitFullAttendance,
  UserData,
} from "@/lib/firestore";

interface SecretaryGroupedRecords {
  secretaryUid: string;
  secretaryLrn: string;
  secretaryName: string;
  sessions: SessionWithStats[];
}

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

interface StudentAttendance {
  lrn: string;
  studentName: string;
  lastName: string;
  firstName: string;
  status: AttendanceStatus | null;
}

type WorkspaceView = "teacher-attendance" | "secretaries" | "section-history";

const EMPTY_TEACHER_STUDENTS: Array<{
  lrn: string;
  lastName: string;
  firstName: string;
  middleName: string;
}> = [];

const STUDENTS_PER_PAGE = 10;

function getDisplayEndIndex(end: number, total: number): number {
  return Math.min(end, total);
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

function getSortableTime(value: Date | string | { toDate: () => Date } | undefined): number {
  if (!value) {
    return 0;
  }

  let parsed: Date;
  if (typeof value === "string") {
    parsed = new Date(value);
  } else if ("toDate" in value) {
    parsed = value.toDate();
  } else {
    parsed = value;
  }

  const time = parsed.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getStatusStyles(status: AttendanceStatus): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  switch (status) {
    case "present":
      return { backgroundColor: "#DCFCE7", color: "#166534", borderColor: "#86EFAC" };
    case "late":
      return { backgroundColor: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D" };
    case "absent":
      return { backgroundColor: "#FEE2E2", color: "#B91C1C", borderColor: "#FCA5A5" };
    case "excused":
      return { backgroundColor: "#DBEAFE", color: "#1D4ED8", borderColor: "#93C5FD" };
  }
}

function formatStatusLabel(status: AttendanceStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
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

function formatRecorderRole(role?: "teacher" | "secretary"): string {
  if (role === "teacher") {
    return "Teacher";
  }

  if (role === "secretary") {
    return "Secretary";
  }

  return "Recorder";
}

function formatLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  const [selectedTeacherAttendanceSectionId, setSelectedTeacherAttendanceSectionId] = useState<string | null>(null);
  const [teacherSelectedDate, setTeacherSelectedDate] = useState(() => formatLocalDateInputValue(new Date()));
  const [teacherAttendanceRecords, setTeacherAttendanceRecords] = useState<StudentAttendance[]>([]);
  const [teacherHasSessionForDate, setTeacherHasSessionForDate] = useState(false);
  const [teacherSessionSubmitted, setTeacherSessionSubmitted] = useState(false);
  const [teacherIsEditing, setTeacherIsEditing] = useState(false);
  const [teacherAttendanceError, setTeacherAttendanceError] = useState<string | null>(null);
  const [teacherSubmitError, setTeacherSubmitError] = useState<string | null>(null);
  const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceView>("secretaries");

  const today = formatLocalDateInputValue(new Date());
  const recentWindowStart = new Date();
  recentWindowStart.setDate(recentWindowStart.getDate() - 120);
  const attendanceWindowStart = formatLocalDateInputValue(recentWindowStart);
  const teacherName = user?.displayName?.trim() || "Teacher";

  const filterByDateWindow = (sessions: Attendance[]): Attendance[] => {
    return sessions.filter((session) => session.date >= attendanceWindowStart && session.date <= today);
  };

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
    data: rawAttendanceSessions = [],
    isLoading: isLoadingAttendance,
    error: attendanceError,
  } = useQuery({
    queryKey: ["teacherAttendanceSessions", user?.uid, attendanceWindowStart, today],
    queryFn: () =>
      getTeacherAttendanceSessions(
        user?.uid || "",
        attendanceWindowStart,
        today
      ),
    enabled: !!user?.uid,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const attendanceSessions = filterByDateWindow(rawAttendanceSessions);
  const activeSections = sections.filter((section) => section.status === "active");
  const filteredActiveSections = activeSections.filter((section) => {
    if (!searchQuery.trim()) return true;

    const normalizedSearch = searchQuery.toLowerCase();
    const sectionLabel = `${section.gradeLevel} - ${section.sectionName}`.toLowerCase();

    return (
      sectionLabel.includes(normalizedSearch) ||
      section.schoolYear.toLowerCase().includes(normalizedSearch)
    );
  });

  const activeAppointments = appointments.filter((appointment) => appointment.status === "active");
  const activeSecretaryCount = activeAppointments.length;
  const secretaryUids = Array.from(
    new Set([
      ...attendanceSessions.map((session) => session.secretaryUid).filter((uid): uid is string => Boolean(uid)),
      ...activeAppointments.map((appointment) => appointment.secretaryUid),
    ])
  ).sort();
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

  const activeAppointmentBySecretary = new Map<string, Appointment>();
  activeAppointments.forEach((appointment) => {
    const existing = activeAppointmentBySecretary.get(appointment.secretaryUid);
    if (!existing) {
      activeAppointmentBySecretary.set(appointment.secretaryUid, appointment);
      return;
    }

    const existingTime = getSortableTime(existing.appointedAt);
    const currentTime = getSortableTime(appointment.appointedAt);
    if (currentTime > existingTime) {
      activeAppointmentBySecretary.set(appointment.secretaryUid, appointment);
    }
  });

  const secretaryCards = Array.from(activeAppointmentBySecretary.values())
    .map((appointment) => {
      const profile = secretaryProfiles.get(appointment.secretaryUid);
      const sectionLabel = sectionLabelById.get(appointment.sectionId) ?? "Unknown Section";
      const sectionParts = sectionLabel.split(" - ");

      return {
        secretaryUid: appointment.secretaryUid,
        secretaryLrn: appointment.secretaryLrn,
        secretaryName: profile?.displayName ?? `Secretary ${appointment.secretaryLrn}`,
        sectionId: appointment.sectionId,
        sectionName: sectionParts.slice(1).join(" - ") || sectionLabel,
        gradeLevel: sectionParts[0] ?? "",
        schoolYear: appointment.schoolYear,
        appointedAt: appointment.appointedAt,
      } satisfies SecretaryCardItem;
    })
    .filter((card) => {
      if (!searchQuery.trim()) return true;
      const normalizedSearch = searchQuery.toLowerCase();
      const sectionLabel = sectionLabelById.get(card.sectionId) ?? "";

      return (
        card.secretaryName.toLowerCase().includes(normalizedSearch) ||
        card.secretaryLrn.toLowerCase().includes(normalizedSearch) ||
        sectionLabel.toLowerCase().includes(normalizedSearch)
      );
    })
    .sort((a, b) => getSortableTime(b.appointedAt) - getSortableTime(a.appointedAt));

  const teacherAttendanceSectionId = selectedTeacherAttendanceSectionId;
  const teacherAttendanceSection = teacherAttendanceSectionId
    ? sections.find((section) => section.id === teacherAttendanceSectionId) ?? null
    : null;

  const { data: teacherSectionStudentsData, isLoading: teacherStudentsLoading } = useQuery({
    queryKey: ["sectionStudents", teacherAttendanceSectionId],
    queryFn: () => getSectionStudents(teacherAttendanceSectionId!),
    enabled: !!teacherAttendanceSectionId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
  const teacherSectionStudents = teacherSectionStudentsData ?? EMPTY_TEACHER_STUDENTS;

  const teacherSectionSlug = teacherAttendanceSection
    ? buildSectionSlug(teacherAttendanceSection.gradeLevel, teacherAttendanceSection.sectionName)
    : null;

  const teacherAttendanceId = teacherSectionSlug
    ? buildSectionAttendanceId(teacherSelectedDate, teacherSectionSlug)
    : null;

  const { data: teacherExistingSession } = useQuery({
    queryKey: ["attendanceSession", teacherAttendanceId],
    queryFn: () => getAttendanceSession(teacherAttendanceId!),
    enabled: !!teacherAttendanceId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const filteredSessions = attendanceSessions.filter((session) => {
    if (!searchQuery.trim()) return true;
    const normalizedSearch = searchQuery.toLowerCase();
    const profile = session.secretaryUid ? secretaryProfiles.get(session.secretaryUid) : undefined;
    const secretaryName = profile?.displayName ?? "";
    const sectionLabel = sectionLabelById.get(session.sectionId) ?? "";
    const recorderLabel = session.submittedByRole ?? session.createdByRole ?? "";

    return (
      secretaryName.toLowerCase().includes(normalizedSearch) ||
      (session.secretaryLrn ?? "").toLowerCase().includes(normalizedSearch) ||
      session.date.toLowerCase().includes(normalizedSearch) ||
      sectionLabel.toLowerCase().includes(normalizedSearch) ||
      recorderLabel.toLowerCase().includes(normalizedSearch)
    );
  });

  const groupedBySecretaryMap = new Map<string, SecretaryGroupedRecords>();
  const sessionsWithStats: SessionWithStats[] = [];
  filteredSessions.forEach((session) => {
    const recorderName = session.createdByRole === "teacher"
      ? teacherName
      : secretaryProfiles.get(session.createdByUid ?? session.secretaryUid ?? "")?.displayName ?? `Secretary ${session.secretaryLrn ?? ""}`;
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
    sessionsWithStats.push(sessionWithStats);

    const groupKey = session.secretaryUid ?? `teacher-${session.sectionId}`;
    const existingGroup = groupedBySecretaryMap.get(groupKey);
    if (existingGroup) {
      existingGroup.sessions.push(sessionWithStats);
      return;
    }

    groupedBySecretaryMap.set(groupKey, {
      secretaryUid: groupKey,
      secretaryLrn: session.secretaryLrn ?? "Teacher",
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

  const sharedSectionGroups = activeSections
    .map((section) => {
      const sectionSessions = sessionsWithStats.filter((session) => session.sectionId === section.id);

      return {
        secretaryUid: `section-${section.id}`,
        secretaryLrn: "Shared",
        secretaryName: `${section.gradeLevel} - ${section.sectionName}`,
        sessions: [...sectionSessions].sort((a, b) => b.date.localeCompare(a.date)),
      } satisfies SecretaryGroupedRecords;
    })
    .filter((group) => group.sessions.length > 0);

  const filteredSharedSectionGroups = sharedSectionGroups.filter((group) => {
    if (!searchQuery.trim()) return true;

    const normalizedSearch = searchQuery.toLowerCase();

    return (
      group.secretaryName.toLowerCase().includes(normalizedSearch) ||
      group.sessions.some((session) =>
        session.date.toLowerCase().includes(normalizedSearch) ||
        session.sectionLabel.toLowerCase().includes(normalizedSearch) ||
        session.recorderName.toLowerCase().includes(normalizedSearch)
      )
    );
  });

  useEffect(() => {
    if (!selectedSecretaryUid) {
      setSelectedSessionId(null);
      return;
    }

    const selectionStillVisible =
      secretaryCards.some((card) => card.secretaryUid === selectedSecretaryUid) ||
      groupedRecords.some((group) => group.secretaryUid === selectedSecretaryUid) ||
      filteredSharedSectionGroups.some((group) => group.secretaryUid === selectedSecretaryUid);

    if (!selectionStillVisible) {
      setSelectedSecretaryUid(null);
      setSelectedSessionId(null);
    }
  }, [filteredSharedSectionGroups, groupedRecords, secretaryCards, selectedSecretaryUid]);

  const selectedSecretaryRecordsGroup = selectedSecretaryUid
    ? groupedRecords.find((group) => group.secretaryUid === selectedSecretaryUid) ??
      (() => {
        const appointment = activeAppointmentBySecretary.get(selectedSecretaryUid);
        if (!appointment) return null;
        return {
          secretaryUid: appointment.secretaryUid,
          secretaryLrn: appointment.secretaryLrn,
          secretaryName:
            secretaryProfiles.get(appointment.secretaryUid)?.displayName ?? `Secretary ${appointment.secretaryLrn}`,
          sessions: [],
        } satisfies SecretaryGroupedRecords;
      })()
    : null;

  const selectedSectionHistoryGroup = selectedSecretaryUid
    ? filteredSharedSectionGroups.find((group) => group.secretaryUid === selectedSecretaryUid) ?? null
    : null;

  const selectedRecordsGroup = activeWorkspace === "section-history"
    ? selectedSectionHistoryGroup
    : selectedSecretaryRecordsGroup;

  const selectedSession = selectedRecordsGroup?.sessions.find((session) => session.id === selectedSessionId) ?? null;

  useEffect(() => {
    setTeacherSelectedDate(today);
    setTeacherCurrentPage(1);
    setTeacherAttendanceError(null);
    setTeacherSubmitError(null);
  }, [selectedTeacherAttendanceSectionId, today]);

  useEffect(() => {
    setTeacherCurrentPage(1);
  }, [teacherHasSessionForDate, teacherSessionSubmitted, teacherSelectedDate]);

  useEffect(() => {
    if (teacherSectionStudents.length > 0) {
      const sortedStudents = [...teacherSectionStudents].sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });

      setTeacherAttendanceRecords(
        sortedStudents.map((student) => ({
          lrn: student.lrn,
          studentName: `${student.lastName}, ${student.firstName} ${student.middleName}`,
          lastName: student.lastName,
          firstName: student.firstName,
          status: null,
        }))
      );
    } else {
      setTeacherAttendanceRecords((prev) => (prev.length === 0 ? prev : []));
    }
  }, [teacherSectionStudents]);

  useEffect(() => {
    if (teacherExistingSession) {
      setTeacherHasSessionForDate(true);

      if (teacherExistingSession.status === "locked" || (teacherExistingSession.records && Object.keys(teacherExistingSession.records).length > 0)) {
        setTeacherSessionSubmitted(true);
        setTeacherIsEditing(false);

        if (teacherExistingSession.records) {
          setTeacherAttendanceRecords((prev) =>
            prev.map((record) => {
              const existingRecord = teacherExistingSession.records![record.lrn];
              if (existingRecord) {
                return {
                  ...record,
                  status: existingRecord.status as AttendanceStatus,
                };
              }
              return record;
            })
          );
        }
      } else {
        setTeacherIsEditing(true);
        setTeacherSessionSubmitted(false);
      }
    } else {
      setTeacherHasSessionForDate(false);
      setTeacherSessionSubmitted(false);
      setTeacherIsEditing(false);
    }
  }, [teacherExistingSession]);

  const sectionHistorySessionCount = filteredSharedSectionGroups.reduce(
    (count, group) => count + group.sessions.length,
    0
  );
  const todayReadySectionsCount = activeSections.filter((section) =>
    attendanceSessions.some((session) => session.sectionId === section.id && session.date === today)
  ).length;
  const searchPlaceholder =
    activeWorkspace === "teacher-attendance"
      ? "Search sections by grade, name, or school year..."
      : activeWorkspace === "section-history"
        ? "Search section history by section, date, or recorder..."
        : selectedSecretaryRecordsGroup
          ? "Search records by date, section, or recorder..."
          : "Search secretaries by name, LRN, or section...";
  const handleCloseRegisterModal = (): void => {
    if (shouldRefreshAfterClose && user?.uid) {
      queryClient.invalidateQueries({ queryKey: ["appointments", user.uid] });
      queryClient.invalidateQueries({ queryKey: ["teacherAttendanceSessions", user.uid] });
      queryClient.invalidateQueries({ queryKey: ["secretaryProfiles", user.uid] });
      setShouldRefreshAfterClose(false);
    }
    setShowRegisterModal(false);
  };

  const openTeacherAttendance = (sectionId: string): void => {
    setActiveWorkspace("teacher-attendance");
    setSelectedTeacherAttendanceSectionId(sectionId);
    setSelectedSecretaryUid(null);
    setSelectedSessionId(null);
  };

  const getTodaySessionStatusForSection = (sectionId: string): "none" | "open" | "locked" => {
    const session = attendanceSessions.find(
      (item) => item.sectionId === sectionId && item.date === today
    );

    if (!session) {
      return "none";
    }

    return session.status;
  };

  const handleTeacherStatusChange = (lrn: string, status: AttendanceStatus): void => {
    setTeacherAttendanceRecords((prev) =>
      prev.map((record) =>
        record.lrn === lrn
          ? { ...record, status }
          : record
      )
    );
  };

  const handleTeacherMarkAllPresent = (): void => {
    setTeacherAttendanceRecords((prev) =>
      prev.map((record) => ({
        ...record,
        status: "present",
      }))
    );
  };

  const handleTeacherClearAll = (): void => {
    setTeacherAttendanceRecords((prev) =>
      prev.map((record) => ({
        ...record,
        status: null,
      }))
    );
  };

  const handleTeacherStartAttendanceSession = async (): Promise<void> => {
    if (!teacherAttendanceSection || !teacherSectionSlug || !user?.uid) {
      setTeacherAttendanceError("Missing section information.");
      return;
    }

    try {
      setTeacherAttendanceError(null);
      setTeacherSubmitError(null);

      const newAttendanceId = await startAttendanceSessionAsTeacher(
        teacherAttendanceSection.id,
        user.uid,
        teacherSectionSlug,
        teacherSelectedDate,
        teacherAttendanceSection.schoolYear,
        user.uid
      );

      await queryClient.invalidateQueries({ queryKey: ["attendanceSession", newAttendanceId] });

      setTeacherHasSessionForDate(true);
      setTeacherIsEditing(true);
      setTeacherSessionSubmitted(false);
    } catch (error) {
      console.error("Error starting teacher attendance session:", error);
      setTeacherAttendanceError(error instanceof Error ? error.message : "Failed to start attendance session.");
    }
  };

  const handleTeacherSubmitAttendance = async (): Promise<void> => {
    if (!teacherAttendanceSection || !teacherSectionSlug || !teacherAttendanceId || !user?.uid) {
      setTeacherAttendanceError("Missing required information to submit attendance.");
      return;
    }

    const allMarked = teacherAttendanceRecords.every((record) => record.status !== null);
    if (!allMarked) {
      setTeacherAttendanceError("Please mark attendance for all students.");
      return;
    }

    try {
      setTeacherAttendanceError(null);
      setTeacherSubmitError(null);

      const studentsData = teacherAttendanceRecords.map((record) => ({
        lrn: record.lrn,
        studentName: record.studentName,
        lastName: record.lastName,
        status: record.status as AttendanceStatus,
      }));

      await submitFullAttendance(
        teacherAttendanceId,
        teacherAttendanceSection.id,
        user.uid,
        user.uid,
        teacherSectionSlug,
        teacherSelectedDate,
        teacherAttendanceSection.schoolYear,
        studentsData,
        {
          uid: user.uid,
          role: "teacher",
        }
      );

      setTeacherHasSessionForDate(true);
      setTeacherSessionSubmitted(true);
      setTeacherIsEditing(false);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendanceSession", teacherAttendanceId] }),
        queryClient.invalidateQueries({ queryKey: ["teacherAttendanceSessions", user.uid] }),
        queryClient.invalidateQueries({ queryKey: ["teacherAttendanceToday", user.uid, teacherSelectedDate] }),
        queryClient.invalidateQueries({ queryKey: ["studentSummaries"] }),
      ]);
    } catch (error) {
      console.error("Error submitting teacher attendance:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit attendance.";
      setTeacherSubmitError(errorMessage.includes("locked") ? "This session is already submitted and locked." : errorMessage);
      await queryClient.invalidateQueries({ queryKey: ["attendanceSession", teacherAttendanceId] });
    }
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
    const resolvedSectionSlug =
      session.sectionSlug ||
      (session.sectionId ? sectionSlugById.get(session.sectionId) ?? "" : "") ||
      (() => {
        if (!session.sectionLabel) {
          return "";
        }

        const [gradeLevel, ...sectionNameParts] = session.sectionLabel.split(" - ");
        const sectionName = sectionNameParts.join(" - ").trim();

        if (!gradeLevel || !sectionName) {
          return "";
        }

        return buildSectionSlug(gradeLevel.trim(), sectionName);
      })();

    if (!resolvedSectionSlug) {
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
        resolvedSectionSlug,
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
        searchPlaceholder={searchPlaceholder}
        onSearch={(query) => setSearchQuery(query)}
      />

      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {[
            {
              key: "teacher-attendance" as const,
              label: "Teacher Attendance",
              description: "Select a section and record the class attendance for the day.",
              countLabel: `${activeSections.length} active section${activeSections.length === 1 ? "" : "s"}`,
              icon: <ClipboardCheck size={18} />,
            },
            {
              key: "secretaries" as const,
              label: "Secretary List",
              description: "View appointed secretaries and open each secretary's recorded sessions.",
              countLabel: `${activeSecretaryCount} active secretar${activeSecretaryCount === 1 ? "y" : "ies"}`,
              icon: <UserPlus size={18} />,
            },
            {
              key: "section-history" as const,
              label: "Shared Section History",
              description: "Open a section to view all recorded attendance days for that class.",
              countLabel: `${filteredSharedSectionGroups.length} section${filteredSharedSectionGroups.length === 1 ? "" : "s"} with history`,
              icon: <Calendar size={18} />,
            },
          ].map((workspace) => {
            const isActive = activeWorkspace === workspace.key;

            return (
              <motion.button
                key={workspace.key}
                type="button"
                onClick={() => {
                  setActiveWorkspace(workspace.key);
                  setSelectedSessionId(null);
                }}
                className="group relative overflow-hidden rounded-2xl border p-5 text-left cursor-pointer"
                style={{
                  backgroundColor: isActive ? "#1E3A5F" : "#FFFFFF",
                  borderColor: isActive ? "#1E3A5F" : "#D7E2EF",
                  color: isActive ? "#FFFFFF" : "#0F172A",
                }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: isActive ? "rgba(255,255,255,0.22)" : "#DBEAFE" }}
                />
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: isActive ? "rgba(255,255,255,0.14)" : "#EAF2FF",
                      color: isActive ? "#FFFFFF" : "#1E3A5F",
                    }}
                  >
                    {workspace.icon}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: isActive ? "rgba(255,255,255,0.14)" : "#F8FAFC",
                      color: isActive ? "#DBEAFE" : "#64748B",
                    }}
                  >
                    {workspace.countLabel}
                  </span>
                </div>
                <p className="mt-4 text-base font-semibold">{workspace.label}</p>
                <p className="mt-2 text-sm" style={{ color: isActive ? "#DBEAFE" : "#475569" }}>
                  {workspace.description}
                </p>

                <div className="mt-5 flex items-center justify-end">
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{
                      backgroundColor: isActive ? "rgba(255,255,255,0.14)" : "#F8FAFC",
                      color: isActive ? "#FFFFFF" : "#1E3A5F",
                      border: isActive ? "1px solid rgba(255,255,255,0.16)" : "1px solid #D7E2EF",
                    }}
                  >
                    <ArrowUpRight size={16} />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {isLoadingAttendance ? (
          <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}>
            <p style={{ color: "#6B7280" }}>Loading attendance records...</p>
          </div>
        ) : attendanceError ? (
          <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}>
            <p style={{ color: "#DC2626" }}>
              Failed to load attendance records. Please refresh and try again.
            </p>
          </div>
        ) : secretaryCards.length === 0 && activeSections.length === 0 ? (
          <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}>
            <p style={{ color: "#9CA3AF" }}>
              No active sections or secretary appointments found for this teacher yet.
            </p>
          </div>
        ) : activeWorkspace === "teacher-attendance" ? (
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
                  const sessionStatus = getTodaySessionStatusForSection(section.id);
                  const isSelected = selectedTeacherAttendanceSectionId === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => openTeacherAttendance(section.id)}
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
                  onClick={() => setSelectedTeacherAttendanceSectionId(null)}
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
                    onClose={() => setTeacherAttendanceError(null)}
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
                  onDateChange={setTeacherSelectedDate}
                  hasSessionToday={teacherHasSessionForDate}
                  sessionSubmitted={teacherSessionSubmitted}
                  isEditing={teacherIsEditing}
                  allowCorrections={false}
                  onStartSession={handleTeacherStartAttendanceSession}
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
                    onClose={() => setTeacherSubmitError(null)}
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
                    onMarkAllPresent={handleTeacherMarkAllPresent}
                    onClearAll={handleTeacherClearAll}
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
                          onStatusChange={handleTeacherStatusChange}
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
                        onStatusChange={handleTeacherStatusChange}
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
                        onClick={() => setTeacherCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                            onClick={() => setTeacherCurrentPage(page)}
                            className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                            style={{ backgroundColor: teacherCurrentPage === page ? "#1E3A5F" : "#FFFFFF", color: teacherCurrentPage === page ? "#FFFFFF" : "#374151", border: "1px solid #E5E7EB" }}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setTeacherCurrentPage((prev) => Math.min(prev + 1, Math.ceil(teacherAttendanceRecords.length / STUDENTS_PER_PAGE)))}
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
                      onClick={handleTeacherSubmitAttendance}
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
        ) : activeWorkspace === "section-history" ? (
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
              {saveError && (
                <p className="mt-3 text-sm" style={{ color: "#B91C1C" }}>
                  {saveError}
                </p>
              )}
            </div>

            {selectedSectionHistoryGroup ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSecretaryUid(null);
                    setSelectedSessionId(null);
                  }}
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
                            onClick={() => setSelectedSessionId(session.id)}
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
                                    <span className="font-semibold" style={{ color: "#334155" }}>Section Name</span>
                                    <span>{session.sectionLabel}</span>
                                  </span>
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
                  const isSelected = selectedSecretaryUid === group.secretaryUid;
                  const latestRecorderRole = latestSession
                    ? formatRecorderRole(latestSession.submittedByRole ?? latestSession.createdByRole)
                    : "Recorder";

                  return (
                    <button
                      key={group.secretaryUid}
                      type="button"
                      onClick={() => {
                        setActiveWorkspace("section-history");
                        setSelectedSecretaryUid(group.secretaryUid);
                        setSelectedSessionId(null);
                      }}
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
        ) : (
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
              {saveError && (
                <p className="mt-3 text-sm" style={{ color: "#B91C1C" }}>
                  {saveError}
                </p>
              )}
            </div>

            {selectedSecretaryRecordsGroup ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSecretaryUid(null);
                    setSelectedSessionId(null);
                  }}
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
                        const isEditingEnabled = Boolean(editableSessionIds[session.id]);

                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => setSelectedSessionId(session.id)}
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
                        setActiveWorkspace("secretaries");
                        setSelectedSecretaryUid(card.secretaryUid);
                        setSelectedSessionId(null);
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
            className="w-full max-w-[560px] rounded-2xl border p-5 shadow-xl"
            style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-xl font-bold leading-tight" style={{ color: "#0F172A" }}>
              Confirm attendance change
            </p>
            <p className="mt-1.5 text-sm" style={{ color: "#475569" }}>
              You are changing this student&apos;s attendance for {formatDate(pendingOverride.session.date)}.
            </p>

            <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "#DDE5EE", backgroundColor: "#F8FAFC" }}>
              <p className="text-xl font-black uppercase tracking-tight leading-tight" style={{ color: "#0F172A" }}>
                {pendingOverride.studentName}
              </p>
              <p className="mt-1.5 text-sm" style={{ color: "#475569" }}>
                {pendingOverride.lrn} • {pendingOverride.session.sectionLabel}
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                <div className="rounded-lg border px-3 py-2" style={{ borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#64748B" }}>
                    Current
                  </p>
                  <div className="mt-1.5">
                    <span
                      className="inline-flex min-w-[120px] items-center justify-center rounded-lg border px-3 py-2 text-sm font-extrabold uppercase tracking-wide"
                      style={getStatusStyles(pendingOverride.currentStatus)}
                    >
                      {formatStatusLabel(pendingOverride.currentStatus)}
                    </span>
                  </div>
                </div>
                <div
                  className="hidden sm:flex items-center justify-center px-2 text-xl font-bold"
                  style={{ color: "#64748B" }}
                  aria-hidden="true"
                >
                  →
                </div>
                <div
                  className="rounded-lg border px-3 py-2"
                  style={{
                    borderColor: "#A5B4FC",
                    backgroundColor: "#EEF2FF",
                    borderLeft: "4px solid #3730A3",
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#3730A3" }}>
                    New Status
                  </p>
                  <div className="mt-1.5">
                    <span
                      className="inline-flex min-w-[120px] items-center justify-center rounded-lg border px-3 py-2 text-sm font-extrabold uppercase tracking-wide"
                      style={getStatusStyles(pendingOverride.nextStatus)}
                    >
                      {formatStatusLabel(pendingOverride.nextStatus)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>
                Please confirm this override before saving.
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingOverride(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "#F3F4F6", color: "#374151" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOverride}
                disabled={Boolean(savingRecordKey)}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
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
