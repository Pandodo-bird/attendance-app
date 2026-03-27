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
      className="rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      style={{ backgroundColor: "#F8FAFC", border: "0.5px solid #E2E8F0" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color: "#475569" }}>
          Bulk Actions:
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
        <button
          onClick={onMarkAllPresent}
          disabled={disabled || allPresent}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: allPresent ? "#E2E8F0" : "#10B981",
            color: allPresent ? "#94A3B8" : "#FFFFFF",
          }}
          onMouseEnter={(e) => {
            if (!allPresent && !disabled) {
              e.currentTarget.style.backgroundColor = "#059669";
            }
          }}
          onMouseLeave={(e) => {
            if (!allPresent && !disabled) {
              e.currentTarget.style.backgroundColor = "#10B981";
            }
          }}
        >
          <CheckCircle className="w-4 h-4" />
          Mark All Present
        </button>
        <button
          onClick={onClearAll}
          disabled={disabled || !allMarked}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: !allMarked || disabled ? "#E2E8F0" : "#F3F4F6",
            color: !allMarked || disabled ? "#94A3B8" : "#6B7280",
          }}
          onMouseEnter={(e) => {
            if (allMarked && !disabled) {
              e.currentTarget.style.backgroundColor = "#E5E7EB";
            }
          }}
          onMouseLeave={(e) => {
            if (allMarked && !disabled) {
              e.currentTarget.style.backgroundColor = "#F3F4F6";
            }
          }}
        >
          <XCircle className="w-4 h-4" />
          Clear All
        </button>
      </div>
    </div>
  );
}
