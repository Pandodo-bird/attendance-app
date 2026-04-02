"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Calendar, Edit2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type Appointment,
  type Attendance,
  type Section,
  type Student,
  buildSectionAttendanceId,
  getSecretaryAppointments,
  getSectionById,
  getSectionStudents,
  startAttendanceSession,
  submitFullAttendance,
  getAttendanceSession,
} from "@/lib/firestore";
import {
  buildOfflineOperationId,
  cleanupOfflineItemsForSchoolYear,
  deleteAttendanceDraft,
  enqueueAttendanceSync,
  getAttendanceDraft,
  getLatestQueueItemForSession,
  OfflineStorageCapError,
  saveAttendanceDraft,
  subscribeToOfflineQueueChanges,
  type OfflineAttendanceDraft,
  type OfflineAttendanceDraftStudentPayload,
  type OfflineAttendanceQueueItem,
} from "@/lib/offlineQueue";
import { useNetworkStatus } from "@/lib/networkStatus";
import {
  readSecretaryBootstrapCache,
  writeSecretaryBootstrapCache,
} from "@/lib/secretaryOfflineBootstrap";
import { useSecretarySyncStatus } from "@/lib/syncManager";
import { StudentAttendanceRow } from "@/components/secretary/attendance";
import { BulkAttendanceActions } from "@/components/secretary/attendance";
import { AttendanceHeader } from "@/components/secretary/attendance";
import { PopupAlert } from "@/components/ui";

type AttendanceStatus = "present" | "late" | "absent" | "excused";

interface StudentAttendance {
  lrn: string;
  studentName: string;
  lastName: string;
  firstName: string;
  status: AttendanceStatus | null;
}

const STUDENTS_PER_PAGE = 10;
const getDisplayEndIndex = (end: number, total: number): number => Math.min(end, total);

function formatLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatSessionTimestamp(
  value: Date | string | { toDate?: () => Date } | undefined
): string {
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

function getAttendanceLastRemoteChangeAt(session: Attendance | null | undefined): number | null {
  if (!session?.records) {
    return null;
  }

  let latestChangeAt: number | null = null;

  Object.values(session.records).forEach((record) => {
    const value = record.updatedAt;
    if (!value) {
      return;
    }

    const nextMillis = typeof value === "object" && value && "toMillis" in value && typeof value.toMillis === "function"
      ? value.toMillis()
      : value instanceof Date
        ? value.getTime()
        : new Date(String(value)).getTime();

    if (!Number.isNaN(nextMillis) && (latestChangeAt === null || nextMillis > latestChangeAt)) {
      latestChangeAt = nextMillis;
    }
  });

  return latestChangeAt;
}

function mergeStatusesIntoRecords(
  records: StudentAttendance[],
  students: Array<{ lrn: string; status: AttendanceStatus | null }>,
): StudentAttendance[] {
  const statusMap = new Map(students.map((student) => [student.lrn, student.status]));

  return records.map((record) => ({
    ...record,
    status: statusMap.get(record.lrn) ?? null,
  }));
}

function isTransientAttendanceError(error: unknown): boolean {
  const errorCode = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: string }).code)
    : "";
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    errorCode.includes("unavailable") ||
    errorCode.includes("deadline-exceeded") ||
    errorCode.includes("network") ||
    errorMessage.includes("offline") ||
    errorMessage.includes("network")
  );
}

