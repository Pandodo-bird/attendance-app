"use client";

import { StudentSummary } from "@/lib/firestore";
import { motion } from "framer-motion";
import { TrendingUp, Users, Award, AlertTriangle } from "lucide-react";

interface ClassAnalyticsProps {
  summaries: StudentSummary[];
}

export default function ClassAnalytics({ summaries }: ClassAnalyticsProps) {
  const analytics = calculateAnalytics(summaries);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Students */}
      <motion.div
        className="rounded-xl p-5 border"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.25, ease: "easeOut" }}
        whileHover={{
          borderColor: "#D1D5DB",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#6C5CE7" }}
          >
            <Users size={24} color="#FFFFFF" />
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: "#1F1F1F" }}>
              {analytics.totalStudents}
            </div>
            <div className="text-sm" style={{ color: "#6B7280" }}>
              Total Students
            </div>
          </div>
        </div>
      </motion.div>

      {/* Average Attendance Rate */}
      <motion.div
        className="rounded-xl p-5 border"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.25, ease: "easeOut" }}
        whileHover={{
          borderColor: "#D1D5DB",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor:
                analytics.averageAttendanceRate >= 90
                  ? "#16A34A"
                  : analytics.averageAttendanceRate >= 75
                  ? "#CA8A04"
                  : "#DC2626",
            }}
          >
            <TrendingUp size={24} color="#FFFFFF" />
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: "#1F1F1F" }}>
              {analytics.averageAttendanceRate}%
            </div>
            <div className="text-sm" style={{ color: "#6B7280" }}>
              Avg Attendance
            </div>
          </div>
        </div>
      </motion.div>

      {/* Perfect Attendance */}
      <motion.div
        className="rounded-xl p-5 border"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25, ease: "easeOut" }}
        whileHover={{
          borderColor: "#D1D5DB",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#10B981" }}
          >
            <Award size={24} color="#FFFFFF" />
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: "#1F1F1F" }}>
              {analytics.perfectAttendance}
            </div>
            <div className="text-sm" style={{ color: "#6B7280" }}>
              Perfect Attendance
            </div>
          </div>
        </div>
      </motion.div>

      {/* At Risk Students */}
      <motion.div
        className="rounded-xl p-5 border"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.25, ease: "easeOut" }}
        whileHover={{
          borderColor: "#D1D5DB",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#EF4444" }}
          >
            <AlertTriangle size={24} color="#FFFFFF" />
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: "#1F1F1F" }}>
              {analytics.atRiskStudents}
            </div>
            <div className="text-sm" style={{ color: "#6B7280" }}>
              At Risk {"(<75%)"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        className="md:col-span-2 lg:col-span-4 rounded-xl p-5 border"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.25, ease: "easeOut" }}
      >
        <h3 className="font-semibold text-base mb-4" style={{ color: "#1F1F1F" }}>
          Overall Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#16A34A" }}>
              {analytics.totalPresent}
            </div>
            <div className="text-sm mt-1" style={{ color: "#6B7280" }}>
              Total Present
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#CA8A04" }}>
              {analytics.totalLate}
            </div>
            <div className="text-sm mt-1" style={{ color: "#6B7280" }}>
              Total Late
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#DC2626" }}>
              {analytics.totalAbsent}
            </div>
            <div className="text-sm mt-1" style={{ color: "#6B7280" }}>
              Total Absent
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#6C5CE7" }}>
              {analytics.totalDays}
            </div>
            <div className="text-sm mt-1" style={{ color: "#6B7280" }}>
              School Days
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Inline calculation function (can also import from firestore.ts)
function calculateAnalytics(summaries: StudentSummary[]) {
  if (summaries.length === 0) {
    return {
      totalStudents: 0,
      averageAttendanceRate: 0,
      perfectAttendance: 0,
      atRiskStudents: 0,
      totalPresent: 0,
      totalLate: 0,
      totalAbsent: 0,
      totalDays: 0,
    };
  }

  let totalPresent = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalDays = 0;
  let perfectAttendanceCount = 0;
  let atRiskCount = 0;

  summaries.forEach((summary) => {
    // Defensive checks for undefined fields
    const present = summary.present ?? 0;
    const late = summary.late ?? 0;
    const absent = summary.absent ?? 0;
    const summaryTotalDays = summary.totalDays ?? 0;

    totalPresent += present;
    totalLate += late;
    totalAbsent += absent;
    totalDays = Math.max(totalDays, summaryTotalDays);

    const attendanceRate = summaryTotalDays > 0
      ? ((present + late) / summaryTotalDays) * 100
      : 0;

    if (attendanceRate === 100 && summaryTotalDays > 0) {
      perfectAttendanceCount++;
    }

    if (attendanceRate < 75 && summaryTotalDays > 0) {
      atRiskCount++;
    }
  });

  const averageAttendanceRate = totalDays > 0 && summaries.length > 0
    ? ((totalPresent + totalLate) / (totalDays * summaries.length)) * 100
    : 0;

  return {
    totalStudents: summaries.length,
    averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100 || 0,
    perfectAttendance: perfectAttendanceCount,
    atRiskStudents: atRiskCount,
    totalPresent,
    totalLate,
    totalAbsent,
    totalDays,
  };
}
