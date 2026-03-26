"use client";

import { StudentSummary } from "@/lib/firestore";
import { motion } from "framer-motion";

interface MonthlyTrendChartProps {
  summaries: StudentSummary[];
}

export default function MonthlyTrendChart({ summaries }: MonthlyTrendChartProps) {
  const trends = aggregateMonthlyTrends(summaries);

  if (trends.length === 0) {
    return (
      <div
        className="rounded-xl p-8 border text-center"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
      >
        <p style={{ color: "#9CA3AF" }}>No attendance data recorded yet</p>
      </div>
    );
  }

  // Find max value for scaling
  const maxValue = Math.max(
    ...trends.map((t) => t.present + t.late + t.absent)
  );

  return (
    <motion.div
      className="rounded-xl p-6 border"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.25, ease: "easeOut" }}
    >
      <h3 className="font-semibold text-base mb-6" style={{ color: "#1F1F1F" }}>
        Monthly Attendance Trend
      </h3>

      {/* Chart */}
      <div className="flex items-end gap-3 h-48 mb-4 overflow-x-auto">
        {trends.map((trend) => {
          const total = trend.present + trend.late + trend.absent;
          const heightPercent = maxValue > 0 ? (total / maxValue) * 100 : 0;

          const monthLabel = new Date(`${trend.month}-01`).toLocaleDateString(
            "en-US",
            {
              month: "short",
              year: "numeric",
            }
          );

          return (
            <div
              key={trend.month}
              className="flex-1 min-w-[60px] flex flex-col items-center gap-2"
            >
              {/* Tooltip */}
              <div className="opacity-0 hover:opacity-100 transition-opacity absolute z-10 mb-20 pointer-events-none">
                <div
                  className="rounded-lg p-2 text-xs shadow-lg"
                  style={{ backgroundColor: "#1F1F1F", color: "#FFFFFF" }}
                >
                  <div className="font-semibold mb-1">{monthLabel}</div>
                  <div style={{ color: "#86EFAC" }}>Present: {trend.present}</div>
                  <div style={{ color: "#FDE047" }}>Late: {trend.late}</div>
                  <div style={{ color: "#FCA5A5" }}>Absent: {trend.absent}</div>
                  <div style={{ color: "#93C5FD" }}>Rate: {trend.attendanceRate}%</div>
                </div>
              </div>

              {/* Stacked Bar - using flexbox for proper proportional heights */}
              <div
                className="w-full rounded-t-lg overflow-hidden flex flex-col-reverse"
                style={{ 
                  height: `${Math.max(heightPercent * 1.92, 8)}px`,
                  minHeight: '8px'
                }}
              >
                {/* Present (bottom - green) */}
                <div
                  style={{
                    flex: trend.present || 1,
                    backgroundColor: trend.present > 0 ? "#16A34A" : "transparent",
                    minHeight: trend.present > 0 ? '4px' : '0'
                  }}
                  className="transition-all duration-300"
                />
                {/* Late (middle - yellow) */}
                <div
                  style={{
                    flex: trend.late || 0,
                    backgroundColor: trend.late > 0 ? "#CA8A04" : "transparent",
                    minHeight: trend.late > 0 ? '4px' : '0'
                  }}
                  className="transition-all duration-300"
                />
                {/* Absent (top - red) */}
                <div
                  style={{
                    flex: trend.absent || 0,
                    backgroundColor: trend.absent > 0 ? "#DC2626" : "transparent",
                    minHeight: trend.absent > 0 ? '4px' : '0'
                  }}
                  className="transition-all duration-300"
                />
              </div>

              {/* X-axis label */}
              <div className="text-xs text-center" style={{ color: "#6B7280" }}>
                {monthLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t" style={{ borderColor: "#F3F4F6" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#16A34A" }}
          />
          <span className="text-sm" style={{ color: "#6B7280" }}>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#CA8A04" }}
          />
          <span className="text-sm" style={{ color: "#6B7280" }}>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#DC2626" }}
          />
          <span className="text-sm" style={{ color: "#6B7280" }}>Absent</span>
        </div>
      </div>
    </motion.div>
  );
}

// Inline aggregation function (can also import from firestore.ts)
function aggregateMonthlyTrends(
  summaries: StudentSummary[]
): Array<{
  month: string;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
}> {
  const monthMap = new Map<string, { present: number; late: number; absent: number }>();

  // Aggregate all months from all students
  summaries.forEach((summary) => {
    Object.entries(summary.trend).forEach(([month, data]) => {
      // Defensive checks for undefined fields
      const present = data.present ?? 0;
      const late = data.late ?? 0;
      const absent = data.absent ?? 0;
      
      const existing = monthMap.get(month) || { present: 0, late: 0, absent: 0 };
      monthMap.set(month, {
        present: existing.present + present,
        late: existing.late + late,
        absent: existing.absent + absent,
      });
    });
  });

  // Convert to array and sort by month
  const trends = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      present: data.present,
      late: data.late,
      absent: data.absent,
      attendanceRate: data.present + data.late + data.absent > 0
        ? Math.round(((data.present + data.late) / (data.present + data.late + data.absent)) * 100 * 100) / 100
        : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return trends;
}
