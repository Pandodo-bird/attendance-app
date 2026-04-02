"use client";

import { motion } from "framer-motion";
import { PendingOverridePayload } from "@/components/teacher/secretary-records";

interface OverrideConfirmModalProps {
  pendingOverride: PendingOverridePayload;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatDate(dateString: string): string {
  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateString;
  }

  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusStyles(status: "present" | "late" | "absent" | "excused"): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  switch (status) {
    case "present":
      return { backgroundColor: "#DCFCE7", color: "#166534", borderColor: "#86EFAC" };
    case "late":
      return { backgroundColor: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D" };
    case "absent":
      return { backgroundColor: "#FEE2E2", color: "#B91C1C", borderColor: "#FCA5A5" };
    case "excused":
      return { backgroundColor: "#DBEAFE", color: "#1D4ED8", borderColor: "#93C5FD" };
  }
}

function formatStatusLabel(status: "present" | "late" | "absent" | "excused"): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function OverrideConfirmModal({
  pendingOverride,
  isSaving,
  onConfirm,
  onCancel,
}: OverrideConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 px-4">
      <motion.div
        className="w-full max-w-[560px] rounded-2xl border p-5 shadow-xl"
        style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
      >
        <p className="text-xl font-bold leading-tight" style={{ color: "#0F172A" }}>
          Confirm attendance change
        </p>
        <p className="mt-1.5 text-sm" style={{ color: "#475569" }}>
          You are changing this student&apos;s attendance for {formatDate(pendingOverride.session.date)}.
        </p>

        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "#DDE5EE", backgroundColor: "#F8FAFC" }}>
          <p className="text-xl font-black uppercase tracking-tight leading-tight" style={{ color: "#0F172A" }}>
            {pendingOverride.studentName}
          </p>
          <p className="mt-1.5 text-sm" style={{ color: "#475569" }}>
            {pendingOverride.lrn} • {pendingOverride.session.sectionLabel}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: "#E2E8F0", backgroundColor: "#FFFFFF" }}>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#64748B" }}>
                Current
              </p>
              <div className="mt-1.5">
                <span
                  className="inline-flex min-w-[120px] items-center justify-center rounded-lg border px-3 py-2 text-sm font-extrabold uppercase tracking-wide"
                  style={getStatusStyles(pendingOverride.currentStatus)}
                >
                  {formatStatusLabel(pendingOverride.currentStatus)}
                </span>
              </div>
            </div>
            <div
              className="hidden sm:flex items-center justify-center px-2 text-xl font-bold"
              style={{ color: "#64748B" }}
              aria-hidden="true"
            >
              →
            </div>
            <div
              className="rounded-lg border px-3 py-2"
              style={{
                borderColor: "#A5B4FC",
                backgroundColor: "#EEF2FF",
                borderLeft: "4px solid #3730A3",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#3730A3" }}>
                New Status
              </p>
              <div className="mt-1.5">
                <span
                  className="inline-flex min-w-[120px] items-center justify-center rounded-lg border px-3 py-2 text-sm font-extrabold uppercase tracking-wide"
                  style={getStatusStyles(pendingOverride.nextStatus)}
                >
                  {formatStatusLabel(pendingOverride.nextStatus)}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>
            Please confirm this override before saving.
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: "#F3F4F6", color: "#374151" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF" }}
          >
            {isSaving ? "Saving..." : "Confirm Change"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