export default function SecretaryAttendancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const syncStatus = useSecretarySyncStatus(user?.uid);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return formatLocalDateInputValue(new Date());
  });
  const [hasSessionToday, setHasSessionToday] = useState<boolean>(false);
  const [sessionSubmitted, setSessionSubmitted] = useState<boolean>(false);
  const [allowCorrections] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);

  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [localDraft, setLocalDraft] = useState<OfflineAttendanceDraft | null>(null);
  const [queuedSubmission, setQueuedSubmission] = useState<OfflineAttendanceQueueItem | null>(null);
  const [localSessionLoaded, setLocalSessionLoaded] = useState<boolean>(false);
  const [cachedBootstrapLoaded, setCachedBootstrapLoaded] = useState<boolean>(false);
  const [cachedAppointment, setCachedAppointment] = useState<Appointment | null>(null);
  const [cachedSection, setCachedSection] = useState<Section | null>(null);
  const [cachedStudents, setCachedStudents] = useState<Student[]>([]);

  useEffect(() => {
    setCurrentPage(1);
  }, [hasSessionToday, sessionSubmitted]);

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments", user?.uid],
    queryFn: () => getSecretaryAppointments(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!user?.uid) {
      setCachedAppointment(null);
      setCachedSection(null);
      setCachedStudents([]);
      setCachedBootstrapLoaded(true);
      return;
    }

    const cachedBootstrap = readSecretaryBootstrapCache(user.uid);
    setCachedAppointment(cachedBootstrap?.appointment ?? null);
    setCachedSection(cachedBootstrap?.section ?? null);
    setCachedStudents(cachedBootstrap?.students ?? []);
    setCachedBootstrapLoaded(true);
  }, [user?.uid]);

  const selectedAppointment = appointments.length > 0 ? appointments[0] : cachedAppointment;
  const sectionId = selectedAppointment?.sectionId;

  const { data: section } = useQuery({
    queryKey: ["section", sectionId],
    queryFn: () => getSectionById(sectionId!),
    enabled: !!sectionId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const resolvedSection = section ?? cachedSection;

  const sectionSlug = resolvedSection
    ? `${resolvedSection.gradeLevel}-${resolvedSection.sectionName.replace(/\s+/g, "-")}`
    : null;

  const attendanceId = sectionSlug
    ? buildSectionAttendanceId(selectedDate, sectionSlug)
    : null;

  const { data: existingSession } = useQuery({
    queryKey: ["attendanceSession", attendanceId],
    queryFn: () => getAttendanceSession(attendanceId!),
    enabled: !!attendanceId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: sectionStudentsQuery = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["sectionStudents", sectionId],
    queryFn: () => getSectionStudents(sectionId!),
    enabled: !!sectionId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const sectionStudents = sectionStudentsQuery.length > 0 ? sectionStudentsQuery : cachedStudents;

  useEffect(() => {
    if (!user?.uid || !selectedAppointment || !resolvedSection || sectionStudentsQuery.length === 0) {
      return;
    }

    writeSecretaryBootstrapCache(user.uid, {
      appointment: selectedAppointment,
      section: resolvedSection,
      students: sectionStudentsQuery,
    });
  }, [resolvedSection, sectionStudentsQuery, selectedAppointment, user?.uid]);

  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendance[]>([]);

  const operationId = user?.uid && attendanceId
    ? buildOfflineOperationId(user.uid, attendanceId)
    : null;

  useEffect(() => {
    if (!user?.uid || !attendanceId) {
      setLocalDraft(null);
      setQueuedSubmission(null);
      setLocalSessionLoaded(false);
      return;
    }

    let cancelled = false;

    const loadLocalSessionState = async () => {
      const [draft, queueItem] = await Promise.all([
        getAttendanceDraft(user.uid, attendanceId),
        getLatestQueueItemForSession(user.uid, attendanceId),
      ]);

      if (cancelled) {
        return;
      }

      setLocalDraft(draft);
      setQueuedSubmission(
        queueItem &&
        queueItem.status !== "synced" &&
        queueItem.failureCode !== "locked" &&
        queueItem.status !== "needs_review"
          ? queueItem
          : null,
      );
      setLocalSessionLoaded(true);
    };

    void loadLocalSessionState();

    const unsubscribe = subscribeToOfflineQueueChanges((changedUid) => {
      if (!changedUid || changedUid === user.uid) {
        void loadLocalSessionState();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [attendanceId, user?.uid]);

  useEffect(() => {
    if (user?.uid && selectedAppointment?.schoolYear) {
      void cleanupOfflineItemsForSchoolYear(user.uid, selectedAppointment.schoolYear);
    }
  }, [selectedAppointment?.schoolYear, user?.uid]);

  useEffect(() => {
    if (sectionStudents.length > 0) {
      const sortedStudents = [...sectionStudents].sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });

      setAttendanceRecords(
        sortedStudents.map((student) => ({
          lrn: student.lrn,
          studentName: `${student.lastName}, ${student.firstName} ${student.middleName}`,
          lastName: student.lastName,
          firstName: student.firstName,
          status: null,
        }))
      );
    }
  }, [sectionStudents]);

  useEffect(() => {
    if (!localSessionLoaded) {
      return;
    }

    if (queuedSubmission) {
      setHasSessionToday(true);
      setSessionSubmitted(true);
      setIsEditing(false);
      setAttendanceRecords((prev) => mergeStatusesIntoRecords(prev, queuedSubmission.students));
      return;
    }

    if (localDraft?.hasSessionStarted) {
      setHasSessionToday(true);
      setSessionSubmitted(false);
      setIsEditing(true);
      setAttendanceRecords((prev) => mergeStatusesIntoRecords(prev, localDraft.students));
      return;
    }

    if (existingSession) {
      setHasSessionToday(true);

      if (existingSession.status === "locked" || (existingSession.records && Object.keys(existingSession.records).length > 0)) {
        setSessionSubmitted(true);
        setIsEditing(false);

        if (existingSession.records) {
          setAttendanceRecords((prev) =>
            prev.map((record) => {
              const existingRecord = existingSession.records![record.lrn];
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
        setIsEditing(true);
        setSessionSubmitted(false);
      }
    } else {
      setHasSessionToday(false);
      setSessionSubmitted(false);
      setIsEditing(false);
      setAttendanceRecords((prev) =>
        prev.map((record) => ({
          ...record,
          status: null,
        }))
      );
    }
  }, [existingSession, localDraft, localSessionLoaded, queuedSubmission]);

  useEffect(() => {
    if (
      !user?.uid ||
      !attendanceId ||
      !selectedAppointment ||
      !sectionSlug ||
      !localSessionLoaded ||
      !hasSessionToday ||
      sessionSubmitted
    ) {
      return;
    }

    const draftStudents: OfflineAttendanceDraftStudentPayload[] = attendanceRecords.map((record) => ({
      lrn: record.lrn,
      studentName: record.studentName,
      lastName: record.lastName,
      status: record.status,
    }));

    void saveAttendanceDraft({
      uid: user.uid,
      attendanceId,
      sectionId: selectedAppointment.sectionId,
      sectionSlug,
      date: selectedDate,
      schoolYear: selectedAppointment.schoolYear,
      teacherId: selectedAppointment.teacherId,
      secretaryUid: selectedAppointment.secretaryUid,
      students: draftStudents,
      hasSessionStarted: true,
      lastKnownRemoteChangeAt: getAttendanceLastRemoteChangeAt(existingSession),
    });
  }, [
    attendanceId,
    attendanceRecords,
    existingSession,
    hasSessionToday,
    localSessionLoaded,
    sectionSlug,
    selectedAppointment,
    selectedDate,
    sessionSubmitted,
    user?.uid,
  ]);

  const teacherStartedSession = existingSession?.createdByRole === "teacher";

  const handleStatusChange = (lrn: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) =>
      prev.map((record) =>
        record.lrn === lrn
          ? { ...record, status }
          : record
      )
    );
  };

  const handleMarkAllPresent = () => {
    setAttendanceRecords((prev) =>
      prev.map((record) => ({
        ...record,
        status: "present",
      }))
    );
  };

  const handleClearAll = () => {
    setAttendanceRecords((prev) =>
      prev.map((record) => ({
        ...record,
        status: null,
      }))
    );
  };

  const handleStartSession = async () => {
    if (!selectedAppointment) {
      setError("No active appointment found. Please wait for your teacher to appoint you.");
      return;
    }

    if (!sectionSlug) {
      setError("Section information not loaded. Please try again.");
      return;
    }

    try {
      setError(null);
      setSubmitError(null);
      setInfoMessage(null);

      if (!isOnline) {
        setHasSessionToday(true);
        setIsEditing(true);
        setSessionSubmitted(false);
        setInfoMessage("Session saved locally. You can keep recording attendance offline.");
        return;
      }

      const newAttendanceId = await startAttendanceSession(selectedAppointment, sectionSlug, selectedDate, selectedAppointment.schoolYear);

      await queryClient.invalidateQueries({ queryKey: ["attendanceSession", newAttendanceId] });
      
      setHasSessionToday(true);
      setIsEditing(true);
      setSessionSubmitted(false);
    } catch (err) {
      if (isTransientAttendanceError(err)) {
        setHasSessionToday(true);
        setIsEditing(true);
        setSessionSubmitted(false);
        setInfoMessage("Connection dropped. Attendance is being kept locally until you save it.");
        return;
      }

      console.error("Error starting session:", err);
      setError(err instanceof Error ? err.message : "Failed to start attendance session");
    }
  };

  const handleSubmitAttendance = async () => {
      if (!selectedAppointment || !sectionSlug || !attendanceId) {
      setError("Missing required information to save attendance");
      return;
    }

    const allMarked = attendanceRecords.every((r) => r.status !== null);
    if (!allMarked) {
      setError("Please mark attendance for all students");
      return;
    }

    try {
      setError(null);
      setInfoMessage(null);

      const studentsData = attendanceRecords.map((record) => ({
        lrn: record.lrn,
        studentName: record.studentName,
        lastName: record.lastName,
        status: record.status as AttendanceStatus,
      }));

      if (!isOnline) {
        if (!operationId || !user?.uid) {
          throw new Error("Offline queue is not ready for this session yet.");
        }

        await enqueueAttendanceSync({
          operationId,
          uid: user.uid,
          attendanceId,
          sectionId: selectedAppointment.sectionId,
          sectionSlug,
          date: selectedDate,
          schoolYear: selectedAppointment.schoolYear,
          teacherId: selectedAppointment.teacherId,
          secretaryUid: selectedAppointment.secretaryUid,
          sessionKey: `${selectedAppointment.sectionId}:${selectedDate}`,
          students: studentsData,
          lastKnownRemoteChangeAt: getAttendanceLastRemoteChangeAt(existingSession),
        });

        await deleteAttendanceDraft(user.uid, attendanceId);
        setQueuedSubmission({
          operationId,
          uid: user.uid,
          attendanceId,
          sectionId: selectedAppointment.sectionId,
          sectionSlug,
          date: selectedDate,
          schoolYear: selectedAppointment.schoolYear,
          teacherId: selectedAppointment.teacherId,
          secretaryUid: selectedAppointment.secretaryUid,
          sessionKey: `${selectedAppointment.sectionId}:${selectedDate}`,
          students: studentsData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
          lastError: null,
          lastKnownRemoteChangeAt: getAttendanceLastRemoteChangeAt(existingSession),
          status: "pending",
          failureCode: null,
          syncedAt: null,
        });
        setLocalDraft(null);
        setSessionSubmitted(true);
        setIsEditing(false);
        setSubmitError(null);
        setInfoMessage("Attendance saved locally. It will sync into the open session when you reconnect.");
        return;
      }

      await submitFullAttendance(
        attendanceId,
        selectedAppointment.sectionId,
        selectedAppointment.teacherId,
        selectedAppointment.secretaryUid,
        sectionSlug,
        selectedDate,
        selectedAppointment.schoolYear,
        studentsData
      );

      setSessionSubmitted(true);
      setIsEditing(false);
      setQueuedSubmission(null);
      setLocalDraft(null);
      setSubmitError(null);
      setInfoMessage("Attendance saved and synced to the session.");

      if (user?.uid) {
        await deleteAttendanceDraft(user.uid, attendanceId);
      }

      queryClient.invalidateQueries({ queryKey: ["appointments", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["attendanceSession", attendanceId] });
      queryClient.invalidateQueries({ queryKey: ["attendanceHistory", user?.uid] });
    } catch (err) {
      if (err instanceof OfflineStorageCapError) {
        setSubmitError(err.message);
        return;
      }

      if (isTransientAttendanceError(err) && operationId && user?.uid) {
        const studentsData = attendanceRecords.map((record) => ({
          lrn: record.lrn,
          studentName: record.studentName,
          lastName: record.lastName,
          status: record.status as AttendanceStatus,
        }));

        await enqueueAttendanceSync({
          operationId,
          uid: user.uid,
          attendanceId,
          sectionId: selectedAppointment.sectionId,
          sectionSlug,
          date: selectedDate,
          schoolYear: selectedAppointment.schoolYear,
          teacherId: selectedAppointment.teacherId,
          secretaryUid: selectedAppointment.secretaryUid,
          sessionKey: `${selectedAppointment.sectionId}:${selectedDate}`,
          students: studentsData,
          lastKnownRemoteChangeAt: getAttendanceLastRemoteChangeAt(existingSession),
        });

        await deleteAttendanceDraft(user.uid, attendanceId);
        setQueuedSubmission({
          operationId,
          uid: user.uid,
          attendanceId,
          sectionId: selectedAppointment.sectionId,
          sectionSlug,
          date: selectedDate,
          schoolYear: selectedAppointment.schoolYear,
          teacherId: selectedAppointment.teacherId,
          secretaryUid: selectedAppointment.secretaryUid,
          sessionKey: `${selectedAppointment.sectionId}:${selectedDate}`,
          students: studentsData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          retryCount: 0,
          lastError: null,
          lastKnownRemoteChangeAt: getAttendanceLastRemoteChangeAt(existingSession),
          status: "pending",
          failureCode: null,
          syncedAt: null,
        });
        setLocalDraft(null);
        setSessionSubmitted(true);
        setIsEditing(false);
        setSubmitError(null);
        setInfoMessage("Attendance was saved locally after a connection problem. It will retry automatically.");
        return;
      }

      console.error("Error saving attendance:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save attendance. Please try again.";
      if (errorMessage.includes("locked")) {
        setSubmitError("This session is already submitted and locked.");
      } else {
        setSubmitError(errorMessage);
      }
      queryClient.invalidateQueries({ queryKey: ["attendanceSession", attendanceId] });
    }
  };

  const handleEnableEditing = () => {
    if (allowCorrections) {
      setIsEditing(true);
    }
  };

  const allPresent = attendanceRecords.every((r) => r.status === "present");
  const allMarked = attendanceRecords.every((r) => r.status !== null);
  const canEditAttendance = !sessionSubmitted;

  const totalPages = Math.ceil(attendanceRecords.length / STUDENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const endIndex = startIndex + STUDENTS_PER_PAGE;
  const paginatedStudents = attendanceRecords.slice(startIndex, endIndex);
  const sectionDisplayName = resolvedSection
    ? `${resolvedSection.gradeLevel} - ${resolvedSection.sectionName}`
    : "Section information unavailable";
  const sessionSyncLabel = queuedSubmission?.status === "needs_review"
    ? "Needs review"
    : queuedSubmission?.status === "failed"
      ? "Sync error"
      : queuedSubmission?.status === "syncing"
        ? "Syncing"
        : queuedSubmission?.status === "pending"
          ? "Saved locally"
          : sessionSubmitted && existingSession?.status === "locked"
            ? "Locked"
            : sessionSubmitted
              ? "Synced to session"
            : isOnline
              ? "Online"
              : "Offline draft";

  const completedLabel = queuedSubmission
    ? "Saved locally"
    : existingSession?.status === "locked"
      ? "Locked"
      : "Saved";

  const completionTitle = queuedSubmission
    ? "Attendance Saved Locally"
    : existingSession?.status === "locked"
      ? "Session Locked"
      : "Attendance Saved";

  const completionDescription = queuedSubmission
    ? "This attendance is stored on the device and will sync into the open session when connectivity returns."
    : existingSession?.status === "locked"
      ? "This attendance session has been finalized and locked."
      : "Attendance is saved in the session and can still be reviewed while the session remains open.";

  const completionTimestampLabel = existingSession?.status === "locked" ? "Locked on" : queuedSubmission ? "Saved locally on" : "Saved on";

  const presentCount = attendanceRecords.filter(r => r.status === "present").length;
  const lateCount = attendanceRecords.filter(r => r.status === "late").length;
  const absentCount = attendanceRecords.filter(r => r.status === "absent").length;
  const excusedCount = attendanceRecords.filter(r => r.status === "excused").length;

  const waitingForBootstrap = !cachedBootstrapLoaded || (appointmentsLoading && !selectedAppointment) || (studentsLoading && sectionStudents.length === 0);

  if (waitingForBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm" style={{ color: "#6B7280" }}>Loading students...</p>
        </div>
      </div>
    );
  }

  if (!selectedAppointment) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
        <main className="p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto text-center pt-20">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#F1F5F9" }}
            >
              <ClipboardCheck className="w-8 h-8" style={{ color: "#6B7280" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#1F1F1F" }}>
              No Active Appointment
            </h3>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              You don&apos;t have any active secretary appointment yet. Please wait for your teacher to appoint you.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      {error && (
        <PopupAlert 
          message={error} 
          type="error" 
          onClose={() => setError(null)} 
        />
      )}

      {infoMessage && (
        <PopupAlert
          message={infoMessage}
          type="info"
          onClose={() => setInfoMessage(null)}
        />
      )}

      <main className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold" style={{ color: "#1F1F1F" }}>
                  Attendance
                </h1>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  {sectionDisplayName} • {sectionStudents.length} students
                </p>
              </div>
            </div>

          </div>

          <AttendanceHeader
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            hasSessionToday={hasSessionToday}
            sessionSubmitted={sessionSubmitted}
            isEditing={isEditing}
            onStartSession={handleStartSession}
            completedLabel={completedLabel}
            syncLabel={sessionSyncLabel}
            canSync={Boolean(queuedSubmission || syncStatus.pendingCount > 0 || syncStatus.failedCount > 0 || syncStatus.needsReviewCount > 0)}
            onSyncNow={() => void syncStatus.syncNow()}
            syncDisabled={!syncStatus.isOnline || syncStatus.isSyncing}
            isSyncing={syncStatus.isSyncing}
          />

          {hasSessionToday || sessionSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {teacherStartedSession && !sessionSubmitted && (
                <div
                  className="rounded-xl p-3 sm:p-4 mb-4"
                  style={{ backgroundColor: "#EEF2FF", border: "1px solid #C7D2FE" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: "#6366F1" }}
                    >
                      <ClipboardCheck className="w-4 h-4" style={{ color: "#FFFFFF" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#3730A3" }}>
                        Your teacher started this session
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#4F46E5" }}>
                        Continue recording attendance and submit when done.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {submitError && (
                <PopupAlert 
                  message={submitError} 
                  type="error" 
                  onClose={() => setSubmitError(null)} 
                />
              )}

              {sessionSubmitted && !isEditing && (
                <div
                  className="rounded-xl p-4 sm:p-6 mb-4 sm:mb-6"
                  style={{ backgroundColor: "#D1FAE5", border: "1px solid #A7F3D0" }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#10B981" }}
                      >
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "#FFFFFF" }} />
                      </div>
                      <div>
                        <p className="text-sm sm:text-base font-bold" style={{ color: "#065F46" }}>
                          {completionTitle}
                        </p>
                        <p className="text-xs sm:text-sm" style={{ color: "#047857" }}>
                          {completionDescription}
                        </p>
                      </div>
                    </div>
                    {allowCorrections && (
                      <button
                        onClick={handleEnableEditing}
                        className="flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ backgroundColor: "#10B981", color: "#FFFFFF" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#059669";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#10B981";
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
                    <div className="rounded-lg p-2 sm:p-3 text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: "#10B981" }}>
                        {presentCount}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
                        Present
                      </p>
                    </div>
                    <div className="rounded-lg p-2 sm:p-3 text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: "#F59E0B" }}>
                        {lateCount}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
                        Late
                      </p>
                    </div>
                    <div className="rounded-lg p-2 sm:p-3 text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: "#EF4444" }}>
                        {absentCount}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
                        Absent
                      </p>
                    </div>
                    <div className="rounded-lg p-2 sm:p-3 text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: "#2563EB" }}>
                        {excusedCount}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
                        Excused
                      </p>
                    </div>
                    <div className="rounded-lg p-2 sm:p-3 text-center col-span-3 sm:col-span-1" style={{ backgroundColor: "#FFFFFF" }}>
                      <p className="text-xl sm:text-2xl font-bold" style={{ color: "#1e3a5f" }}>
                        {attendanceRecords.length}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
                        Total
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs" style={{ color: "#047857" }}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {completionTimestampLabel} {formatSessionTimestamp(
                        (existingSession?.lockedAt ?? existingSession?.createdAt) as Date | string | { toDate?: () => Date } | undefined
                      )}
                    </span>
                  </div>
                </div>
              )}

              {canEditAttendance && (
                <BulkAttendanceActions
                  onMarkAllPresent={handleMarkAllPresent}
                  onClearAll={handleClearAll}
                  allPresent={allPresent}
                  allMarked={allMarked}
                  disabled={!canEditAttendance}
                />
              )}

              <div
                className="rounded-2xl overflow-hidden border"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
              >
                <div className="hidden md:block">
                  <div
                    className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}
                  >
                    <div className="col-span-5" style={{ color: "#6B7280" }}>
                      Student Name
                    </div>
                    <div className="col-span-3 text-center" style={{ color: "#6B7280" }}>
                      LRN
                    </div>
                    <div className="col-span-4 text-center" style={{ color: "#6B7280" }}>
                      Attendance Status
                    </div>
                  </div>

                  <div className="divide-y divide-[#E5E7EB]">
                    {paginatedStudents.map((record, index) => (
                      <StudentAttendanceRow
                        key={record.lrn}
                        lrn={record.lrn}
                        studentName={record.studentName}
                        status={record.status}
                        index={index}
                        isEditable={canEditAttendance}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                </div>

                <div className="md:hidden divide-y divide-[#E5E7EB]">
                  {paginatedStudents.map((record, index) => (
                    <MobileStudentAttendanceCard
                      key={record.lrn}
                      lrn={record.lrn}
                      studentName={record.studentName}
                      status={record.status}
                      isEditable={canEditAttendance}
                      onStatusChange={handleStatusChange}
                      index={index}
                    />
                  ))}
                </div>
              </div>

              {totalPages > 1 && (
                <motion.div
                  className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm" style={{ color: "#6B7280" }}>
                    Showing <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{startIndex + 1}</span> to{" "}
                    <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{getDisplayEndIndex(endIndex, attendanceRecords.length)}</span> of{" "}
                    <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{attendanceRecords.length}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" style={{ color: "#374151" }} />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 rounded-lg text-sm font-medium"
                          style={{
                            backgroundColor: currentPage === page ? "#1e3a5f" : "#FFFFFF",
                            color: currentPage === page ? "#FFFFFF" : "#374151",
                            border: "1px solid #E5E7EB",
                          }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                      }}
                    >
                      <ChevronRight className="w-4 h-4" style={{ color: "#374151" }} />
                    </button>
                  </div>
                </motion.div>
              )}

              {canEditAttendance && (
                <motion.div
                  className="mt-4 sm:mt-6"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                  {!allMarked && (
                    <p className="text-sm mb-3" style={{ color: "#F59E0B" }}>
                      Please mark attendance for all students before saving.
                    </p>
                  )}
                  <button
                    onClick={handleSubmitAttendance}
                    disabled={!allMarked}
                    className="w-full px-6 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: allMarked ? "#1e3a5f" : "#9CA3AF",
                      color: "#FFFFFF",
                    }}
                    >
                    Save Attendance
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="rounded-2xl p-6 sm:p-12 text-center border"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
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
                No Session Started Yet
              </h3>
              <p className="text-xs sm:text-sm mb-6" style={{ color: "#6B7280" }}>
                Start the attendance session for {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <button
                onClick={handleStartSession}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                style={{ backgroundColor: "#1e3a5f", color: "#FFFFFF" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#16304a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#1e3a5f";
                }}
              >
                Start Session
              </button>
            </motion.div>
          )}
        </div>
      </main>
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
  const statusColors: Record<string, { bg: string; text: string }> = {
    present: { bg: "#D1FAE5", text: "#065F46" },
    late: { bg: "#FEF3C7", text: "#92400E" },
    absent: { bg: "#FEE2E2", text: "#991B1B" },
    excused: { bg: "#DBEAFE", text: "#1E40AF" },
  };

  return (
    <motion.div
      className="p-3 sm:p-4"
      style={{ backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F9FAFB" }}
      initial={false}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "#1F1F1F" }}>
            {studentName}
          </p>
          <p className="text-xs font-mono mt-0.5" style={{ color: "#9CA3AF" }}>
            {lrn}
          </p>
        </div>
        {!isEditable && status && (
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase shrink-0"
            style={{
              backgroundColor: statusColors[status]?.bg || "#F3F4F6",
              color: statusColors[status]?.text || "#6B7280",
            }}
          >
            {status}
          </span>
        )}
      </div>

      {isEditable && (
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => onStatusChange(lrn, "present")}
            className="py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: status === "present" ? "#10B981" : "#F3F4F6",
              color: status === "present" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Present
          </button>
          <button
            onClick={() => onStatusChange(lrn, "late")}
            className="py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: status === "late" ? "#F59E0B" : "#F3F4F6",
              color: status === "late" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Late
          </button>
          <button
            onClick={() => onStatusChange(lrn, "absent")}
            className="py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: status === "absent" ? "#EF4444" : "#F3F4F6",
              color: status === "absent" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Absent
          </button>
          <button
            onClick={() => onStatusChange(lrn, "excused")}
            className="py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: status === "excused" ? "#2563EB" : "#F3F4F6",
              color: status === "excused" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Excused
          </button>
        </div>
      )}
    </motion.div>
  );
}
