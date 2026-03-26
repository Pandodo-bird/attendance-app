"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Calendar, Edit2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  getSecretaryAppointments, 
  getSectionStudents, 
  checkExistingSession,
  startAttendanceSession,
  submitFullAttendance,
  getSectionSlug,
} from "@/lib/firestore";
import { StudentAttendanceRow } from "@/components/secretary/attendance";
import { BulkAttendanceActions } from "@/components/secretary/attendance";
import { AttendanceHeader } from "@/components/secretary/attendance";
import { PopupAlert } from "@/components/ui";

type AttendanceStatus = "present" | "late" | "absent";

interface StudentAttendance {
  lrn: string;
  studentName: string;
  lastName: string;
  firstName: string;
  status: AttendanceStatus | null;
  remarks: string;
}

const STUDENTS_PER_PAGE = 10;

export default function SecretaryAttendancePage() {
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();

  console.log("👤 User context:", { user: user?.uid, userProfile });

  // State for session management
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [hasSessionToday, setHasSessionToday] = useState<boolean>(false);
  const [sessionSubmitted, setSessionSubmitted] = useState<boolean>(false);
  const [allowCorrections] = useState<boolean>(false); // TODO: Will be fetched from appointment settings
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Reset page when editing session state changes
  useEffect(() => {
    setCurrentPage(1);
  }, [hasSessionToday, sessionSubmitted]);

  // TanStack Query: Fetch secretary's active appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments", user?.uid],
    queryFn: () => {
      console.log("📋 Fetching appointments for user:", user?.uid);
      return getSecretaryAppointments(user?.uid || "");
    },
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000, // 30 minutes - appointments rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  // Log appointments when they change
  useEffect(() => {
    console.log("📋 Appointments updated:", appointments);
    if (appointments.length > 0) {
      console.log("📋 First appointment:", appointments[0]);
    }
  }, [appointments]);

  // Get the first active appointment's section ID (secretary may have multiple appointments)
  const selectedAppointment = appointments.length > 0 ? appointments[0] : null;
  const sectionId = selectedAppointment?.sectionId;

  // TanStack Query: Fetch section details for slug
  const { data: sectionSlug, error: sectionSlugError, isLoading: sectionSlugLoading } = useQuery({
    queryKey: ["sectionSlug", sectionId],
    queryFn: async () => {
      console.log("📋 Fetching section slug for sectionId:", sectionId);
      try {
        const slug = await getSectionSlug(sectionId!);
        console.log("📋 Section slug result:", slug);
        return slug;
      } catch (error) {
        console.error("❌ Error fetching section slug:", error);
        throw error;
      }
    },
    enabled: !!sectionId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  if (sectionSlugError) {
    console.error("❌ Section slug query error:", sectionSlugError);
  }

  console.log("🔍 Render state:", { 
    selectedAppointment, 
    sectionId, 
    sectionSlug, 
    sectionSlugLoading, 
    sectionSlugError: sectionSlugError?.message || sectionSlugError 
  });

  // TanStack Query: Fetch students from the section
  const { data: sectionStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["sectionStudents", sectionId],
    queryFn: () => getSectionStudents(sectionId!),
    enabled: !!sectionId,
    staleTime: 10 * 60 * 1000, // 10 minutes - student list changes occasionally
    gcTime: 20 * 60 * 1000, // 20 minutes
  });

  // Initialize attendance records from fetched students
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendance[]>([]);

  // Update attendance records when students are loaded (sorted alphabetically by last name, then first name)
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
          remarks: "",
        }))
      );
    }
  }, [sectionStudents]);

  // Check for existing session when date or appointment changes
  useEffect(() => {
    async function checkForExistingSession() {
      console.log("🔍 checkForExistingSession | Starting check...");
      console.log("🔍 checkForExistingSession | State:", {
        selectedAppointment: selectedAppointment ? {
          id: selectedAppointment.id,
          secretaryUid: selectedAppointment.secretaryUid,
          secretaryLrn: selectedAppointment.secretaryLrn,
          teacherId: selectedAppointment.teacherId,
          sectionId: selectedAppointment.sectionId,
          subject: selectedAppointment.subject,
        } : null,
        sectionSlug,
        selectedDate,
        userUid: user?.uid,
        userProfileRole: userProfile?.role,
      });
      
      if (!selectedAppointment || !sectionSlug || !selectedDate) {
        console.log("⚠️ checkForExistingSession | Skipping - missing required data");
        return;
      }

      try {
        console.log("🔍 checkForExistingSession | Calling checkExistingSession...");
        const existingSession = await checkExistingSession(
          selectedAppointment,
          sectionSlug,
          selectedDate
        );
        console.log("✅ checkForExistingSession | Result:", existingSession ? { exists: true, id: existingSession.id } : { exists: false });
        
        if (existingSession) {
          setHasSessionToday(true);
          setAttendanceId(existingSession.id);
          
          // Check if session is already submitted (locked)
          if (existingSession.status === "locked" || (existingSession.records && Object.keys(existingSession.records).length > 0)) {
            setSessionSubmitted(true);
            setIsEditing(false);

            // Load existing records for display
            if (existingSession.records) {
              setAttendanceRecords((prev) =>
                prev.map((record) => {
                  const existingRecord = existingSession.records![record.lrn];
                  if (existingRecord) {
                    return {
                      ...record,
                      status: existingRecord.status as AttendanceStatus,
                      remarks: existingRecord.remarks,
                    };
                  }
                  return record;
                })
              );
            }
          } else {
            // Session started but not submitted - allow editing
            setIsEditing(true);
            setSessionSubmitted(false);
          }
        } else {
          // No session for this date
          console.log("ℹ️ No existing session found for this date - this is expected for new attendance");
          setHasSessionToday(false);
          setAttendanceId(null);
          setSessionSubmitted(false);
          setIsEditing(false);
        }
      } catch (err) {
        console.error("❌ Error checking for existing session:");
        console.error("❌ Error object:", err);
        console.error("❌ Error name:", (err as Error)?.name);
        console.error("❌ Error message:", (err as Error)?.message);
        console.error("❌ Error stack:", (err as Error)?.stack);
        console.error("❌ Firebase error code:", (err as any)?.code);
        console.error("❌ Firebase error details:", (err as any)?.details);
        setError("Failed to check attendance session status");
      }
    }

    checkForExistingSession();
  }, [selectedAppointment, sectionSlug, selectedDate]);

  // Handle individual student status change
  const handleStatusChange = (lrn: string, status: AttendanceStatus, remarks?: string) => {
    setAttendanceRecords((prev) =>
      prev.map((record) =>
        record.lrn === lrn
          ? { ...record, status, remarks: remarks ?? record.remarks }
          : record
      )
    );
  };

  // Handle bulk action - mark all present
  const handleMarkAllPresent = () => {
    setAttendanceRecords((prev) =>
      prev.map((record) => ({
        ...record,
        status: "present",
        remarks: "",
      }))
    );
  };

  // Handle bulk action - clear all
  const handleClearAll = () => {
    setAttendanceRecords((prev) =>
      prev.map((record) => ({
        ...record,
        status: null,
        remarks: "",
      }))
    );
  };

  // Handle start session
  const handleStartSession = async () => {
    console.log("🔍 Starting session check:", {
      selectedAppointment,
      sectionSlug,
      sectionId,
      appointments,
    });

    if (!selectedAppointment) {
      console.error("❌ No appointment found");
      setError("No active appointment found. Please wait for your teacher to appoint you.");
      return;
    }

    if (!sectionSlug) {
      console.error("❌ Section slug not loaded for sectionId:", sectionId);
      setError("Section information not loaded. Please try again.");
      return;
    }

    try {
      setError(null);

      console.log("✅ Starting attendance session:", {
        appointmentId: selectedAppointment.id,
        sectionSlug,
        date: selectedDate,
        schoolYear: selectedAppointment.schoolYear,
      });

      // Create the attendance session document
      const newAttendanceId = await startAttendanceSession(
        selectedAppointment,
        sectionSlug,
        selectedDate,
        selectedAppointment.schoolYear
      );

      console.log("✅ Session started with ID:", newAttendanceId);

      setAttendanceId(newAttendanceId);
      setHasSessionToday(true);
      setIsEditing(true);
      setSessionSubmitted(false);
    } catch (err) {
      console.error("Error starting session:", err);
      setError("Failed to start attendance session");
    }
  };

  // Handle submit attendance
  const handleSubmitAttendance = async () => {
    if (!selectedAppointment || !sectionSlug || !attendanceId) {
      setError("Missing required information to submit attendance");
      return;
    }

    // Validate all students are marked
    const allMarked = attendanceRecords.every((r) => r.status !== null);
    if (!allMarked) {
      setError("Please mark attendance for all students");
      return;
    }

    try {
      setError(null);

      // Prepare students data for batch write
      const studentsData = attendanceRecords.map((record) => ({
        lrn: record.lrn,
        studentName: record.studentName,
        lastName: record.lastName,
        status: record.status as "present" | "late" | "absent",
        remarks: record.remarks,
      }));

      // Submit full attendance (batch write to 3 collections)
      await submitFullAttendance(
        attendanceId,
        selectedAppointment,
        sectionSlug,
        selectedDate,
        selectedAppointment.schoolYear,
        studentsData
      );

      setSessionSubmitted(true);
      setIsEditing(false);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["appointments", user?.uid] });
    } catch (err) {
      console.error("Error submitting attendance:", err);
      setError("Failed to submit attendance. Please try again.");
    }
  };

  // Handle enable editing (if teacher allows)
  const handleEnableEditing = () => {
    if (allowCorrections) {
      setIsEditing(true);
    }
  };

  const allPresent = attendanceRecords.every((r) => r.status === "present");
  const allMarked = attendanceRecords.every((r) => r.status !== null);

  // Pagination calculations
  const totalPages = Math.ceil(attendanceRecords.length / STUDENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const endIndex = startIndex + STUDENTS_PER_PAGE;
  const paginatedStudents = attendanceRecords.slice(startIndex, endIndex);

  // Loading state
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

  // No appointment state
  if (!selectedAppointment) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
        <main className="p-4 md:p-6 lg:p-8">
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
      {/* Error Alert */}
      {error && (
        <PopupAlert 
          message={error} 
          type="error" 
          onClose={() => setError(null)} 
        />
      )}

      {/* Main Content */}
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "#1F1F1F" }}>
                Attendance
              </h1>
            </div>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              {selectedAppointment.subject} - {selectedAppointment.sectionId && sectionStudents.length} students
            </p>
          </div>

          {/* Date Selection & Session Info */}
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

          {/* Attendance Content */}
          {hasSessionToday || sessionSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Status Banner */}
              {sessionSubmitted && !isEditing && (
                <div
                  className="rounded-xl p-4 mb-6 flex items-center justify-between"
                  style={{ backgroundColor: "#D1FAE5", border: "1px solid #A7F3D0" }}
                >
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="w-5 h-5" style={{ color: "#065F46" }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#065F46" }}>
                        Attendance Submitted
                      </p>
                      <p className="text-xs" style={{ color: "#047857" }}>
                        Submitted on {new Date().toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {allowCorrections && (
                    <button
                      onClick={handleEnableEditing}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
              )}

              {/* Bulk Actions */}
              {(isEditing || !sessionSubmitted) && (
                <BulkAttendanceActions
                  onMarkAllPresent={handleMarkAllPresent}
                  onClearAll={handleClearAll}
                  allPresent={allPresent}
                  allMarked={allMarked}
                  disabled={!isEditing && !sessionSubmitted}
                />
              )}

              {/* Student List - Table View */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
              >
                {/* Table Header */}
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

                {/* Student Rows */}
                <div className="divide-y divide-[#E5E7EB]">
                  {paginatedStudents.map((record, index) => (
                    <StudentAttendanceRow
                      key={record.lrn}
                      lrn={record.lrn}
                      studentName={record.studentName}
                      status={record.status}
                      remarks={record.remarks}
                      index={index}
                      isEditable={isEditing || !sessionSubmitted}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <motion.div
                  className="mt-4 flex items-center justify-between"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm" style={{ color: "#6B7280" }}>
                    Showing <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{startIndex + 1}</span> to{" "}
                    <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{endIndex}</span> of{" "}
                    <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{attendanceRecords.length}</span> students
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: currentPage === 1 ? "#F3F4F6" : "#FFFFFF",
                        color: currentPage === 1 ? "#9CA3AF" : "#374151",
                        border: "1px solid #E5E7EB",
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.backgroundColor = "#F9FAFB";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.backgroundColor = "#FFFFFF";
                        }
                      }}
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            backgroundColor: currentPage === page ? "#1e3a5f" : "#FFFFFF",
                            color: currentPage === page ? "#FFFFFF" : "#374151",
                            border: "1px solid #E5E7EB",
                          }}
                          onMouseEnter={(e) => {
                            if (currentPage !== page) {
                              e.currentTarget.style.backgroundColor = "#F9FAFB";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentPage !== page) {
                              e.currentTarget.style.backgroundColor = "#FFFFFF";
                            }
                          }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: currentPage === totalPages ? "#F3F4F6" : "#FFFFFF",
                        color: currentPage === totalPages ? "#9CA3AF" : "#374151",
                        border: "1px solid #E5E7EB",
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== totalPages) {
                          e.currentTarget.style.backgroundColor = "#F9FAFB";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== totalPages) {
                          e.currentTarget.style.backgroundColor = "#FFFFFF";
                        }
                      }}
                    >
                      Next
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              {(isEditing || !sessionSubmitted) && (
                <motion.div
                  className="mt-6 flex justify-end gap-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                  {!allMarked && (
                    <p className="text-sm self-center mr-auto" style={{ color: "#F59E0B" }}>
                      ⚠️ Please mark attendance for all students
                    </p>
                  )}
                  <button
                    onClick={handleSubmitAttendance}
                    disabled={!allMarked}
                    className="px-6 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: allMarked ? "#1e3a5f" : "#9CA3AF",
                      color: "#FFFFFF",
                    }}
                    onMouseEnter={(e) => {
                      if (allMarked) {
                        e.currentTarget.style.backgroundColor = "#16304a";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (allMarked) {
                        e.currentTarget.style.backgroundColor = "#1e3a5f";
                      }
                    }}
                  >
                    Submit Attendance
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            // No Session Yet State
            <motion.div
              className="rounded-2xl p-12 text-center"
              style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
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
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#1F1F1F" }}>
                No Session Started Yet
              </h3>
              <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
                Start the attendance session for {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <button
                onClick={handleStartSession}
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
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
