"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { RoleGuard } from "@/hooks/useRequireRole";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  Attendance,
  calculateAttendanceStats,
  getTeacherAppointments,
  getTeacherSections,
  getUserProfilesBatch,
  UserData,
} from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";

type ReportTab = "records";

interface SessionWithStats extends Attendance {
  presentCount: number;
  lateCount: number;
  absentCount: number;
  totalStudents: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ReportTab>("records");

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

  const sectionNameById = new Map(
    sections.map((section) => [
      section.id,
      `${section.gradeLevel} - ${section.sectionName}`,
    ])
  );

  const filteredSessions = attendanceSessions.filter((session) => {
    if (!searchQuery.trim()) return true;
    const normalizedSearch = searchQuery.toLowerCase();

    const profile = secretaryProfiles.get(session.secretaryUid);
    const secretaryName = profile?.displayName ?? "";
    const sectionName = sectionNameById.get(session.sectionId) ?? "";
    const appointmentSubject =
      appointments.find((appointment) => appointment.id === session.appointmentId)?.subject ??
      session.subject ??
      "";

    return (
      secretaryName.toLowerCase().includes(normalizedSearch) ||
      session.secretaryLrn.toLowerCase().includes(normalizedSearch) ||
      session.date.toLowerCase().includes(normalizedSearch) ||
      sectionName.toLowerCase().includes(normalizedSearch) ||
      appointmentSubject.toLowerCase().includes(normalizedSearch)
    );
  });

  const groupedBySecretaryMap = new Map<string, SecretaryGroupedRecords>();
  filteredSessions.forEach((session) => {
    const existingGroup = groupedBySecretaryMap.get(session.secretaryUid);
    const sessionStats = calculateAttendanceStats(session.records);
    const sessionWithStats: SessionWithStats = {
      ...session,
      presentCount: sessionStats.present,
      lateCount: sessionStats.late,
      absentCount: sessionStats.absent,
      totalStudents: sessionStats.total,
    };

    if (existingGroup) {
      existingGroup.sessions.push(sessionWithStats);
      return;
    }

    const profile = secretaryProfiles.get(session.secretaryUid);
    groupedBySecretaryMap.set(session.secretaryUid, {
      secretaryUid: session.secretaryUid,
      secretaryLrn: session.secretaryLrn,
      secretaryName: profile?.displayName ?? `Secretary ${session.secretaryLrn}`,
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

  const totalSessions = filteredSessions.length;
  const uniqueDays = new Set(filteredSessions.map((session) => session.date)).size;
  const teacherStats = [
    { label: "SECRETARIES", value: groupedRecords.length },
    { label: "SESSIONS", value: totalSessions },
    { label: "DAYS RECORDED", value: uniqueDays },
  ];

  return (
    <>
      {/* Header */}
      <TeacherHeader
        title="Secretary Attendance History"
        stats={teacherStats}
        searchPlaceholder="Search secretary history by name, date, section, subject..."
        onSearch={(query) => setSearchQuery(query)}
      />

      {/* Content Canvas */}
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl w-fit" style={{ backgroundColor: "#E8ECF4" }}>
          <button
            type="button"
            onClick={() => setActiveTab("records")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              backgroundColor: activeTab === "records" ? "#FFFFFF" : "transparent",
              color: activeTab === "records" ? "#1e3a5f" : "#5B6472",
              boxShadow: activeTab === "records" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
          >
            Records
          </button>
        </div>

        {/* Record Tab */}
        <div className="space-y-4">
          <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
            <p className="text-sm" style={{ color: "#334155" }}>
              This page is for secretary day-by-day attendance history records. For class trends and rates, use the Attendance page.
            </p>
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
                className="rounded-xl border overflow-hidden"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.04, duration: 0.25, ease: "easeOut" }}
              >
                <div className="px-5 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: "#F1F5F9" }}>
                  <div>
                    <p className="text-base font-semibold" style={{ color: "#1F2937" }}>
                      {group.secretaryName}
                    </p>
                    <p className="text-xs" style={{ color: "#6B7280" }}>
                      LRN: {group.secretaryLrn}
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: "#EAF2FF", color: "#1E3A5F" }}>
                    {group.sessions.length} day{group.sessions.length > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="divide-y" style={{ borderColor: "#F1F5F9" }}>
                  {group.sessions.map((session) => {
                    const sectionName = sectionNameById.get(session.sectionId) ?? session.sectionId;
                    const studentEntries = Object.entries(session.records ?? {});
                    return (
                      <details key={session.id} className="group">
                        <summary
                          className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-3"
                          style={{ backgroundColor: "#FFFFFF" }}
                        >
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "#1F2937" }}>
                              {formatDate(session.date)} • {session.subject}
                            </p>
                            <p className="text-xs" style={{ color: "#6B7280" }}>
                              {sectionName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#166534" }}>
                              P {session.presentCount}
                            </span>
                            <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
                              L {session.lateCount}
                            </span>
                            <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}>
                              A {session.absentCount}
                            </span>
                            <span className="px-2 py-1 rounded-full" style={{ backgroundColor: "#E2E8F0", color: "#334155" }}>
                              {session.totalStudents}
                            </span>
                          </div>
                        </summary>

                        <div className="px-5 pb-4">
                          {studentEntries.length === 0 ? (
                            <p className="text-xs" style={{ color: "#9CA3AF" }}>
                              No individual student records saved for this day.
                            </p>
                          ) : (
                            <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#E5E7EB" }}>
                              <div
                                className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
                                style={{ backgroundColor: "#F8FAFC", color: "#64748B" }}
                              >
                                <div className="col-span-5">Student</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-5">Remarks</div>
                              </div>
                              {studentEntries
                                .sort((a, b) => a[1].studentName.localeCompare(b[1].studentName))
                                .map(([lrn, record]) => (
                                  <div
                                    key={lrn}
                                    className="grid grid-cols-12 gap-2 px-3 py-2 text-xs border-t"
                                    style={{ borderColor: "#F1F5F9" }}
                                  >
                                    <div className="col-span-5">
                                      <p className="font-medium" style={{ color: "#111827" }}>
                                        {record.studentName}
                                      </p>
                                      <p style={{ color: "#9CA3AF" }}>{lrn}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <span
                                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                                        style={{
                                          backgroundColor:
                                            record.status === "present"
                                              ? "#DCFCE7"
                                              : record.status === "late"
                                                ? "#FEF3C7"
                                                : "#FEE2E2",
                                          color:
                                            record.status === "present"
                                              ? "#166534"
                                              : record.status === "late"
                                                ? "#92400E"
                                                : "#B91C1C",
                                        }}
                                      >
                                        {record.status}
                                      </span>
                                    </div>
                                    <div className="col-span-5" style={{ color: "#374151" }}>
                                      {record.remarks || "-"}
                                    </div>
                                  </div>
                                ))}
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
      </div>
    </>
  );
}
