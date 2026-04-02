"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, XCircle, FileBadge } from "lucide-react";

type AttendanceStatus = "present" | "late" | "absent" | "excused";

interface StudentAttendanceRowProps {
  lrn: string;
  studentName: string;
  status: AttendanceStatus | null;
  index: number;
  isEditable: boolean;
  onStatusChange: (lrn: string, status: AttendanceStatus) => void;
}

export default function StudentAttendanceRow({
  lrn,
  studentName,
  status,
  index,
  isEditable,
  onStatusChange,
}: StudentAttendanceRowProps) {
  const getStatusColor = (s: AttendanceStatus) => {
    switch (s) {
      case "present":
        return { backgroundColor: "#D1FAE5", color: "#065F46", borderColor: "#A7F3D0" };
      case "late":
        return { backgroundColor: "#FEF3C7", color: "#92400E", borderColor: "#FDE68A" };
      case "absent":
        return { backgroundColor: "#FEE2E2", color: "#991B1B", borderColor: "#FECACA" };
      case "excused":
        return { backgroundColor: "#DBEAFE", color: "#1E40AF", borderColor: "#93C5FD" };
    }
  };

  const getStatusIcon = (s: AttendanceStatus) => {
    switch (s) {
      case "present":
        return <CheckCircle className="w-3.5 h-3.5" />;
      case "late":
        return <Clock className="w-3.5 h-3.5" />;
      case "absent":
        return <XCircle className="w-3.5 h-3.5" />;
      case "excused":
        return <FileBadge className="w-3.5 h-3.5" />;
    }
  };

  return (
    <motion.div
      className="grid grid-cols-12 gap-4 px-6 py-3 items-center"
      style={{ backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F9FAFB" }}
      initial={false}
    >
      <div className="col-span-5">
        <p className="text-sm font-medium" style={{ color: "#1F1F1F" }}>
          {studentName}
        </p>
      </div>

      <div className="col-span-3 text-center">
        <p className="font-mono text-xs" style={{ color: "#6B7280" }}>
          {lrn}
        </p>
      </div>

      <div className="col-span-4 flex items-center justify-center gap-2">
        {isEditable ? (
          <>
            <button
              onClick={() => onStatusChange(lrn, "present")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: status === "present" ? "#10B981" : "#F3F4F6",
                color: status === "present" ? "#FFFFFF" : "#6B7280",
              }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Present
            </button>

            <button
              onClick={() => onStatusChange(lrn, "late")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: status === "late" ? "#F59E0B" : "#F3F4F6",
                color: status === "late" ? "#FFFFFF" : "#6B7280",
              }}
            >
              <Clock className="w-3.5 h-3.5" />
              Late
            </button>

            <button
              onClick={() => onStatusChange(lrn, "absent")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: status === "absent" ? "#EF4444" : "#F3F4F6",
                color: status === "absent" ? "#FFFFFF" : "#6B7280",
              }}
            >
              <XCircle className="w-3.5 h-3.5" />
              Absent
            </button>
          </>
        ) : (
          status && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg border"
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
