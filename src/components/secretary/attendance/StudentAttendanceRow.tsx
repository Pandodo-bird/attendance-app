"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, XCircle } from "lucide-react";

type AttendanceStatus = "present" | "late" | "absent";

interface StudentAttendanceRowProps {
  lrn: string;
  studentName: string;
  status: AttendanceStatus | null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  remarks: string;
  index: number;
  isEditable: boolean;
  onStatusChange: (lrn: string, status: AttendanceStatus, remarks?: string) => void;
}

export default function StudentAttendanceRow({
  lrn,
  studentName,
  status,
  remarks,
  index,
  isEditable,
  onStatusChange,
}: StudentAttendanceRowProps) {
  const getStatusColor = (s: AttendanceStatus) => {
    switch (s) {
      case "present":
        return { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" };
      case "late":
        return { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" };
      case "absent":
        return { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" };
    }
  };

  const getStatusIcon = (s: AttendanceStatus) => {
    switch (s) {
      case "present":
        return <CheckCircle className="w-4 h-4" />;
      case "late":
        return <Clock className="w-4 h-4" />;
      case "absent":
        return <XCircle className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      className="grid grid-cols-12 gap-4 px-6 py-4 items-center"
      style={{ backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F9FAFB" }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      {/* Student Name */}
      <div className="col-span-5">
        <p className="text-sm font-medium" style={{ color: "#1F1F1F" }}>
          {studentName}
        </p>
      </div>

      {/* LRN */}
      <div className="col-span-3 text-center">
        <p className="font-mono text-xs" style={{ color: "#6B7280" }}>
          {lrn}
        </p>
      </div>

      {/* Attendance Buttons */}
      <div className="col-span-4 flex items-center justify-center gap-2">
        {isEditable ? (
          <>
            {/* Present */}
            <button
              onClick={() => onStatusChange(lrn, "present")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                status === "present" ? "shadow-sm" : ""
              }`}
              style={{
                backgroundColor: status === "present" ? "#10B981" : "#F3F4F6",
                color: status === "present" ? "#FFFFFF" : "#6B7280",
              }}
              onMouseEnter={(e) => {
                if (status !== "present") {
                  e.currentTarget.style.backgroundColor = "#E5E7EB";
                }
              }}
              onMouseLeave={(e) => {
                if (status !== "present") {
                  e.currentTarget.style.backgroundColor = "#F3F4F6";
                }
              }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Present
            </button>

            {/* Late */}
            <button
              onClick={() => onStatusChange(lrn, "late")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                status === "late" ? "shadow-sm" : ""
              }`}
              style={{
                backgroundColor: status === "late" ? "#F59E0B" : "#F3F4F6",
                color: status === "late" ? "#FFFFFF" : "#6B7280",
              }}
              onMouseEnter={(e) => {
                if (status !== "late") {
                  e.currentTarget.style.backgroundColor = "#E5E7EB";
                }
              }}
              onMouseLeave={(e) => {
                if (status !== "late") {
                  e.currentTarget.style.backgroundColor = "#F3F4F6";
                }
              }}
            >
              <Clock className="w-3.5 h-3.5" />
              Late
            </button>

            {/* Absent */}
            <button
              onClick={() => onStatusChange(lrn, "absent")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                status === "absent" ? "shadow-sm" : ""
              }`}
              style={{
                backgroundColor: status === "absent" ? "#EF4444" : "#F3F4F6",
                color: status === "absent" ? "#FFFFFF" : "#6B7280",
              }}
              onMouseEnter={(e) => {
                if (status !== "absent") {
                  e.currentTarget.style.backgroundColor = "#E5E7EB";
                }
              }}
              onMouseLeave={(e) => {
                if (status !== "absent") {
                  e.currentTarget.style.backgroundColor = "#F3F4F6";
                }
              }}
            >
              <XCircle className="w-3.5 h-3.5" />
              Absent
            </button>
          </>
        ) : (
          /* Read-only Status Indicator */
          status && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={getStatusColor(status)}
            >
              {getStatusIcon(status)}
              <span className="text-xs font-semibold capitalize">{status}</span>
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}
