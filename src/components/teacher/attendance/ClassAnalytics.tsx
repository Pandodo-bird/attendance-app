"use client";

import { StudentSummary } from "@/lib/firestore";
import { motion } from "framer-motion";
import { TrendingUp, Users, Award, AlertTriangle } from "lucide-react";

interface ClassAnalyticsProps {
  summaries: StudentSummary[];
  todayDate?: Date;
  todayStats?: {
    present: number;
    late: number;
    absent: number;
    excused: number;
  };
  todayStatsLoading?: boolean;
}

export default function ClassAnalytics({
  summaries,
  todayDate = new Date(),
  todayStats,
  todayStatsLoading = false,
}: ClassAnalyticsProps) {
  const analytics = calculateAnalytics(summaries);

  // Format date as "March 26 Thu"
  const formatDateLabel = (date: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const month = months[date.getMonth()];
    const dayNum = date.getDate();
    const dayName = days[date.getDay()];
    return `${month} ${dayNum} ${dayName}`;
  };

  const todayLabel = formatDateLabel(todayDate);
  const metricCards = [
    {
      key: "students",
      label: "Total Students",
      value: analytics.totalStudents.toString(),
      icon: Users,
      accent: "#334155",
      tint: "#E2E8F0",
    },
    {
      key: "attendance",
      label: "Avg Attendance",
      value: `${analytics.averageAttendanceRate}%`,
      icon: TrendingUp,
      accent:
        analytics.averageAttendanceRate >= 90
          ? "#166534"
          : analytics.averageAttendanceRate >= 75
            ? "#92400E"
            : "#991B1B",
      tint:
        analytics.averageAttendanceRate >= 90
          ? "#DCFCE7"
          : analytics.averageAttendanceRate >= 75
            ? "#FEF3C7"
            : "#FEE2E2",
    },
    {
      key: "perfect",
      label: "Perfect Attendance",
      value: analytics.perfectAttendance.toString(),
      icon: Award,
      accent: "#166534",
      tint: "#DCFCE7",
    },
    {
      key: "risk",
      label: "At Risk (<75%)",
      value: analytics.atRiskStudents.toString(),
      icon: AlertTriangle,
      accent: "#991B1B",
      tint: "#FEE2E2",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;

          return (
            <motion.div
              key={metric.key}
              className="rounded-xl border px-4 py-3"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.22, ease: "easeOut" }}
              whileHover={{
                borderColor: "#CBD5E1",
                boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "#64748B" }}>
                    {metric.label}
                  </p>
                  <p className="mt-1 text-3xl font-semibold leading-none" style={{ color: "#0F172A" }}>
                    {metric.value}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: metric.tint }}
                >
                  <Icon size={18} color={metric.accent} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="rounded-xl border p-4"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.22, ease: "easeOut" }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-[15px]" style={{ color: "#0F172A" }}>
              Today&apos;s Summary
            </h3>
            <p className="text-xs mt-1" style={{ color: "#64748B" }}>
              Session totals for selected section
            </p>
          </div>
          <div
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: "#F1F5F9", color: "#1E3A5F" }}
          >
            {todayLabel}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="rounded-lg border px-3 py-2" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "#64748B" }}>
              Present
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none" style={{ color: "#166534" }}>
              {todayStatsLoading ? "-" : (todayStats?.present ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2" style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "#92400E" }}>
              Late
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none" style={{ color: "#92400E" }}>
              {todayStatsLoading ? "-" : (todayStats?.late ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2" style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA" }}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "#991B1B" }}>
              Absent
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none" style={{ color: "#991B1B" }}>
              {todayStatsLoading ? "-" : (todayStats?.absent ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2" style={{ backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "#1D4ED8" }}>
              Excused
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none" style={{ color: "#1D4ED8" }}>
              {todayStatsLoading ? "-" : (todayStats?.excused ?? 0)}
            </p>
          </div>
        </div>

        {todayStatsLoading && (
          <p className="mt-3 text-xs" style={{ color: "#64748B" }}>
            Loading today&apos;s session totals...
          </p>
        )}
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
      totalExcused: 0,
      totalDays: 0,
    };
  }

  let totalPresent = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalExcused = 0;
  let totalDays = 0;
  let perfectAttendanceCount = 0;
  let atRiskCount = 0;

  summaries.forEach((summary) => {
    // Defensive checks for undefined fields
    const present = summary.present ?? 0;
    const late = summary.late ?? 0;
    const absent = summary.absent ?? 0;
    const excused = summary.excused ?? 0;
    const summaryTotalDays = summary.totalDays ?? 0;
    const inferredTotalDays = present + late + absent + excused;
    const effectiveTotalDays = Math.max(summaryTotalDays, inferredTotalDays);

    totalPresent += present;
    totalLate += late;
    totalAbsent += absent;
    totalExcused += excused;
    totalDays += effectiveTotalDays;

    const attendanceRate = effectiveTotalDays > 0
      ? ((present + late + excused) / effectiveTotalDays) * 100
      : 0;

    if (attendanceRate === 100 && effectiveTotalDays > 0) {
      perfectAttendanceCount++;
    }

    if (attendanceRate < 75 && effectiveTotalDays > 0) {
      atRiskCount++;
    }
  });

  const averageAttendanceRate = totalDays > 0
    ? ((totalPresent + totalLate + totalExcused) / totalDays) * 100
    : 0;

  return {
    totalStudents: summaries.length,
    averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100 || 0,
    perfectAttendance: perfectAttendanceCount,
    atRiskStudents: atRiskCount,
    totalPresent,
    totalLate,
    totalAbsent,
    totalExcused,
    totalDays,
  };
}
