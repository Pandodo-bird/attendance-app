"use client";

import { StudentSummary } from "@/lib/firestore";
import { motion } from "framer-motion";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  TooltipItem,
} from "chart.js";
import { Chart } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyTrendChartProps {
  summaries: StudentSummary[];
}

interface MonthlyData {
  month: string;
  presentPercent: number;
  latePercent: number;
  absentPercent: number;
  excusedPercent: number;
  attendanceRate: number;
}

export default function MonthlyTrendChart({ summaries }: MonthlyTrendChartProps) {
  const monthlyData = prepareMonthlyData(summaries);

  if (monthlyData.length === 0) {
    return (
      <div
        className="rounded-xl p-6 border text-center"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
      >
        <p style={{ color: "#9CA3AF" }}>No attendance data recorded yet</p>
      </div>
    );
  }

  const labels = monthlyData.map((dataPoint) =>
    new Date(`${dataPoint.month}-01`).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
  );
  const latestMonthData = monthlyData[monthlyData.length - 1];
  const latestMonthLabel = new Date(`${latestMonthData.month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const data: ChartData<"bar" | "line"> = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Present %",
        data: monthlyData.map((dataPoint) => dataPoint.presentPercent),
        backgroundColor: "#22c55e",
        stack: "attendancePct",
        borderRadius: 4,
      },
      {
        type: "bar",
        label: "Late %",
        data: monthlyData.map((dataPoint) => dataPoint.latePercent),
        backgroundColor: "#f59e0b",
        stack: "attendancePct",
        borderRadius: 4,
      },
      {
        type: "bar",
        label: "Absent %",
        data: monthlyData.map((dataPoint) => dataPoint.absentPercent),
        backgroundColor: "#ef4444",
        stack: "attendancePct",
        borderRadius: 4,
      },
      {
        type: "bar",
        label: "Excused %",
        data: monthlyData.map((dataPoint) => dataPoint.excusedPercent),
        backgroundColor: "#60a5fa",
        stack: "attendancePct",
        borderRadius: 4,
      },
      {
        type: "line",
        label: "Attendance Rate",
        data: monthlyData.map((dataPoint) => dataPoint.attendanceRate),
        borderColor: "#1e3a5f",
        backgroundColor: "#1e3a5f",
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const options: ChartOptions<"bar" | "line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1F1F1F",
        titleColor: "#FFFFFF",
        bodyColor: "#FFFFFF",
        borderColor: "#374151",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (tooltipItems: TooltipItem<"bar" | "line">[]) => {
            const index = tooltipItems[0].dataIndex;
            return new Date(`${monthlyData[index].month}-01`).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });
          },
          label: (context: TooltipItem<"bar" | "line">) => {
            const value = context.parsed.y;
            const label = context.dataset.label;
            if (value === null || value === undefined) return "";
            return `${label}: ${value.toFixed(1)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: "#6B7280",
          font: { size: 12, weight: "bold" as const },
        },
      },
      y: {
        stacked: true,
        min: 0,
        max: 100,
        grid: { color: "#F3F4F6" },
        ticks: {
          color: "#9CA3AF",
          font: { size: 12, weight: "bold" as const },
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  return (
    <motion.div
      className="rounded-xl border p-4 md:p-5"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h3 className="font-semibold text-[15px]" style={{ color: "#0F172A" }}>
          Monthly Attendance Trend
        </h3>
        <p className="text-xs" style={{ color: "#64748B" }}>
          Showing percentages for {latestMonthLabel}
        </p>
      </div>

      <div
        className="rounded-lg border px-3 py-3 mt-3 mb-4"
        style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "#64748B" }}>
              Attendance Rate
            </p>
            <p className="text-xl md:text-2xl font-semibold" style={{ color: "#1E3A5F" }}>
              {latestMonthData.attendanceRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "#64748B" }}>
              Present
            </p>
            <p className="text-xl md:text-2xl font-semibold" style={{ color: "#166534" }}>
              {latestMonthData.presentPercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "#64748B" }}>
              Late
            </p>
            <p className="text-xl md:text-2xl font-semibold" style={{ color: "#92400E" }}>
              {latestMonthData.latePercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "#64748B" }}>
              Absent
            </p>
            <p className="text-xl md:text-2xl font-semibold" style={{ color: "#991B1B" }}>
              {latestMonthData.absentPercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: "#64748B" }}>
              Excused
            </p>
            <p className="text-xl md:text-2xl font-semibold" style={{ color: "#1D4ED8" }}>
              {latestMonthData.excusedPercent.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="h-72 md:h-80 w-full">
        <Chart type="bar" data={data} options={options} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-3 mt-3 border-t" style={{ borderColor: "#E2E8F0" }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
          <span className="text-xs font-medium" style={{ color: "#64748B" }}>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#f59e0b" }} />
          <span className="text-xs font-medium" style={{ color: "#64748B" }}>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#ef4444" }} />
          <span className="text-xs font-medium" style={{ color: "#64748B" }}>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#60a5fa" }} />
          <span className="text-xs font-medium" style={{ color: "#64748B" }}>Excused</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#1e3a5f" }} />
          <span className="text-xs font-medium" style={{ color: "#64748B" }}>Attendance Rate</span>
        </div>
      </div>
    </motion.div>
  );
}

