"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

export interface StudentRow {
  lrn: string;
  firstName: string;
  lastName: string;
  middleName: string;
  sectionId: string;  // Add sectionId for Firestore operations
  sectionName: string;
  gradeLevel: string;
  sex: "male" | "female" | "";
  learningModality: string;
  studentStatus: "active" | "inactive" | "graduated" | "dropped";
}

interface StudentTableProps {
  students: StudentRow[];
  searchQuery?: string;
  onSearch?: (query: string) => void;
  filterSection?: string;
  filterSex?: string;
  filterModality?: string;
  onFilterSection?: (section: string) => void;
  onFilterSex?: (sex: string) => void;
  onFilterModality?: (modality: string) => void;
}

export default function StudentTable({
  students,
  searchQuery = "",
  onSearch,
  filterSection = "",
  filterSex = "",
  filterModality = "",
  onFilterSection,
  onFilterSex,
  onFilterModality,
}: StudentTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof StudentRow | "">("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Get unique values for filters
  const sections = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.sectionName)));
    return unique.sort();
  }, [students]);

  const modalities = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.learningModality)));
    return unique.sort();
  }, [students]);

  // Filter and search students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search by name or LRN
      const searchLower = searchQuery.toLowerCase();
      const fullName = `${student.firstName} ${student.middleName} ${student.lastName}`.toLowerCase();
      const matchesSearch = searchQuery === "" || 
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

  // Sort students
  const sortedStudents = useMemo(() => {
    if (!sortColumn) return filteredStudents;

    return [...filteredStudents].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredStudents, sortColumn, sortDirection]);

  const handleSort = (column: keyof StudentRow) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getFullName = (student: StudentRow) => {
    const middle = student.middleName ? ` ${student.middleName}` : "";
    return `${student.lastName}, ${student.firstName}${middle}`;
  };

  const getSexLabel = (sex: string) => {
    if (sex === "") return "";
    return sex.charAt(0).toUpperCase() + sex.slice(1);
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Section Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "#6B7280" }}>
            Section:
          </span>
          <select
            value={filterSection}
            onChange={(e) => onFilterSection?.(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6C5CE7] outline-none"
            style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#1F1F1F" }}
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>

        {/* Sex Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "#6B7280" }}>
            Sex:
          </span>
          <select
            value={filterSex}
            onChange={(e) => onFilterSex?.(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6C5CE7] outline-none"
            style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#1F1F1F" }}
          >
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        {/* Modality Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "#6B7280" }}>
            Modality:
          </span>
          <select
            value={filterModality}
            onChange={(e) => onFilterModality?.(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6C5CE7] outline-none"
            style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#1F1F1F" }}
          >
            <option value="">All Modalities</option>
            {modalities.map((modality) => (
              <option key={modality} value={modality}>
                {modality}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {(filterSection || filterSex || filterModality || searchQuery) && (
          <button
            onClick={() => {
              onSearch?.("");
              onFilterSection?.("");
              onFilterSex?.("");
              onFilterModality?.("");
            }}
            className="text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            style={{ color: "#6C5CE7", backgroundColor: "#F0EDF7" }}
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "#6B7280" }}>
          Showing {filteredStudents.length} of {students.length} students
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
              <tr style={{ backgroundColor: "#F0EDF7" }}>
                <th
                  className="px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer hover:bg-[#E6E0EC] transition-colors"
                  style={{ color: "#6B6B6B", borderColor: "#E5E7EB" }}
                  onClick={() => handleSort("lrn")}
                >
                  <div className="flex items-center gap-1">
                    LRN
                    {sortColumn === "lrn" && (
                      <span className="material-symbols-outlined text-xs">
                        {sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer hover:bg-[#E6E0EC] transition-colors"
                  style={{ color: "#6B6B6B", borderColor: "#E5E7EB" }}
                  onClick={() => handleSort("lastName")}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortColumn === "lastName" && (
                      <span className="material-symbols-outlined text-xs">
                        {sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer hover:bg-[#E6E0EC] transition-colors"
                  style={{ color: "#6B6B6B", borderColor: "#E5E7EB" }}
                  onClick={() => handleSort("sectionName")}
                >
                  <div className="flex items-center gap-1">
                    Section
                    {sortColumn === "sectionName" && (
                      <span className="material-symbols-outlined text-xs">
                        {sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer hover:bg-[#E6E0EC] transition-colors"
                  style={{ color: "#6B6B6B", borderColor: "#E5E7EB" }}
                  onClick={() => handleSort("sex")}
                >
                  <div className="flex items-center gap-1">
                    Sex
                    {sortColumn === "sex" && (
                      <span className="material-symbols-outlined text-xs">
                        {sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold uppercase cursor-pointer hover:bg-[#E6E0EC] transition-colors"
                  style={{ color: "#6B6B6B", borderColor: "#E5E7EB" }}
                  onClick={() => handleSort("learningModality")}
                >
                  <div className="flex items-center gap-1">
                    Modality
                    {sortColumn === "learningModality" && (
                      <span className="material-symbols-outlined text-xs">
                        {sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold uppercase"
                  style={{ color: "#6B6B6B", borderColor: "#E5E7EB" }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center"
                    style={{ color: "#9CA3AF" }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl">search_off</span>
                      <p className="text-sm">No students found</p>
                      {(searchQuery || filterSection || filterSex || filterModality) && (
                        <p className="text-xs">Try adjusting your search or filters</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student, index) => (
                  <motion.tr
                    key={student.lrn}
                    className="border-b last:border-b-0 hover:bg-[#F9FAFB] transition-colors"
                    style={{ borderColor: "#E5E7EB" }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.15 }}
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
                          backgroundColor: getStudentStatusColor(student.studentStatus).bg,
                          color: getStudentStatusColor(student.studentStatus).text,
                        }}
                      >
                        {student.studentStatus.charAt(0).toUpperCase() + student.studentStatus.slice(1)}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getStudentStatusColor(status: string) {
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
}
