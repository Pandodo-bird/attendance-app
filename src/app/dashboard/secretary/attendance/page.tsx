"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Calendar, Edit2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildSectionAttendanceId,
  getSecretaryAppointments,
  getSectionById,
  getSectionStudents,
  startAttendanceSession,
  submitFullAttendance,
  getAttendanceSession,
} from "@/lib/firestore";
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

export default function SecretaryAttendancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [hasSessionToday, sessionSubmitted]);

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments", user?.uid],
    queryFn: () => getSecretaryAppointments(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const selectedAppointment = appointments.length > 0 ? appointments[0] : null;
  const sectionId = selectedAppointment?.sectionId;

  const { data: section } = useQuery({
    queryKey: ["section", sectionId],
    queryFn: () => getSectionById(sectionId!),
    enabled: !!sectionId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const sectionSlug = section
    ? `${section.gradeLevel}-${section.sectionName.replace(/\s+/g, "-")}`
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

  const { data: sectionStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["sectionStudents", sectionId],
    queryFn: () => getSectionStudents(sectionId!),
    enabled: !!sectionId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendance[]>([]);

  useEffect(() => {
    if (sectionStudents.length > 0) {
      const sortedStudents = [...sectionStudents].sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      });

      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (existingSession) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    }
  }, [existingSession]);

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

      const newAttendanceId = await startAttendanceSession(
        selectedAppointment,
        sectionSlug,
        selectedDate,
        selectedAppointment.schoolYear
      );

      await queryClient.invalidateQueries({ queryKey: ["attendanceSession", newAttendanceId] });
      
      setHasSessionToday(true);
      setIsEditing(true);
      setSessionSubmitted(false);
    } catch (err) {
      console.error("Error starting session:", err);
      setError(err instanceof Error ? err.message : "Failed to start attendance session");
    }
  };

  const handleSubmitAttendance = async () => {
    if (!selectedAppointment || !sectionSlug || !attendanceId) {
      setError("Missing required information to submit attendance");
      return;
    }

    const allMarked = attendanceRecords.every((r) => r.status !== null);
    if (!allMarked) {
      setError("Please mark attendance for all students");
      return;
    }

    try {
      setError(null);

      const studentsData = attendanceRecords.map((record) => ({
        lrn: record.lrn,
        studentName: record.studentName,
        lastName: record.lastName,
        status: record.status as "present" | "late" | "absent",
      }));

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
      setSubmitError(null);

      queryClient.invalidateQueries({ queryKey: ["appointments", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["attendanceSession", attendanceId] });
      queryClient.invalidateQueries({ queryKey: ["attendanceHistory", user?.uid] });
    } catch (err) {
      console.error("Error submitting attendance:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to submit attendance. Please try again.";
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

  const totalPages = Math.ceil(attendanceRecords.length / STUDENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const endIndex = startIndex + STUDENTS_PER_PAGE;
  const paginatedStudents = attendanceRecords.slice(startIndex, endIndex);
  const sectionDisplayName = section
    ? `${section.gradeLevel} - ${section.sectionName}`
    : "Section information unavailable";

  const presentCount = attendanceRecords.filter(r => r.status === "present").length;
  const lateCount = attendanceRecords.filter(r => r.status === "late").length;
  const absentCount = attendanceRecords.filter(r => r.status === "absent").length;
  const excusedCount = attendanceRecords.filter(r => r.status === "excused").length;

  if (appointmentsLoading || studentsLoading) {
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
            allowCorrections={allowCorrections}
            onStartSession={handleStartSession}
            onEnableEditing={handleEnableEditing}
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
                          Session Completed
                        </p>
                        <p className="text-xs sm:text-sm" style={{ color: "#047857" }}>
                          Attendance successfully submitted
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
                      Submitted on {formatSessionTimestamp(
                        existingSession?.createdAt as Date | string | { toDate?: () => Date } | undefined
                      )}
                    </span>
                  </div>
                </div>
              )}

              {(isEditing || !sessionSubmitted) && (
                <BulkAttendanceActions
                  onMarkAllPresent={handleMarkAllPresent}
                  onClearAll={handleClearAll}
                  allPresent={allPresent}
                  allMarked={allMarked}
                  disabled={!isEditing && !sessionSubmitted}
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
                        isEditable={isEditing || !sessionSubmitted}
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
                      isEditable={isEditing || !sessionSubmitted}
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

              {(isEditing || !sessionSubmitted) && (
                <motion.div
                  className="mt-4 sm:mt-6"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                  {!allMarked && (
                    <p className="text-sm mb-3" style={{ color: "#F59E0B" }}>
                      Please mark attendance for all students before submitting.
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
                    Submit Attendance
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
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
