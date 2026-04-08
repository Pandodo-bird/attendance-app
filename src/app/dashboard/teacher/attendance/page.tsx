"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { RoleGuard } from "@/hooks/useRequireRole";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildSectionAttendanceId,
  buildSectionSlug,
  calculateAttendanceStats,
  getAttendanceSession,
  getTeacherSections,
  getSectionStudents,
  getSectionSummariesBySection,
  StudentSummary,
} from "@/lib/firestore";
import { ClassAnalytics, MonthlyTrendChart, StudentSummaryCard } from "@/components/teacher/attendance";
import { motion } from "framer-motion";
import { Search, Grid3X3, List } from "lucide-react";

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

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections", user?.uid],
    queryFn: () => getTeacherSections(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const resolvedSectionId = useMemo(() => {
    if (sections.length === 0) return "";

    const sectionParam = searchParams?.get("section");
    if (sectionParam && sections.some((section) => section.id === sectionParam)) {
      return sectionParam;
    }

    const savedSection = localStorage.getItem(`attendance_section_${user?.uid}`);
    if (savedSection && sections.some((section) => section.id === savedSection)) {
      return savedSection;
    }

    return sections[0].id;
  }, [sections, searchParams, user?.uid]);

  const effectiveSectionId = sections.some((section) => section.id === selectedSectionId)
    ? selectedSectionId
    : resolvedSectionId;

  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setCurrentPage(1);
    localStorage.setItem(`attendance_section_${user?.uid}`, sectionId);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (sectionId) {
      params.set("section", sectionId);
    } else {
      params.delete("section");
    }
    router.push(`/dashboard/teacher/attendance?${params.toString()}`, { scroll: false });
  };

  const { data: students = [] } = useQuery({
    queryKey: ["sectionStudents", effectiveSectionId],
    queryFn: () => getSectionStudents(effectiveSectionId),
    enabled: !!effectiveSectionId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const selectedSection = sections.find((section) => section.id === effectiveSectionId);
  const currentSchoolYear = selectedSection?.schoolYear ?? "2025-2026";
  const {
    data: sectionSummaries = [],
    isLoading: summariesLoading,
    isFetching: summariesFetching,
  } = useQuery({
    queryKey: ["studentSummaries", effectiveSectionId, currentSchoolYear],
    queryFn: () => getSectionSummariesBySection(effectiveSectionId, currentSchoolYear),
    enabled: !!effectiveSectionId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: [],
  });
  const summaries = sectionSummaries.filter((summary) => summary.sectionId === effectiveSectionId);

  const todayDate = new Date();
  const todayDateKey = formatLocalDateKey(todayDate);

  const todayAttendanceId = selectedSection
    ? buildSectionAttendanceId(todayDateKey, buildSectionSlug(selectedSection.gradeLevel, selectedSection.sectionName))
    : null;

  const {
    data: todaysSession,
    isLoading: todaysSessionLoading,
    isFetching: todaysSessionFetching,
  } = useQuery({
    queryKey: ["teacherAttendanceSession", todayAttendanceId],
    queryFn: () => getAttendanceSession(todayAttendanceId!),
    enabled: !!todayAttendanceId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const todaysSummary = calculateAttendanceStats(todaysSession?.records);
  const todaySummaryLoading = !!effectiveSectionId && (todaysSessionLoading || todaysSessionFetching);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
    }, 200);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const normalizedSearchQuery = debouncedSearchQuery.trim().toLowerCase();

  const filteredStudents = students
    .filter(
      (student) =>
        student.lastName.toLowerCase().includes(normalizedSearchQuery) ||
        student.firstName.toLowerCase().includes(normalizedSearchQuery) ||
        (student.middleName ?? "").toLowerCase().includes(normalizedSearchQuery) ||
        student.lrn.includes(debouncedSearchQuery.trim())
    )
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const getStudentSummary = (lrn: string): StudentSummary | undefined => {
    return summaries.find((s) => s.lrn === lrn);
  };

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
          {/* Hero Section */}
          <div
            className="relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #F7FBFF 0%, #EEF5FF 58%, #E8F0FB 100%)",
              borderBottom: "1px solid #D7E2EF",
            }}
          >
            <div className="p-4 lg:p-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: "#56738F" }}>
                    Attendance Analytics
                  </p>
                  <h1 className="mt-3 text-2xl font-bold leading-tight lg:text-3xl" style={{ color: "#102A43" }}>
                    Track and analyze student attendance
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm lg:text-[15px]" style={{ color: "#486581" }}>
                    View attendance rates, monthly trends, and individual student summaries for each section.
                  </p>
                </div>

                {/* Section Filter */}
                <div className="sm:min-w-[280px]">
                  <select
                    value={effectiveSectionId}
                    onChange={(e) => handleSectionChange(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all cursor-pointer"
                    style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF", color: "#102A43" }}
                  >
                    {sections.length === 0 && <option value="">No sections available</option>}
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        Grade {section.gradeLevel} - {section.sectionName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Content Canvas */}
          <motion.div
            className="p-4 lg:p-8 space-y-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Info Banner */}
            <div
              className="rounded-xl border px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
            >
              <p className="text-sm" style={{ color: "#334155" }}>
                Attendance page is analytics-only. For secretary daily history records, open Secretaries and Records.
              </p>
              <button
                type="button"
                onClick={() => router.push("/dashboard/teacher/secretaries")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-fit"
                style={{ backgroundColor: "#334155", color: "#FFFFFF" }}
              >
                Open Secretaries & Records
              </button>
            </div>

            {/* Class Analytics Overview */}
            {!effectiveSectionId ? (
              <div
                className="rounded-xl p-6 border text-center"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
              >
                <p style={{ color: "#9CA3AF" }}>
                  Select a section to view attendance analytics
                </p>
              </div>
            ) : summariesLoading || summariesFetching ? (
              <div
                className="rounded-xl p-6 border text-center"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
              >
                <p style={{ color: "#6B7280" }}>Loading section analytics...</p>
              </div>
            ) : summaries.length === 0 ? (
              <div
                className="rounded-xl p-6 border text-center"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
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
                  todayStatsLoading={todaySummaryLoading}
                />

                {/* Monthly Trend Chart */}
                <MonthlyTrendChart summaries={summaries} />

                {/* Individual Student List */}
                <div className="rounded-xl border p-4" style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}>
                  {/* Top Bar: Title, View Toggle */}
                  <div className="flex flex-col gap-3 mb-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-[15px]" style={{ color: "#0F172A" }}>
                        Students
                      </h3>
                      <div
                        className="mt-2 rounded-lg border px-3 py-2"
                        style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
                      >
                        <p className="text-xs font-medium leading-relaxed" style={{ color: "#475569" }}>
                          Tip: Values in both table and card view show each student&apos;s accumulated attendance totals for the currently selected section and school year.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border min-w-0 sm:min-w-[280px]"
                        style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
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

                      <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                        <button
                          onClick={() => { setViewMode("table"); setCurrentPage(1); }}
                          className="px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5"
                          style={{
                            backgroundColor: viewMode === "table" ? "#FFFFFF" : "transparent",
                            color: viewMode === "table" ? "#0F172A" : "#64748B",
                            boxShadow: viewMode === "table" ? "0 1px 2px rgba(15,23,42,0.08)" : "none",
                          }}
                        >
                          <List size={14} />
                          Table
                        </button>
                        <button
                          onClick={() => { setViewMode("cards"); setCurrentPage(1); }}
                          className="px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5"
                          style={{
                            backgroundColor: viewMode === "cards" ? "#FFFFFF" : "transparent",
                            color: viewMode === "cards" ? "#0F172A" : "#64748B",
                            boxShadow: viewMode === "cards" ? "0 1px 2px rgba(15,23,42,0.08)" : "none",
                          }}
                        >
                          <Grid3X3 size={14} />
                          Cards
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pagination Controls - Top */}
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
                            backgroundColor: currentPage === 1 ? "#E5EDF7" : "#F8FBFF",
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
                                backgroundColor: currentPage === page ? "#1e3a5f" : "#F8FBFF",
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
                            backgroundColor: currentPage === totalPages ? "#E5EDF7" : "#F8FBFF",
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
                      className="rounded-xl p-6 border text-center"
                      style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
                    >
                      <p style={{ color: "#9CA3AF" }}>
                        No students found matching &quot;{searchInput}&quot;
                      </p>
                    </div>
                  ) : viewMode === "table" ? (
                    <div
                      className="rounded-xl border overflow-hidden"
                      style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
                    >
                      <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b font-medium text-xs uppercase tracking-wider" style={{
                        backgroundColor: "#F8FAFC",
                        borderColor: "#E2E8F0",
                        color: "#64748B"
                      }}>
                        <div className="col-span-3">Student</div>
                        <div className="col-span-2 text-center">Attendance (Overall)</div>
                        <div className="col-span-2 text-center">Present</div>
                        <div className="col-span-2 text-center">Late</div>
                        <div className="col-span-2 text-center">Absent</div>
                        <div className="col-span-1 text-center">Excused</div>
                      </div>

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
                                  <div className="text-xs font-medium mt-0.5" style={{ color: "#64748B" }}>
                                    LRN: {student.lrn}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedStudents.map((student, index) => {
                        const summary = getStudentSummary(student.lrn);
                        const studentName = `${student.lastName}, ${student.firstName}${student.middleName ? " " + student.middleName : ""}`;

                        if (!summary || (summary.totalDays ?? 0) === 0) {
                          return (
                            <motion.div
                              key={student.lrn}
                              className="rounded-xl p-4 border"
                              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05, duration: 0.25 }}
                            >
                              <h3 className="font-semibold" style={{ color: "#1F1F1F" }}>
                                {studentName}
                              </h3>
                              <p className="text-xs font-medium mt-1" style={{ color: "#64748B" }}>
                                LRN: {student.lrn}
                              </p>
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
          </motion.div>
        </>
      </RoleGuard>
    </AuthGuard>
  );
}
