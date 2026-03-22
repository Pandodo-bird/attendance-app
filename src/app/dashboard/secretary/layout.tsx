"use client";

import SecretarySidebar from "@/components/SecretarySidebar";
import { ReactNode } from "react";

interface SecretaryLayoutProps {
  children: ReactNode;
}

export default function SecretaryLayout({ children }: SecretaryLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F3FA" }}>
      <div className="flex min-h-screen">
        {/* Secretary Sidebar - Persistent across all secretary pages */}
        <SecretarySidebar />

        {/* Main Content Area */}
        <main className="flex-1 ml-0 lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
