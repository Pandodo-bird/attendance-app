"use client";

import { Calendar, PlayCircle, Edit2, RefreshCw } from "lucide-react";

interface AttendanceHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  hasSessionToday: boolean;
  sessionSubmitted: boolean;
  isEditing: boolean;
  onStartSession: () => void;
  startDisabled?: boolean;
  completedLabel?: string;
  syncLabel?: string;
  canSync?: boolean;
  onSyncNow?: () => void;
  syncDisabled?: boolean;
  isSyncing?: boolean;
}

function formatLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AttendanceHeader({
  selectedDate,
  onDateChange,
  hasSessionToday,
  sessionSubmitted,
  isEditing,
  onStartSession,
  startDisabled = false,
  completedLabel = "Saved",
  syncLabel,
  canSync = false,
  onSyncNow,
  syncDisabled = false,
  isSyncing = false,
}: AttendanceHeaderProps) {
  const isToday = (date: string) => {
    const today = formatLocalDateInputValue(new Date());
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
      className="rounded-xl p-3 sm:p-4 mb-4 border"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              disabled={isEditing}
              className="w-full sm:w-auto pl-9 pr-3 py-2 rounded-lg text-sm font-medium border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#F9FAFB",
                borderColor: "#E5E7EB",
                color: "#1F1F1F",
              }}
            />
            <Calendar
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "#9CA3AF" }}
            />
          </div>
          <div className="text-xs sm:text-sm flex items-center gap-2" style={{ color: "#6B7280" }}>
            <span>{formatDateDisplay(selectedDate)}</span>
            {isToday(selectedDate) && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                style={{ backgroundColor: "#DBEAFE", color: "#1E40AF" }}
              >
                Today
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          {syncLabel && (
            <div
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg"
              style={{ backgroundColor: "#EFF6FF" }}
            >
              <span className="text-sm font-semibold" style={{ color: "#1D4ED8" }}>
                {syncLabel}
              </span>
            </div>
          )}

          {canSync && onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={syncDisabled}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#FFFFFF", color: "#1e3a5f", border: "1px solid #E5E7EB" }}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              Sync now
            </button>
          )}

          {!hasSessionToday && !sessionSubmitted ? (
            <button
              onClick={onStartSession}
              disabled={startDisabled}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#1e3a5f", color: "#FFFFFF" }}
            >
              <PlayCircle className="w-4 h-4" />
              Start Session
            </button>
          ) : sessionSubmitted && !isEditing ? (
            <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#D1FAE5" }}>
              <span className="text-sm font-semibold" style={{ color: "#065F46" }}>
                {completedLabel}
              </span>
            </div>
          ) : isEditing ? (
            <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#FEF3C7" }}>
              <Edit2 className="w-3.5 h-3.5" style={{ color: "#92400E" }} />
              <span className="text-sm font-semibold" style={{ color: "#92400E" }}>
                Editing
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
