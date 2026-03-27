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
        className="grid grid-cols-12 gap-4 items-center py-3 px-4 border-b last:border-0"
        style={{ borderColor: "#F3F4F6" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.03 }}
      >
        {/* Name */}
        <div className="col-span-3">
          <div className="font-medium text-sm truncate" style={{ color: "#1F1F1F" }}>
            {studentName}
          </div>
          <div className="text-xs" style={{ color: "#9CA3AF" }}>
            {lrn}
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="col-span-2 text-center">
          <span
            className="px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: isPerfect ? "#D1FAE5" : isAtRisk ? "#FEE2E2" : attendanceRate >= 90 ? "#D1FAE5" : attendanceRate >= 75 ? "#FEF3C7" : "#FEE2E2",
              color: isPerfect ? "#059669" : isAtRisk ? "#DC2626" : attendanceRate >= 90 ? "#059669" : attendanceRate >= 75 ? "#D97706" : "#DC2626",
            }}
          >
            {attendanceRate}%
          </span>
        </div>

        {/* Present */}
        <div className="col-span-2 text-center">
          <div className="text-sm font-semibold" style={{ color: "#16A34A" }}>
            {present}
          </div>
        </div>

        {/* Late */}
        <div className="col-span-2 text-center">
          <div className="text-sm font-semibold" style={{ color: "#CA8A04" }}>
            {late}
          </div>
        </div>

        {/* Absent */}
        <div className="col-span-2 text-center">
          <div className="text-sm font-semibold" style={{ color: "#DC2626" }}>
            {absent}
          </div>
        </div>

        {/* Excused */}
        <div className="col-span-1 text-center">
          <div className="text-sm font-semibold" style={{ color: "#2563EB" }}>
            {excused}
          </div>
        </div>
      </motion.div>
    );
  }

  // Card style (original but simplified)
  return (
    <motion.div
      className="rounded-xl p-4 border"
      style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
      whileHover={{
        borderColor: "#D1D5DB",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-sm truncate" style={{ color: "#1F1F1F" }}>
          {studentName}
        </h3>
        <p className="text-xs" style={{ color: "#9CA3AF" }}>
          {lrn}
        </p>
      </div>

      {/* Stats Grid - Simplified */}
      <div className="grid grid-cols-5 gap-2">
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: "#16A34A" }}>
            {present}
          </div>
          <div className="text-[10px] uppercase tracking-tight" style={{ color: "#6B7280" }}>
            Present
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: "#CA8A04" }}>
            {late}
          </div>
          <div className="text-[10px] uppercase tracking-tight" style={{ color: "#6B7280" }}>
            Late
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: "#DC2626" }}>
            {absent}
          </div>
          <div className="text-[10px] uppercase tracking-tight" style={{ color: "#6B7280" }}>
            Absent
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold" style={{ color: "#2563EB" }}>
            {excused}
          </div>
          <div className="text-[10px] uppercase tracking-tight" style={{ color: "#6B7280" }}>
            Excused
          </div>
        </div>
        <div className="text-center">
          <div
            className="text-lg font-bold"
            style={{ color: isPerfect ? "#059669" : isAtRisk ? "#DC2626" : "#6C5CE7" }}
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
