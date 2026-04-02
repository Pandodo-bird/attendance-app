"use client";

import { CheckCircle, XCircle } from "lucide-react";

interface BulkAttendanceActionsProps {
  onMarkAllPresent: () => void;
  onClearAll: () => void;
  allPresent: boolean;
  allMarked: boolean;
  disabled?: boolean;
}

export default function BulkAttendanceActions({
  onMarkAllPresent,
  onClearAll,
  allPresent,
  allMarked,
  disabled = false,
}: BulkAttendanceActionsProps) {
  return (
    <div
      className="rounded-xl p-3 mb-4 border"
      style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: "#475569" }}>
          Bulk Actions
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllPresent}
            disabled={disabled || allPresent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: allPresent ? "#E2E8F0" : "#10B981",
              color: allPresent ? "#94A3B8" : "#FFFFFF",
            }}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mark All Present</span>
            <span className="sm:hidden">All Present</span>
          </button>
          <button
            onClick={onClearAll}
            disabled={disabled || !allMarked}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: !allMarked || disabled ? "#E2E8F0" : "#F3F4F6",
              color: !allMarked || disabled ? "#94A3B8" : "#6B7280",
            }}
          >
            <XCircle className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
