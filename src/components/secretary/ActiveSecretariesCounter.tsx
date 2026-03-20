"use client";

import { useEffect, useState } from "react";
import { getTeacherAppointments, Appointment } from "@/lib/firestore";

interface ActiveSecretariesCounterProps {
  teacherId: string;
}

export default function ActiveSecretariesCounter({ teacherId }: ActiveSecretariesCounterProps) {
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCount = async () => {
      if (teacherId) {
        try {
          // Fetch appointments (uses cache if < 2 min old)
          const appointments = await getTeacherAppointments(teacherId, true);
          // Count only active secretaries
          const active = appointments.filter((apt) => apt.status === "active").length;
          setActiveCount(active);
          setIsLoading(false);
        } catch (error) {
          console.error("Error fetching appointments:", error);
          setIsLoading(false);
        }
      }
    };

    loadCount();
  }, [teacherId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: "#6C5CE7", borderTopColor: "#e7deff" }}
        ></div>
        <span className="text-sm" style={{ color: "#484553" }}>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: "#e7deff" }}
      >
        <span
          className="material-symbols-outlined text-lg"
          style={{ color: "#6C5CE7" }}
        >
          verified
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: "#6C5CE7" }}>
          {activeCount}
        </p>
        <p className="text-[10px]" style={{ color: "#484553" }}>
          Active secretaries
        </p>
      </div>
    </div>
  );
}
