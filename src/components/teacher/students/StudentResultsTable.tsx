"use client";

import { useMemo, useState, useRef, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import StudentActionsMenu from "./StudentActionsMenu";

export interface StudentRow {
  lrn: string;
  firstName: string;
  lastName: string;
  middleName: string;
  sectionId: string;
  sectionName: string;
  gradeLevel: string;
  sex: "male" | "female" | "";
  learningModality: string;
  studentStatus: "active" | "inactive" | "graduated" | "dropped";
  birthDate?: Date | Timestamp | string;
  religion?: string;

  // Address
  barangay?: string;
  city?: string;
  province?: string;

  // Parent/Guardian Info
  fatherName?: string;
  motherMaidenName?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianContactNumber?: string;
}

interface StudentResultsTableProps {
  students: StudentRow[];
  searchQuery: string;
  filterSection: string;
  filterSex: string;
  filterModality: string;
  onViewStudent: (student: StudentRow) => void;
  onEditStudent: (student: StudentRow) => void;
  onDeleteStudent: (student: StudentRow) => void;
  rowsPerPage?: number;
}

export default function StudentResultsTable({
  students,
  searchQuery,
  filterSection,
  filterSex,
  filterModality,
  onViewStudent,
  onEditStudent,
  onDeleteStudent,
  rowsPerPage = 10,
}: StudentResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const prevFiltersRef = useRef({ searchQuery, filterSection, filterSex, filterModality });

  // Reset page when filters or search change (using useLayoutEffect to avoid cascading renders)
  useLayoutEffect(() => {
    const prevFilters = prevFiltersRef.current;
    if (
      prevFilters.searchQuery !== searchQuery ||
      prevFilters.filterSection !== filterSection ||
      prevFilters.filterSex !== filterSex ||
      prevFilters.filterModality !== filterModality
    ) {
      prevFiltersRef.current = { searchQuery, filterSection, filterSex, filterModality };
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }
  }, [searchQuery, filterSection, filterSex, filterModality, currentPage]);

  // Filter and search students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search by name or LRN
      const searchLower = searchQuery.toLowerCase();
      const fullName = `${student.firstName} ${student.middleName} ${student.lastName}`.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        fullName.includes(searchLower) ||
        student.lrn.toLowerCase().includes(searchLower);

      // Filter by section
      const matchesSection = filterSection === "" || student.sectionName === filterSection;

      // Filter by sex
      const matchesSex = filterSex === "" || student.sex === filterSex;

      // Filter by modality
      const matchesModality = filterModality === "" || student.learningModality === filterModality;

      return matchesSearch && matchesSection && matchesSex && matchesModality;
    });
  }, [students, searchQuery, filterSection, filterSex, filterModality]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredStudents.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const getFullName = (student: StudentRow) => {
    const middle = student.middleName ? ` ${student.middleName}` : "";
    return `${student.lastName}, ${student.firstName}${middle}`;
  };

  const getSexLabel = (sex: string) => {
    if (sex === "") return "";
    return sex.charAt(0).toUpperCase() + sex.slice(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "#D1FAE5", text: "#065F46" };
      case "inactive":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "graduated":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      case "dropped":
        return { bg: "#FEE2E2", text: "#991B1B" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  // Empty state - no search query
  if (!searchQuery && !filterSection && !filterSex && !filterModality) {
    return (
      <div
        className="rounded-xl border p-12 flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#F0EDF7" }}
        >
          <Search size={32} style={{ color: "#6C5CE7" }} />
        </div>
        <div className="text-center">
          <p className="text-base font-medium" style={{ color: "#1F1F1F" }}>
            Search for a student by name or LRN
          </p>
          <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>
            Type in the search bar above to find students
          </p>
        </div>
      </div>
    );
  }

  // No results state
  if (filteredStudents.length === 0) {
    return (
      <div
        className="rounded-xl border p-12 flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#FEF2F2" }}
        >
          <Search size={32} style={{ color: "#DC2626" }} />
        </div>
        <div className="text-center">
          <p className="text-base font-medium" style={{ color: "#1F1F1F" }}>
            No students found for &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>
            Try adjusting your search or filters
          </p>
        </div>
      </div>
    );
  }

  // Results table
  return (
    <div className="space-y-4">
      {/* Result count and rows per page */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "#9CA3AF" }}>
          Showing {filteredStudents.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} result{filteredStudents.length !== 1 ? "s" : ""}
          {searchQuery && ` for "${searchQuery}"`}
        </p>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden border"
        style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                <th
                  className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                >
                  LRN
                </th>
                <th
                  className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                >
                  Name
                </th>
                <th
                  className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                >
                  Section
                </th>
                <th
                  className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                >
                  Sex
                </th>
                <th
                  className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                >
                  Modality
                </th>
                <th
                  className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                >
                  Status
                </th>
                <th
                  className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student, index) => (
                <motion.tr
                  key={student.lrn}
                  className="border-b last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer"
                  style={{ borderColor: "#E5E7EB" }}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02, duration: 0.15 }}
                  onClick={() => onViewStudent(student)}
                >
                  <td
                    className="px-4 py-3 text-sm font-mono"
                    style={{ color: "#6B7280" }}
                  >
                    {student.lrn}
                  </td>
                  <td
                    className="px-4 py-3 text-sm font-medium"
                    style={{ color: "#1F1F1F" }}
                  >
                    {getFullName(student)}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "#374151" }}
                  >
                    {student.gradeLevel} - {student.sectionName}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "#374151" }}
                  >
                    {getSexLabel(student.sex)}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "#374151" }}
                  >
                    {student.learningModality}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: getStatusColor(student.studentStatus).bg,
                        color: getStatusColor(student.studentStatus).text,
                      }}
                    >
                      {student.studentStatus.charAt(0).toUpperCase() + student.studentStatus.slice(1)}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StudentActionsMenu
                      onView={() => onViewStudent(student)}
                      onEdit={() => onEditStudent(student)}
                      onDelete={() => onDeleteStudent(student)}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB" }}
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB" }}
            >
              Previous
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first, last, current, and adjacent pages
                const showPage =
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);

                if (!showPage) {
                  // Show ellipsis for skipped pages
                  const prevShown =
                    page === currentPage - 1 ||
                    (currentPage === 1 && page === 2) ||
                    (currentPage === totalPages && page === totalPages - 1);
                  if (!prevShown) {
                    return (
                      <span
                        key={`ellipsis-${page}`}
                        className="px-2 py-1.5 text-sm"
                        style={{ color: "#9CA3AF" }}
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === page
                        ? "bg-[#6C5CE7] text-white"
                        : "hover:bg-[#F3F4F6]"
                    }`}
                    style={
                      currentPage !== page
                        ? { backgroundColor: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB" }
                        : {}
                    }
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB" }}
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB" }}
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
