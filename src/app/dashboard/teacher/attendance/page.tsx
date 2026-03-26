"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { RoleGuard } from "@/hooks/useRequireRole";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getTeacherSections,
  getSectionStudents,
  getSectionSummariesBySection,
  StudentSummary,
  calculateClassAnalytics,
} from "@/lib/firestore";
import { ClassAnalytics, MonthlyTrendChart, StudentSummaryCard } from "@/components/teacher/attendance";
import { motion } from "framer-motion";

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
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(15);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Fetch teacher's sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections", user?.uid],
    queryFn: () => getTeacherSections(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Auto-select first section if none selected
  if (sections.length > 0 && !selectedSectionId) {
    setSelectedSectionId(sections[0].id);
  }

  // Fetch students for selected section
  const { data: students = [] } = useQuery({
    queryKey: ["sectionStudents", selectedSectionId],
    queryFn: () => getSectionStudents(selectedSectionId),
    enabled: !!selectedSectionId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  // Fetch student summaries for selected section
  const currentSchoolYear = "2025-2026"; // TODO: Make dynamic based on section
  const { data: summaries = [], isLoading: summariesLoading } = useQuery({
    queryKey: ["studentSummaries", selectedSectionId, currentSchoolYear],
    queryFn: () => getSectionSummariesBySection(selectedSectionId, currentSchoolYear),
    enabled: !!selectedSectionId,
    staleTime: 30 * 60 * 1000, // 30 minutes - summaries are stable
    gcTime: 60 * 60 * 1000,
  });

  // Calculate analytics
  const analytics = calculateClassAnalytics(summaries);

  // Filter and sort students alphabetically by last name
  const filteredStudents = students
    .filter(
      (student) =>
        student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.lrn.includes(searchQuery)
    )
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (searchQuery) {
      setCurrentPage(1);
    }
  }, [searchQuery]);

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
            onSearch={(query) => setSearchQuery(query)}
            sectionFilter={{
              sections,
              selectedSectionId,
              onSectionChange: setSelectedSectionId,
            }}
          />

          {/* Content Canvas */}
          <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
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
            ) : summariesLoading ? (
              <div
                className="rounded-xl p-8 border text-center"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
              >
                <p style={{ color: "#6B7280" }}>Loading analytics...</p>
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
                <ClassAnalytics summaries={summaries} />

                {/* Monthly Trend Chart */}
                <MonthlyTrendChart summaries={summaries} />

                {/* Individual Student List */}
                <div>
                  {/* Top Bar: Title, View Toggle, Pagination */}
                  <div className="flex items-center justify-between mb-4">
                    <h3
                      className="font-semibold text-lg"
                      style={{ color: "#1F1F1F" }}
                    >
                      Students ({paginatedStudents.length} of {filteredStudents.length})
                    </h3>
                    
                    <div className="flex items-center gap-4">
                      {/* View Toggle */}
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

                      {/* Pagination Info */}
                      {totalPages > 1 && (
                        <div className="text-sm" style={{ color: "#6B7280" }}>
                          Page {currentPage} / {totalPages}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pagination Controls - Top */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          backgroundColor: currentPage === 1 ? "#F3F4F6" : "#FFFFFF",
                          borderColor: "#E5E7EB",
                          color: currentPage === 1 ? "#9CA3AF" : "#1F1F1F"
                        }}
                      >
                        ← Previous
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Show smart page numbers (current page in middle)
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-9 h-9 rounded-lg border text-sm font-medium transition-colors"
                              style={{
                                backgroundColor: currentPage === pageNum ? "#6C5CE7" : "#FFFFFF",
                                borderColor: currentPage === pageNum ? "#6C5CE7" : "#E5E7EB",
                                color: currentPage === pageNum ? "#FFFFFF" : "#1F1F1F"
                              }}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          backgroundColor: currentPage === totalPages ? "#F3F4F6" : "#FFFFFF",
                          borderColor: "#E5E7EB",
                          color: currentPage === totalPages ? "#9CA3AF" : "#1F1F1F"
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  )}

                  {/* Content */}
                  {paginatedStudents.length === 0 ? (
                    <div
                      className="rounded-xl p-8 border text-center"
                      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
                    >
                      <p style={{ color: "#9CA3AF" }}>
                        No students found matching &quot;{searchQuery}&quot;
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
                        <div className="col-span-4">Student</div>
                        <div className="col-span-2 text-center">Attendance</div>
                        <div className="col-span-2 text-center">Present</div>
                        <div className="col-span-2 text-center">Late</div>
                        <div className="col-span-2 text-center">Absent</div>
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
                                <div className="col-span-4">
                                  <div className="font-medium text-sm" style={{ color: "#1F1F1F" }}>
                                    {studentName}
                                  </div>
                                  <div className="text-xs" style={{ color: "#9CA3AF" }}>
                                    {student.lrn}
                                  </div>
                                </div>
                                <div className="col-span-8 text-center text-sm" style={{ color: "#9CA3AF" }}>
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

                  {/* Pagination Controls - Bottom (optional, for convenience) */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          backgroundColor: currentPage === 1 ? "#F3F4F6" : "#FFFFFF",
                          borderColor: "#E5E7EB",
                          color: currentPage === 1 ? "#9CA3AF" : "#1F1F1F"
                        }}
                      >
                        ← Previous
                      </button>
                      
                      <div className="text-sm" style={{ color: "#6B7280" }}>
                        Page {currentPage} of {totalPages}
                      </div>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          backgroundColor: currentPage === totalPages ? "#F3F4F6" : "#FFFFFF",
                          borderColor: "#E5E7EB",
                          color: currentPage === totalPages ? "#9CA3AF" : "#1F1F1F"
                        }}
                      >
                        Next →
                      </button>
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
