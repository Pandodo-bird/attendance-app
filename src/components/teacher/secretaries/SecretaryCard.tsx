"use client";

import { motion } from "framer-motion";

interface SecretaryCardProps {
  secretaryUid: string;
  secretaryLrn: string;
  secretaryName: string;
  secretaryEmail: string;
  sectionId: string;
  sectionName: string;
  gradeLevel: string;
  schoolYear: string;
  status: "active" | "removed";
  appointedAt: Date | string | { toDate: () => Date };
  lastActive?: string;
  onViewRecords?: () => void;
  onTakeAttendance?: () => void;
  todaySessionStatus?: "none" | "open" | "locked";
  index?: number;
  viewRecordsOnly?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(lrn: string): string {
  let hash = 0;
  for (let i = 0; i < lrn.length; i++) {
    hash = lrn.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Shift toward slate/navy for more institutional feel
  const hue = 200 + (Math.abs(hash) % 50);
  return `hsl(${hue}, 35%, 82%)`;
}

function getAvatarTextColor(lrn: string): string {
  let hash = 0;
  for (let i = 0; i < lrn.length; i++) {
    hash = lrn.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Shift toward slate/navy for more institutional feel
  const hue = 200 + (Math.abs(hash) % 50);
  return `hsl(${hue}, 45%, 30%)`;
}

function toTitleCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(date: Date | string | { toDate: () => Date }): string {
  let d: Date;
  if (typeof date === "string") {
    d = new Date(date);
  } else if ("toDate" in date) {
    d = date.toDate();
  } else {
    d = date;
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SecretaryCard({
  secretaryLrn,
  secretaryName,
  sectionName,
  schoolYear,
  status,
  appointedAt,
  onViewRecords,
  onTakeAttendance,
  todaySessionStatus = "none",
  index = 0,
  viewRecordsOnly = false,
}: SecretaryCardProps) {
  const initials = getInitials(secretaryName);
  const avatarBg = getAvatarColor(secretaryLrn);
  const avatarText = getAvatarTextColor(secretaryLrn);
  const isCardClickable = status === "active" && Boolean(onViewRecords);

  return (
    <motion.div
      className="rounded-2xl"
      style={{
        backgroundColor: "#F8FBFF",
        border: "0.5px solid #D7E2EF",
        opacity: status === "removed" ? 0.7 : 1,
        filter: status === "removed" ? "grayscale(0.3)" : "none",
      }}
      whileHover={status === "active" ? {
        borderColor: "#D1D5DB",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      } : undefined}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: status === "removed" ? 0.7 : 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
      onClick={isCardClickable ? onViewRecords : undefined}
      role={isCardClickable ? "button" : undefined}
      tabIndex={isCardClickable ? 0 : undefined}
      onKeyDown={isCardClickable ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onViewRecords?.();
        }
      } : undefined}
    >
      <div className="p-5" style={{ cursor: isCardClickable ? "pointer" : "default" }}>
        {/* Header: Avatar + Status */}
        <div className="flex justify-between items-start mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base"
            style={{ backgroundColor: avatarBg, color: avatarText }}
          >
            {initials}
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: status === "active" ? "#D1FAE5" : "#FEE2E2",
              color: status === "active" ? "#065F46" : "#991B1B",
            }}
          >
            {status === "active" ? "Active" : "Removed"}
          </span>
        </div>

        {/* Name and LRN */}
        <div className="mb-4">
          <h3 className="text-base font-semibold mb-0.5" style={{ color: "#1F1F1F" }}>
            {toTitleCase(secretaryName)}
          </h3>
          <p className="font-mono text-xs font-medium" style={{ color: "#6B7280" }}>
            {secretaryLrn}
          </p>
        </div>

        {/* Info Grid - 2 columns */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: "#9CA3AF" }}>
              calendar_today
            </span>
            <div>
              <span className="text-[10px] uppercase tracking-wide font-medium block" style={{ color: "#9CA3AF" }}>
                Section
              </span>
              <span className="text-sm font-medium" style={{ color: "#374151" }}>
                {sectionName}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: "#9CA3AF" }}>
              badge
            </span>
            <div>
              <span className="text-[10px] uppercase tracking-wide font-medium block" style={{ color: "#9CA3AF" }}>
                Access
              </span>
              <span className="text-sm font-medium" style={{ color: "#374151" }}>
                Section Attendance
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: "#9CA3AF" }}>
              schedule
            </span>
            <div>
              <span className="text-[10px] uppercase tracking-wide font-medium block" style={{ color: "#9CA3AF" }}>
                School Year
              </span>
              <span className="text-sm font-medium" style={{ color: "#374151" }}>
                {schoolYear}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: "#9CA3AF" }}>
              access_time
            </span>
            <div>
              <span className="text-[10px] uppercase tracking-wide font-medium block" style={{ color: "#9CA3AF" }}>
                Appointed
              </span>
              <span className="text-sm font-medium" style={{ color: "#374151" }}>
                {formatDate(appointedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="h-px mx-5"
        style={{ backgroundColor: "#E5E7EB" }}
      />

      <div className="flex p-2">
        {viewRecordsOnly ? (
          <button
            className="w-full py-2.5 text-sm font-medium transition-colors"
            style={{ color: "#374151" }}
            onClick={onViewRecords}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#6C5CE7";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#374151";
            }}
            title="View attendance records for this secretary"
          >
            View Records
          </button>
        ) : (
          <>
            {onTakeAttendance && (
              <button
                className="w-full py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: todaySessionStatus === "locked" ? "#065F46" : "#374151" }}
                onClick={(event) => {
                  event.stopPropagation();
                  onTakeAttendance();
                }}
                disabled={todaySessionStatus === "locked"}
                onMouseEnter={(e) => {
                  if (todaySessionStatus !== "locked") {
                    e.currentTarget.style.color = "#6C5CE7";
                  }
                }}
                onMouseLeave={(e) => {
                  if (todaySessionStatus !== "locked") {
                    e.currentTarget.style.color = "#374151";
                  }
                }}
                title={todaySessionStatus === "locked" ? "Session already submitted for today" : "Open teacher attendance for today"}
              >
                {todaySessionStatus === "open"
                  ? "Continue Session"
                  : todaySessionStatus === "locked"
                  ? "Session Submitted"
                  : "Take Attendance"}
              </button>
            )}
            {!onTakeAttendance && (
              <div className="w-full py-2.5 text-sm font-medium text-center" style={{ color: "#1E3A5F" }}>
                View Records
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
