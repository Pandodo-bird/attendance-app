"use client";

import { Calendar, PlayCircle, Edit2 } from "lucide-react";

interface AttendanceHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  hasSessionToday: boolean;
  sessionSubmitted: boolean;
  isEditing: boolean;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  allowCorrections: boolean;
  onStartSession: () => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnableEditing: () => void;
}

export default function AttendanceHeader({
  selectedDate,
  onDateChange,
  hasSessionToday,
  sessionSubmitted,
  isEditing,
  allowCorrections,
  onStartSession,
  onEnableEditing,
}: AttendanceHeaderProps) {
  const isToday = (date: string) => {
    const today = new Date().toISOString().split("T")[0];
    return date === today;
  };

  const formatDateDisplay = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className="rounded-2xl p-6 mb-6"
      style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Date Selection */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              disabled={hasSessionToday || sessionSubmitted}
              className="pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#F9FAFB",
                borderColor: "#E5E7EB",
                color: "#1F1F1F",
              }}
            />
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "#9CA3AF" }}
            />
          </div>
          <div className="text-sm" style={{ color: "#6B7280" }}>
            {formatDateDisplay(selectedDate)}
            {isToday(selectedDate) && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "#DBEAFE", color: "#1E40AF" }}
              >
                Today
              </span>
            )}
          </div>
        </div>

        {/* Session Status & Actions */}
        <div className="flex items-center gap-3">
          {!hasSessionToday && !sessionSubmitted ? (
            <button
              onClick={onStartSession}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              style={{ backgroundColor: "#1e3a5f", color: "#FFFFFF" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#16304a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#1e3a5f";
              }}
            >
              <PlayCircle className="w-4 h-4" />
              Start Session
            </button>
          ) : sessionSubmitted && !isEditing ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: "#D1FAE5" }}>
              <span className="text-sm font-semibold" style={{ color: "#065F46" }}>
                Session Completed
              </span>
            </div>
          ) : isEditing ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: "#FEF3C7" }}>
              <Edit2 className="w-4 h-4" style={{ color: "#92400E" }} />
              <span className="text-sm font-semibold" style={{ color: "#92400E" }}>
                Editing Mode
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