function prepareMonthlyData(summaries: StudentSummary[]): MonthlyData[] {
  const monthMap = new Map<string, { present: number; late: number; absent: number; excused: number }>();
  const overallTotals = { present: 0, late: 0, absent: 0, excused: 0 };

  summaries.forEach((summary) => {
    if (!summary) return;
    overallTotals.present += summary.present ?? 0;
    overallTotals.late += summary.late ?? 0;
    overallTotals.absent += summary.absent ?? 0;
    overallTotals.excused += summary.excused ?? 0;

    const monthlyTrend = summary.trend ?? {};
    Object.entries(monthlyTrend).forEach(([month, trend]) => {
      if (!trend) return;
      const existing = monthMap.get(month) ?? { present: 0, late: 0, absent: 0, excused: 0 };
      monthMap.set(month, {
        present: existing.present + (trend.present ?? 0),
        late: existing.late + (trend.late ?? 0),
        absent: existing.absent + (trend.absent ?? 0),
        excused: existing.excused + (trend.excused ?? 0),
      });
    });
  });

  if (monthMap.size === 0) {
    const hasAnyTotals =
      overallTotals.present > 0 ||
      overallTotals.late > 0 ||
      overallTotals.absent > 0 ||
      overallTotals.excused > 0;

    if (hasAnyTotals) {
      const currentMonthKey = new Date().toISOString().slice(0, 7);
      monthMap.set(currentMonthKey, {
        present: overallTotals.present,
        late: overallTotals.late,
        absent: overallTotals.absent,
        excused: overallTotals.excused,
      });
    }
  } else {
    const monthlyTotals = Array.from(monthMap.values()).reduce(
      (acc, values) => ({
        present: acc.present + values.present,
        late: acc.late + values.late,
        absent: acc.absent + values.absent,
        excused: acc.excused + values.excused,
      }),
      { present: 0, late: 0, absent: 0, excused: 0 }
    );

    const presentDelta = Math.max(0, overallTotals.present - monthlyTotals.present);
    const lateDelta = Math.max(0, overallTotals.late - monthlyTotals.late);
    const absentDelta = Math.max(0, overallTotals.absent - monthlyTotals.absent);
    const excusedDelta = Math.max(0, overallTotals.excused - monthlyTotals.excused);

    if (presentDelta || lateDelta || absentDelta || excusedDelta) {
      const latestMonth = Array.from(monthMap.keys()).sort().at(-1);
      if (latestMonth) {
        const latest = monthMap.get(latestMonth) ?? { present: 0, late: 0, absent: 0, excused: 0 };
        monthMap.set(latestMonth, {
          present: latest.present + presentDelta,
          late: latest.late + lateDelta,
          absent: latest.absent + absentDelta,
          excused: latest.excused + excusedDelta,
        });
      }
    }
  }

  return Array.from(monthMap.entries())
    .map(([month, values]) => {
      const total = values.present + values.late + values.absent + values.excused;
      return {
        month,
        presentPercent: total > 0 ? (values.present / total) * 100 : 0,
        latePercent: total > 0 ? (values.late / total) * 100 : 0,
        absentPercent: total > 0 ? (values.absent / total) * 100 : 0,
        excusedPercent: total > 0 ? (values.excused / total) * 100 : 0,
        attendanceRate: total > 0 ? ((values.present + values.late + values.excused) / total) * 100 : 0,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}
