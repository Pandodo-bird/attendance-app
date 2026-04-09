"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { DailyRecordDetailsModal, type PendingOverridePayload } from "@/components/teacher/secretary-records";
import {
  WorkspaceSelectorCards,
  TeacherAttendanceWorkspace,
  SecretaryListWorkspace,
  SectionHistoryWorkspace,
  OverrideConfirmModal,
} from "@/components/teacher/secretaries";
import { SecretaryCreationForm } from "@/components/teacher/secretaries";
import { useAuth } from "@/contexts/AuthContext";
import { RoleGuard } from "@/hooks/useRequireRole";
import {
  AttendanceStatus,
  buildSectionAttendanceId,
  buildSectionSlug,
  calculateAttendanceStats,
  getAttendanceSession,
  getTeacherAttendance,
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

import type { SessionWithStats } from "@/components/teacher/secretary-records";
import type { Appointment, Attendance } from "@/lib/firestore";

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

function formatLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  const [sectionHistoryStartDate, setSectionHistoryStartDate] = useState("");
  const [sectionHistoryEndDate, setSectionHistoryEndDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

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

  const needsFullAttendanceHistory =
    activeWorkspace === "section-history" ||
    (activeWorkspace === "secretaries" && selectedSecretaryUid !== null);

  const needsTodayAttendance =
    activeWorkspace === "teacher-attendance" ||
    activeWorkspace === "secretaries";

  const {
    data: rawAttendanceSessions = [],
    isLoading: isLoadingAttendanceHistory,
    error: attendanceHistoryError,
  } = useQuery({
    queryKey: ["teacherAttendanceSessions", user?.uid, attendanceWindowStart, today],
    queryFn: () =>
      getTeacherAttendanceSessions(
        user?.uid || "",
        attendanceWindowStart,
        today
      ),
    enabled: !!user?.uid && needsFullAttendanceHistory,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const {
    data: todayAttendanceSessions = [],
    isLoading: isLoadingTodayAttendance,
    error: todayAttendanceError,
  } = useQuery({
    queryKey: ["teacherAttendanceToday", user?.uid, today],
    queryFn: () => getTeacherAttendance(user?.uid || "", today),
    enabled: !!user?.uid && needsTodayAttendance,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const attendanceSessions = needsFullAttendanceHistory
    ? filterByDateWindow(rawAttendanceSessions)
    : todayAttendanceSessions;

  const isLoadingAttendance = needsFullAttendanceHistory
    ? isLoadingAttendanceHistory
    : isLoadingTodayAttendance;

  const attendanceError = needsFullAttendanceHistory
    ? attendanceHistoryError
    : todayAttendanceError;
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

  const filteredSharedSectionGroups = sharedSectionGroups.map((group) => {
    const filteredSessions = group.sessions.filter((session) => {
      if (sectionHistoryStartDate && session.date < sectionHistoryStartDate) return false;
      if (sectionHistoryEndDate && session.date > sectionHistoryEndDate) return false;
      return true;
    });
    return { ...group, sessions: filteredSessions };
  }).filter((group) => {
    if (group.sessions.length === 0) return false;

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
      return;
    }

    if (!editableSessionIds[session.id]) {
      return;
    }

    const recordKey = `${session.id}:${lrn}`;

    try {
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
        <WorkspaceSelectorCards
          activeWorkspace={activeWorkspace}
          onWorkspaceChange={(workspace) => {
            setActiveWorkspace(workspace);
            setSelectedSessionId(null);
          }}
          activeSectionsCount={activeSections.length}
          activeSecretaryCount={activeSecretaryCount}
          sharedSectionGroupsCount={filteredSharedSectionGroups.length}
        />

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
          <TeacherAttendanceWorkspace
            activeSections={activeSections}
            filteredActiveSections={filteredActiveSections}
            attendanceSessions={attendanceSessions}
            today={today}
            selectedTeacherAttendanceSectionId={selectedTeacherAttendanceSectionId}
            teacherAttendanceSection={teacherAttendanceSection}
            teacherSelectedDate={teacherSelectedDate}
            teacherHasSessionForDate={teacherHasSessionForDate}
            teacherSessionSubmitted={teacherSessionSubmitted}
            teacherIsEditing={teacherIsEditing}
            teacherAttendanceRecords={teacherAttendanceRecords}
            teacherStudentsLoading={teacherStudentsLoading}
            teacherAttendanceError={teacherAttendanceError}
            teacherSubmitError={teacherSubmitError}
            teacherCurrentPage={teacherCurrentPage}
            teacherExistingSession={teacherExistingSession}
            onSelectSection={openTeacherAttendance}
            onBackToSections={() => setSelectedTeacherAttendanceSectionId(null)}
            onDateChange={setTeacherSelectedDate}
            onStartSession={handleTeacherStartAttendanceSession}
            onSubmitAttendance={handleTeacherSubmitAttendance}
            onMarkAllPresent={handleTeacherMarkAllPresent}
            onClearAll={handleTeacherClearAll}
            onStatusChange={handleTeacherStatusChange}
            onPageChange={setTeacherCurrentPage}
            onClearAttendanceError={() => setTeacherAttendanceError(null)}
            onClearSubmitError={() => setTeacherSubmitError(null)}
          />
        ) : activeWorkspace === "section-history" ? (
          <SectionHistoryWorkspace
            filteredSharedSectionGroups={filteredSharedSectionGroups}
            selectedSectionHistoryGroup={selectedSectionHistoryGroup}
            sectionHistorySessionCount={sectionHistorySessionCount}
            sectionHistoryStartDate={sectionHistoryStartDate}
            sectionHistoryEndDate={sectionHistoryEndDate}
            showDateFilter={showDateFilter}
            today={today}
            editableSessionIds={editableSessionIds}
            onSelectSection={(groupUid) => {
              setActiveWorkspace("section-history");
              setSelectedSecretaryUid(groupUid);
              setSelectedSessionId(null);
            }}
            onBackToHistory={() => {
              setSelectedSecretaryUid(null);
              setSelectedSessionId(null);
            }}
            onSelectSession={setSelectedSessionId}
            onToggleDateFilter={() => setShowDateFilter(true)}
            onStartDateChange={setSectionHistoryStartDate}
            onEndDateChange={setSectionHistoryEndDate}
            onClearDateFilter={() => {
              setSectionHistoryStartDate("");
              setSectionHistoryEndDate("");
              setShowDateFilter(false);
            }}
          />
        ) : (
          <SecretaryListWorkspace
            secretaryCards={secretaryCards}
            selectedSecretaryRecordsGroup={selectedSecretaryRecordsGroup}
            activeSecretaryCount={activeSecretaryCount}
            today={today}
            getTodaySessionStatusForSection={getTodaySessionStatusForSection}
            onSelectSecretary={(secretaryUid) => {
              setActiveWorkspace("secretaries");
              setSelectedSecretaryUid(secretaryUid);
              setSelectedSessionId(null);
            }}
            onBackToSecretaries={() => {
              setSelectedSecretaryUid(null);
              setSelectedSessionId(null);
            }}
            onSelectSession={setSelectedSessionId}
            onAppointSecretary={() => setShowRegisterModal(true)}
          />
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
        <OverrideConfirmModal
          pendingOverride={pendingOverride}
          isSaving={Boolean(savingRecordKey)}
          onConfirm={handleOverride}
          onCancel={() => setPendingOverride(null)}
        />
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
