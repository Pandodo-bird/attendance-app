"use client";

import { useMemo } from "react";

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
}

interface FilterRowProps {
  students: StudentRow[];
  filterSection: string;
  filterSex: string;
  filterModality: string;
  onFilterSection: (section: string) => void;
  onFilterSex: (sex: string) => void;
  onFilterModality: (modality: string) => void;
}

export default function FilterRow({
  students,
  filterSection,
  filterSex,
  filterModality,
  onFilterSection,
  onFilterSex,
  onFilterModality,
}: FilterRowProps) {
  // Get unique values for filters from all students
  const sections = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.sectionName)));
    return unique.sort();
  }, [students]);

  const modalities = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.learningModality)));
    return unique.sort();
  }, [students]);

  const hasActiveFilters = filterSection || filterSex || filterModality;

  const handleClearAll = () => {
    onFilterSection("");
    onFilterSex("");
    onFilterModality("");
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Section Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
          SECTION:
        </span>
        <select
          value={filterSection}
          onChange={(e) => onFilterSection(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none transition-all cursor-pointer"
          style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#374151" }}
        >
          <option value="">All</option>
          {sections.map((section) => (
            <option key={section} value={section}>
              {section}
            </option>
          ))}
        </select>
      </div>

      {/* Sex Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
          SEX:
        </span>
        <select
          value={filterSex}
          onChange={(e) => onFilterSex(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none transition-all cursor-pointer"
          style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#374151" }}
        >
          <option value="">All</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      {/* Modality Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
          MODALITY:
        </span>
        <select
          value={filterModality}
          onChange={(e) => onFilterModality(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none transition-all cursor-pointer"
          style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#374151" }}
        >
          <option value="">All</option>
          {modalities.map((modality) => (
            <option key={modality} value={modality}>
              {modality}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={handleClearAll}
          className="text-xs font-medium px-3 py-2 rounded-md transition-colors flex items-center gap-1.5"
          style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
        >
          <span className="material-symbols-outlined text-sm">close</span>
          Clear filters
        </button>
      )}
    </div>
  );
}
