"use client";

import { useMemo } from "react";
import { Timestamp } from "firebase/firestore";
import { X } from "lucide-react";

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
        <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
          Section
        </span>
        <select
          value={filterSection}
          onChange={(e) => onFilterSection(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all cursor-pointer"
          style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#0F172A" }}
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
        <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
          Sex
        </span>
        <select
          value={filterSex}
          onChange={(e) => onFilterSex(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all cursor-pointer"
          style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#0F172A" }}
        >
          <option value="">All</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      {/* Modality Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
          Modality
        </span>
        <select
          value={filterModality}
          onChange={(e) => onFilterModality(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all cursor-pointer"
          style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#0F172A" }}
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
          className="text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 hover:bg-slate-100"
          style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}
        >
          <X size={14} />
          Clear filters
        </button>
      )}
    </div>
  );
}
