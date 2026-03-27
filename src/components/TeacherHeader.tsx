"use client";

import { ReactNode } from "react";
import { Section } from "@/lib/firestore";
import { ChevronDown } from "lucide-react";

interface TeacherHeaderProps {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  stats?: Array<{
    label: string;
    value: string | number | ReactNode;
    valueColor?: string;
  }>;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  sectionFilter?: {
    sections: Section[];
    selectedSectionId: string;
    onSectionChange: (sectionId: string) => void;
  };
}

export default function TeacherHeader({
  title,
  stats = [],
  sectionFilter
}: TeacherHeaderProps) {
  return (
    <>
      {/* Top Navigation Bar */}
      <header
        className="h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 backdrop-blur-md"
        style={{ backgroundColor: "rgba(253, 247, 255, 0.8)" }}
      >
        <h2
          className="font-headline text-lg lg:text-xl font-bold"
          style={{ color: "#1c1a22" }}
        >
          Attendance Management
        </h2>
      </header>

      {/* Page Header Section */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-4 lg:px-8 pt-6 lg:pt-8 pb-4">
        <div className="w-full sm:w-auto">
          <h3
            className="font-headline text-3xl sm:text-4xl font-extrabold -tracking-wide"
            style={{ color: "#1c1a22" }}
          >
            {title}
          </h3>
          {/* Section Filter Dropdown */}
          {sectionFilter && sectionFilter.sections.length > 0 && (
            <div className="mt-3 relative inline-block">
              <select
                className="appearance-none border rounded-lg py-2.5 pl-4 pr-10 text-sm font-medium focus:ring-2 focus:ring-[#5b3ebf] focus:border-[#5b3ebf] transition-all outline-none cursor-pointer"
                style={{ 
                  backgroundColor: "#FFFFFF", 
                  borderColor: "#D1D5DB", 
                  color: "#1c1a22",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
                value={sectionFilter.selectedSectionId}
                onChange={(e) => sectionFilter.onSectionChange(e.target.value)}
              >
                {sectionFilter.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.gradeLevel} - {section.sectionName}
                  </option>
                ))}
              </select>
              <ChevronDown 
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" 
                size={18} 
                style={{ color: "#6B7280" }}
              />
            </div>
          )}
        </div>
        {stats.length > 0 && (
          <div className="flex gap-2 lg:gap-4 w-full sm:w-auto overflow-x-auto">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="px-4 lg:px-6 py-2 lg:py-3 rounded-lg shrink-0 flex flex-col items-end justify-center gap-0.5"
                style={{ 
                  backgroundColor: "#FFFFFF",
                  border: "0.5px solid #E5E7EB"
                }}
              >
                {stat.label && (
                  <p
                    className="font-label text-[10px] uppercase tracking-tighter font-medium"
                    style={{ color: "#6B7280" }}
                  >
                    {stat.label}
                  </p>
                )}
                {typeof stat.value === "string" || typeof stat.value === "number" ? (
                  <p
                    className="font-headline text-xl lg:text-2xl font-medium leading-none"
                    style={{ color: "#1F1F1F" }}
                  >
                    {stat.value}
                  </p>
                ) : (
                  <div
                    className="font-headline text-xl lg:text-2xl font-medium leading-none"
                    style={{ color: "#1F1F1F" }}
                  >
                    {stat.value}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
