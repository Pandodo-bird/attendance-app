"use client";

import { StudentSummary } from "@/lib/firestore";
import { motion } from "framer-motion";

interface StudentSummaryCardProps {
  studentName: string;
  lrn: string;
  summary: StudentSummary;
  index?: number;
  compact?: boolean;
}

export default function StudentSummaryCard({
  studentName,
  lrn,
  summary,
  index = 0,
  compact = false,
}: StudentSummaryCardProps) {
  // Defensive checks for undefined fields
  const present = summary.present ?? 0;
  const late = summary.late ?? 0;
  const absent = summary.absent ?? 0;
  const excused = summary.excused ?? 0;
  const totalDays = summary.totalDays ?? 0;
  const inferredTotalDays = present + late + absent + excused;
  const effectiveTotalDays = Math.max(totalDays, inferredTotalDays);

  const attendanceRate = effectiveTotalDays > 0
    ? Math.round(((present + late + excused) / effectiveTotalDays) * 100)
    : 0;

  const isAtRisk = attendanceRate < 75 && effectiveTotalDays > 0;
  const isPerfect = attendanceRate === 100 && effectiveTotalDays > 0;

  if (compact) {
    // Compact table row style
    return (
      <motion.div
        className="grid grid-cols-12 gap-3 items-center py-2.5 px-4 border-b last:border-0"
        style={{ borderColor: "#E2E8F0" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.03 }}
      >
        {/* Name */}
        <div className="col-span-3">
          <div className="font-medium text-sm truncate" style={{ color: "#0F172A" }}>
            {studentName}
          </div>
          <div className="text-[11px] font-medium mt-0.5" style={{ color: "#64748B" }}>
            LRN: {lrn}
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="col-span-2 text-center">
          <span
            className="px-2 py-1 rounded-md text-[11px] font-semibold"
            style={{
              backgroundColor: isPerfect ? "#DCFCE7" : isAtRisk ? "#FEE2E2" : attendanceRate >= 90 ? "#DCFCE7" : attendanceRate >= 75 ? "#FEF3C7" : "#FEE2E2",
              color: isPerfect ? "#166534" : isAtRisk ? "#991B1B" : attendanceRate >= 90 ? "#166534" : attendanceRate >= 75 ? "#92400E" : "#991B1B",
            }}
          >
            {attendanceRate}%
          </span>
        </div>

        {/* Present */}
        <div className="col-span-2 text-center">
          <div className="text-sm font-semibold" style={{ color: "#166534" }}>
            {present}
          </div>
        </div>

        {/* Late */}
        <div className="col-span-2 text-center">
          <div className="text-sm font-semibold" style={{ color: "#92400E" }}>
            {late}
          </div>
        </div>

        {/* Absent */}
        <div className="col-span-2 text-center">
          <div className="text-sm font-semibold" style={{ color: "#991B1B" }}>
            {absent}
          </div>
        </div>

        {/* Excused */}
        <div className="col-span-1 text-center">
          <div className="text-sm font-semibold" style={{ color: "#1D4ED8" }}>
            {excused}
          </div>
        </div>
      </motion.div>
    );
  }

  // Card style (original but simplified)
  return (
    <motion.div
      className="rounded-xl p-3.5 border"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
      whileHover={{
        borderColor: "#CBD5E1",
        boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
      }}
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-sm truncate" style={{ color: "#0F172A" }}>
          {studentName}
        </h3>
        <p className="text-[11px] font-medium mt-0.5" style={{ color: "#64748B" }}>
          LRN: {lrn}
        </p>
      </div>

      {/* Stats Grid - Simplified */}
      <div className="grid grid-cols-5 gap-2">
        <div className="text-center">
          <div className="text-lg font-semibold" style={{ color: "#166534" }}>
            {present}
          </div>
          <div className="text-[10px] uppercase tracking-tight" style={{ color: "#6B7280" }}>
            Present
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold" style={{ color: "#92400E" }}>
            {late}
          </div>
          <div className="text-[10px] uppercase tracking-tight" style={{ color: "#6B7280" }}>
            Late
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold" style={{ color: "#991B1B" }}>
            {absent}
          </div>
          <div className="text-[10px] uppercase tracking-tight" style={{ color: "#6B7280" }}>
            Absent
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold" style={{ color: "#1D4ED8" }}>
            {excused}
          </div>
          <div className="text-[10px] uppercase tracking-tight" style={{ color: "#6B7280" }}>
            Excused
          </div>
        </div>
        <div className="text-center">
          <div
            className="text-lg font-semibold"
            style={{ color: isPerfect ? "#166534" : isAtRisk ? "#991B1B" : "#1E3A5F" }}
          >
            {attendanceRate}%
          </div>
          <div className="text-[10px] uppercase tracking-tight" style={{ color: "#6B7280" }}>
            Rate
          </div>
        </div>
      </div>
    </motion.div>
  );
}
