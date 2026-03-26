"use client";

import { StudentSummary } from "@/lib/firestore";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  hasData: boolean;
}

export default function MonthlyTrendChart({ summaries }: MonthlyTrendChartProps) {
  const monthlyData = prepareMonthlyData(summaries);
  const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"

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

  const labels = monthlyData.map((d) => {
    const monthDate = new Date(`${d.month}-01`);
    return monthDate.toLocaleDateString("en-US", { month: "short" });
  });

  const presentData = monthlyData.map((d) => (d.hasData ? d.presentPercent : null));
  const lateData = monthlyData.map((d) => (d.hasData ? d.latePercent : null));
  const absentData = monthlyData.map((d) => (d.hasData ? d.absentPercent : null));

  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "Present %",
        data: presentData,
        borderColor: "#22c55e",
        backgroundColor: "#22c55e",
        tension: 0.3,
        pointRadius: monthlyData.map((d, i) => {
          const isCurrentMonth = d.month === currentMonthKey;
          return d.hasData ? (isCurrentMonth ? 8 : 6) : 0;
        }),
        pointHoverRadius: 7,
        pointBackgroundColor: "#22c55e",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        fill: false,
        spanGaps: false,
      },
      {
        label: "Late %",
        data: lateData,
        borderColor: "#f59e0b",
        backgroundColor: "#f59e0b",
        tension: 0.3,
        pointRadius: monthlyData.map((d, i) => {
          const isCurrentMonth = d.month === currentMonthKey;
          return d.hasData ? (isCurrentMonth ? 8 : 6) : 0;
        }),
        pointHoverRadius: 7,
        pointBackgroundColor: "#f59e0b",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        fill: false,
        spanGaps: false,
      },
      {
        label: "Absent %",
        data: absentData,
        borderColor: "#ef4444",
        backgroundColor: "#ef4444",
        tension: 0.3,
        pointRadius: monthlyData.map((d, i) => {
          const isCurrentMonth = d.month === currentMonthKey;
          return d.hasData ? (isCurrentMonth ? 8 : 6) : 0;
        }),
        pointHoverRadius: 7,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        fill: false,
        spanGaps: false,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
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
        titleFont: {
          size: 14,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 13,
          weight: "normal" as const,
        },
        callbacks: {
          title: (tooltipItems: TooltipItem<"line">[]) => {
            const index = tooltipItems[0].dataIndex;
            const monthDate = new Date(`${monthlyData[index].month}-01`);
            return monthDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });
          },
          label: (context: TooltipItem<"line">) => {
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
        grid: {
          display: false,
        },
        ticks: {
          color: "#6B7280",
          font: {
            size: 12,
            weight: "bold" as const,
          },
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: "#F3F4F6",
        },
        ticks: {
          color: "#9CA3AF",
          font: {
            size: 12,
            weight: "bold" as const,
          },
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

      {/* Chart Container */}
      <div className="h-80 w-full">
        <Line data={data} options={options} />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t" style={{ borderColor: "#F3F4F6" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#22c55e" }}
          />
          <span className="text-sm" style={{ color: "#6B7280" }}>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#f59e0b" }}
          />
          <span className="text-sm" style={{ color: "#6B7280" }}>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "#ef4444" }}
          />
          <span className="text-sm" style={{ color: "#6B7280" }}>Absent</span>
        </div>
      </div>
    </motion.div>
  );
}

function prepareMonthlyData(summaries: StudentSummary[]): MonthlyData[] {
  const monthMap = new Map<string, { present: number; late: number; absent: number }>();

  // Aggregate all months from all students
  summaries.forEach((summary) => {
    Object.entries(summary.trend).forEach(([month, data]) => {
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

  if (monthMap.size === 0) {
    return [];
  }

  // Get all months with data, sorted
  const monthsWithData = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      present: data.present,
      late: data.late,
      absent: data.absent,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Determine school year range (June to March)
  const firstMonth = monthsWithData[0].month;
  const lastMonth = monthsWithData[monthsWithData.length - 1].month;

  // Generate all months in range (including gaps)
  const allMonths: MonthlyData[] = [];
  let currentDate = new Date(`${firstMonth}-01`);
  const endDate = new Date(`${lastMonth}-01`);

  while (currentDate <= endDate) {
    const monthKey = currentDate.toISOString().slice(0, 7);
    const monthData = monthsWithData.find((m) => m.month === monthKey);

    if (monthData) {
      const total = monthData.present + monthData.late + monthData.absent;
      allMonths.push({
        month: monthKey,
        presentPercent: total > 0 ? (monthData.present / total) * 100 : 0,
        latePercent: total > 0 ? (monthData.late / total) * 100 : 0,
        absentPercent: total > 0 ? (monthData.absent / total) * 100 : 0,
        hasData: true,
      });
    } else {
      allMonths.push({
        month: monthKey,
        presentPercent: 0,
        latePercent: 0,
        absentPercent: 0,
        hasData: false,
      });
    }

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return allMonths;
}
