"use client";

import TeacherSidebar from "@/components/TeacherSidebar";
import { ReactNode } from "react";

interface TeacherLayoutProps {
  children: ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundColor: "#F4F7FB",
        backgroundImage:
          "radial-gradient(circle at 12% 18%, rgba(30,58,95,0.1) 0%, transparent 42%), radial-gradient(circle at 88% 8%, rgba(30,58,95,0.08) 0%, transparent 38%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-28 -right-20 w-[340px] h-[340px] rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(30,58,95,0.08)" }}
        />
        <div
          className="absolute top-[35%] -left-28 w-[280px] h-[280px] rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(30,58,95,0.06)" }}
        />
      </div>

      <div className="flex min-h-screen relative">
        {/* Teacher Sidebar - Persistent across all teacher pages */}
        <TeacherSidebar />
        
        {/* Main Content Area */}
        <main
          className="flex-1 ml-0 lg:ml-64 min-h-screen flex flex-col transition-all duration-300"
          style={{ backgroundColor: "rgba(255,255,255,0.55)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
