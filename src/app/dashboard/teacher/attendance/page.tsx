"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { RoleGuard } from "@/hooks/useRequireRole";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getTeacherSections,
  getSectionStudents,
  getSectionSummariesBySection,
  getTeacherAttendance,
  StudentSummary,
  calculateClassAnalytics,
} from "@/lib/firestore";
import { ClassAnalytics, MonthlyTrendChart, StudentSummaryCard } from "@/components/teacher/attendance";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function AttendancePage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="teacher">
        <AttendanceContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function AttendanceContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(15);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const formatLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Fetch teacher's sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections", user?.uid],
    queryFn: () => getTeacherSections(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Initialize section filter from URL or localStorage when sections are loaded
  useEffect(() => {
    // Skip if already selected or sections not loaded
    if (selectedSectionId || sections.length === 0) return;

    const sectionParam = searchParams?.get("section");
    if (sectionParam) {
      // Check if the section from URL is valid
      const isValidSection = sections.some(s => s.id === sectionParam);
      if (isValidSection) {
        setSelectedSectionId(sectionParam);
        // Save to localStorage for future navigation
        localStorage.setItem(`attendance_section_${user?.uid}`, sectionParam);
        return;
      }
    } else {
      // No URL param, try localStorage
      const savedSection = localStorage.getItem(`attendance_section_${user?.uid}`);
      if (savedSection) {
        const isValidSection = sections.some(s => s.id === savedSection);
        if (isValidSection) {
          setSelectedSectionId(savedSection);
          return;
        }
      }
    }
    // Fallback to first section
    setSelectedSectionId(sections[0].id);
  }, [sections, searchParams, selectedSectionId, user?.uid]);

  // Sync section filter to URL
  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setCurrentPage(1);
    // Save to localStorage for future navigation
    localStorage.setItem(`attendance_section_${user?.uid}`, sectionId);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (sectionId) {
      params.set("section", sectionId);
    } else {
      params.delete("section");
    }
    router.push(`/dashboard/teacher/attendance?${params.toString()}`, { scroll: false });
  };

  // Fetch students for selected section
  const { data: students = [] } = useQuery({
    queryKey: ["sectionStudents", selectedSectionId],
    queryFn: () => getSectionStudents(selectedSectionId),
    enabled: !!selectedSectionId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  // Fetch student summaries for selected section
  const selectedSection = sections.find((section) => section.id === selectedSectionId);
  const currentSchoolYear = selectedSection?.schoolYear ?? "2025-2026";
  const {
    data: sectionSummaries = [],
    isLoading: summariesLoading,
    isFetching: summariesFetching,
  } = useQuery({
    queryKey: ["studentSummaries", selectedSectionId, currentSchoolYear],
    queryFn: () => getSectionSummariesBySection(selectedSectionId, currentSchoolYear),
    enabled: !!selectedSectionId,
    staleTime: 30 * 60 * 1000, // 30 minutes - summaries are stable
    gcTime: 60 * 60 * 1000,
    placeholderData: [],
  });
  const summaries = sectionSummaries.filter((summary) => summary.sectionId === selectedSectionId);

  const todayDate = new Date();
  const todayDateKey = formatLocalDateKey(todayDate);

  // Fetch today's attendance sessions and scope to selected section
  const { data: todaysSessions = [] } = useQuery({
    queryKey: ["teacherAttendanceToday", user?.uid, todayDateKey],
    queryFn: () => getTeacherAttendance(user?.uid || "", todayDateKey),
    enabled: !!user?.uid,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const todaysSectionSessions = todaysSessions.filter(
    (session) => session.sectionId === selectedSectionId
  );

  const todaysSummary = todaysSectionSessions.reduce(
    (acc, session) => {
      const records = session.records ? Object.values(session.records) : [];
      records.forEach((record) => {
        if (record.status === "present") acc.present += 1;
        else if (record.status === "late") acc.late += 1;
        else if (record.status === "absent") acc.absent += 1;
        else if (record.status === "excused") acc.excused += 1;
      });
      return acc;
    },
    { present: 0, late: 0, absent: 0, excused: 0 }
  );

  // Calculate analytics
  const analytics = calculateClassAnalytics(summaries);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
    }, 200);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const normalizedSearchQuery = debouncedSearchQuery.trim().toLowerCase();

  // Filter and sort students alphabetically by last name
  const filteredStudents = students
    .filter(
      (student) =>
        student.lastName.toLowerCase().includes(normalizedSearchQuery) ||
        student.firstName.toLowerCase().includes(normalizedSearchQuery) ||
        (student.middleName ?? "").toLowerCase().includes(normalizedSearchQuery) ||
        student.lrn.includes(debouncedSearchQuery.trim())
    )
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Get summary for a student
  const getStudentSummary = (lrn: string): StudentSummary | undefined => {
    return summaries.find((s) => s.lrn === lrn);
  };

  // Calculate header stats
  const headerStats = [
    { label: "TOTAL STUDENTS", value: analytics.totalStudents.toString() },
    {
      label: "AVG ATTENDANCE",
      value: `${analytics.averageAttendanceRate}%`,
    },
  ];

  if (sectionsLoading) {
    return (
      <AuthGuard>
        <RoleGuard requiredRole="teacher">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center" style={{ color: "#6B7280" }}>
              Loading...
            </div>
          </div>
        </RoleGuard>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <RoleGuard requiredRole="teacher">
        <>
          {/* Header */}
          <TeacherHeader
            title="Attendance Analytics"
            stats={headerStats}
            searchPlaceholder="Search students..."
            onSearch={(query) => {
              setSearchInput(query);
              setCurrentPage(1);
            }}
            sectionFilter={{
              sections,
              selectedSectionId,
              onSectionChange: handleSectionChange,
            }}
          />

          {/* Content Canvas */}
          <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
            <div
              className="rounded-xl border px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              style={{ backgroundColor: "#EEF4FF", borderColor: "#D8E5FF" }}
            >
              <p className="text-sm" style={{ color: "#1E3A5F" }}>
                Attendance page is analytics-only. For secretary daily history records, open Secretaries and Records.
              </p>
              <button
                type="button"
                onClick={() => router.push("/dashboard/teacher/secretaries")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-fit"
                style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF" }}
              >
                Open Secretaries & Records
              </button>
            </div>

            {/* Class Analytics Overview */}
            {!selectedSectionId ? (
              <div
                className="rounded-xl p-8 border text-center"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
              >
                <p style={{ color: "#9CA3AF" }}>
                  Select a section to view attendance analytics
                </p>
              </div>
            ) : summariesLoading || summariesFetching ? (
              <div
                className="rounded-xl p-8 border text-center"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
              >
                <p style={{ color: "#6B7280" }}>Loading section analytics...</p>
              </div>
            ) : summaries.length === 0 ? (
              <div
                className="rounded-xl p-8 border text-center"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
              >
                <p style={{ color: "#9CA3AF" }}>
                  No attendance records yet. Start taking attendance to see analytics.
                </p>
              </div>
            ) : (
              <>
                {/* Class Overview Stats */}
                <ClassAnalytics
                  summaries={summaries}
                  todayDate={todayDate}
                  todayStats={todaysSummary}
                />

                {/* Monthly Trend Chart */}
                <MonthlyTrendChart summaries={summaries} />

                {/* Individual Student List */}
                <div>
                  {/* Top Bar: Title, View Toggle */}
                  <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-semibold text-lg" style={{ color: "#1F1F1F" }}>
                      Students
                    </h3>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border min-w-0 sm:min-w-[280px]"
                        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                      >
                        <Search size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                        <input
                          type="text"
                          value={searchInput}
                          onChange={(event) => {
                            setSearchInput(event.target.value);
                            setCurrentPage(1);
                          }}
                          placeholder="Search student name or LRN..."
                          className="w-full bg-transparent text-sm outline-none"
                          style={{ color: "#1F1F1F" }}
                        />
                      </div>

                      <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "#F3F4F6" }}>
                        <button
                          onClick={() => { setViewMode("table"); setCurrentPage(1); }}
                          className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                          style={{
                            backgroundColor: viewMode === "table" ? "#FFFFFF" : "transparent",
                            color: viewMode === "table" ? "#1F1F1F" : "#6B7280",
                            boxShadow: viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                          }}
                        >
                          Table
                        </button>
                        <button
                          onClick={() => { setViewMode("cards"); setCurrentPage(1); }}
                          className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                          style={{
                            backgroundColor: viewMode === "cards" ? "#FFFFFF" : "transparent",
                            color: viewMode === "cards" ? "#1F1F1F" : "#6B7280",
                            boxShadow: viewMode === "cards" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                          }}
                        >
                          Cards
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pagination Controls - Top (matching students page style) */}
                  {totalPages > 1 && (
                    <motion.div
                      className="mb-4 flex items-center justify-between"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-sm" style={{ color: "#6B7280" }}>
                        Showing <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{startIndex + 1}</span> to{" "}
                        <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{Math.min(endIndex, filteredStudents.length)}</span> of{" "}
                        <span style={{ color: "#1F1F1F", fontWeight: 600 }}>{filteredStudents.length}</span> students
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
                        >
                          Next
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Content */}
                  {paginatedStudents.length === 0 ? (
                    <div
                      className="rounded-xl p-8 border text-center"
                      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                    >
                      <p style={{ color: "#9CA3AF" }}>
                        No students found matching &quot;{searchInput}&quot;
                      </p>
                    </div>
                  ) : viewMode === "table" ? (
                    /* Table View */
                    <div
                      className="rounded-xl border overflow-hidden"
                      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                    >
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b font-medium text-xs uppercase tracking-wider" style={{ 
                        backgroundColor: "#F9FAFB",
                        borderColor: "#E5E7EB",
                        color: "#6B7280"
                      }}>
                        <div className="col-span-3">Student</div>
                        <div className="col-span-2 text-center">Attendance</div>
                        <div className="col-span-2 text-center">Present</div>
                        <div className="col-span-2 text-center">Late</div>
                        <div className="col-span-2 text-center">Absent</div>
                        <div className="col-span-1 text-center">Excused</div>
                      </div>
                      
                      {/* Table Body */}
                      <div>
                        {paginatedStudents.map((student, index) => {
                          const summary = getStudentSummary(student.lrn);
                          const studentName = `${student.lastName}, ${student.firstName}${student.middleName ? " " + student.middleName : ""}`;

                          if (!summary || (summary.totalDays ?? 0) === 0) {
                            return (
                              <motion.div
                                key={student.lrn}
                                className="grid grid-cols-12 gap-4 items-center py-3 px-4 border-b last:border-0"
                                style={{ borderColor: "#F3F4F6" }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.03 }}
                              >
                                <div className="col-span-3">
                                  <div className="font-medium text-sm" style={{ color: "#1F1F1F" }}>
                                    {studentName}
                                  </div>
                                  <div className="text-xs" style={{ color: "#9CA3AF" }}>
                                    {student.lrn}
                                  </div>
                                </div>
                                <div className="col-span-9 text-center text-sm" style={{ color: "#9CA3AF" }}>
                                  No attendance records
                                </div>
                              </motion.div>
                            );
                          }

                          return (
                            <StudentSummaryCard
                              key={student.lrn}
                              studentName={studentName}
                              lrn={student.lrn}
                              summary={summary}
                              index={index}
                              compact={true}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Cards View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedStudents.map((student, index) => {
                        const summary = getStudentSummary(student.lrn);
                        const studentName = `${student.lastName}, ${student.firstName}${student.middleName ? " " + student.middleName : ""}`;

                        if (!summary || (summary.totalDays ?? 0) === 0) {
                          return (
                            <motion.div
                              key={student.lrn}
                              className="rounded-xl p-4 border"
                              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05, duration: 0.25 }}
                            >
                              <h3 className="font-semibold" style={{ color: "#1F1F1F" }}>
                                {studentName}
                              </h3>
                              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                                No attendance records
                              </p>
                            </motion.div>
                          );
                        }

                        return (
                          <StudentSummaryCard
                            key={student.lrn}
                            studentName={studentName}
                            lrn={student.lrn}
                            summary={summary}
                            index={index}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      </RoleGuard>
    </AuthGuard>
  );
}
