"use client";

import TeacherSidebar from "@/components/TeacherSidebar";
import { ReactNode } from "react";

interface TeacherLayoutProps {
  children: ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F3FA" }}>
      <div className="flex min-h-screen">
        {/* Teacher Sidebar - Persistent across all teacher pages */}
        <TeacherSidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 ml-0 lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
