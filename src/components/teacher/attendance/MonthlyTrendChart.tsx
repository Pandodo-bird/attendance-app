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
import { Bar } from "react-chartjs-2";

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
        className="rounded-xl p-8 border text-center"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
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

  const data: ChartData<"bar"> = {
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

  const options: ChartOptions<"bar"> = {
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
          title: (tooltipItems: TooltipItem<"bar">[]) => {
            const index = tooltipItems[0].dataIndex;
            return new Date(`${monthlyData[index].month}-01`).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });
          },
          label: (context: TooltipItem<"bar">) => {
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
      className="rounded-xl p-6 border shadow-sm"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.25, ease: "easeOut" }}
    >
      <h3 className="font-semibold text-base mb-6" style={{ color: "#1F1F1F" }}>
        Monthly Attendance Trend
      </h3>

      <div
        className="rounded-lg border p-4 mb-6"
        style={{ backgroundColor: "#FAFAFA", borderColor: "#E5E7EB" }}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs md:text-sm font-medium" style={{ color: "#6B7280" }}>
              Attendance Rate
            </p>
            <p className="text-2xl md:text-3xl font-bold" style={{ color: "#1e3a5f" }}>
              {latestMonthData.attendanceRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium" style={{ color: "#6B7280" }}>
              Present
            </p>
            <p className="text-2xl md:text-3xl font-bold" style={{ color: "#16A34A" }}>
              {latestMonthData.presentPercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium" style={{ color: "#6B7280" }}>
              Late
            </p>
            <p className="text-2xl md:text-3xl font-bold" style={{ color: "#CA8A04" }}>
              {latestMonthData.latePercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium" style={{ color: "#6B7280" }}>
              Absent
            </p>
            <p className="text-2xl md:text-3xl font-bold" style={{ color: "#DC2626" }}>
              {latestMonthData.absentPercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm font-medium" style={{ color: "#6B7280" }}>
              Excused
            </p>
            <p className="text-2xl md:text-3xl font-bold" style={{ color: "#2563EB" }}>
              {latestMonthData.excusedPercent.toFixed(1)}%
            </p>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: "#9CA3AF" }}>
          Showing percentages for {latestMonthLabel}
        </p>
      </div>

      <div className="h-80 w-full">
        <Bar data={data} options={options} />
      </div>

      <div className="flex items-center justify-center gap-6 pt-4 border-t" style={{ borderColor: "#F3F4F6" }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#22c55e" }} />
          <span className="text-sm" style={{ color: "#6B7280" }}>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f59e0b" }} />
          <span className="text-sm" style={{ color: "#6B7280" }}>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }} />
          <span className="text-sm" style={{ color: "#6B7280" }}>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#60a5fa" }} />
          <span className="text-sm" style={{ color: "#6B7280" }}>Excused</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#1e3a5f" }} />
          <span className="text-sm" style={{ color: "#6B7280" }}>Attendance Rate</span>
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
