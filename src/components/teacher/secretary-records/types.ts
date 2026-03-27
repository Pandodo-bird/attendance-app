import { Attendance, AttendanceStatus } from "@/lib/firestore";

export interface SessionWithStats extends Attendance {
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  totalStudents: number;
  recorderName: string;
  sectionLabel: string;
  sectionSlug: string;
}

export interface PendingOverridePayload {
  session: SessionWithStats;
  lrn: string;
  studentName: string;
  currentStatus: AttendanceStatus;
  nextStatus: AttendanceStatus;
}
