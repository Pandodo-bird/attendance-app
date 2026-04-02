"use client";

import SecretarySidebar from "@/components/SecretarySidebar";
import { Menu, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface SecretaryLayoutProps {
  children: ReactNode;
}

export default function SecretaryLayout({ children }: SecretaryLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const frame = window.requestAnimationFrame(() => {
      setIsSidebarOpen(mediaQuery.matches);
    });

    const handleChange = (event: MediaQueryListEvent) => {
      setIsSidebarOpen(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F3FA" }}>
      <div className="flex min-h-screen">
        <SecretarySidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main
          className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${
            isSidebarOpen ? "lg:ml-64" : "lg:ml-0"
          }`}
        >
          <button
            type="button"
            className="fixed top-4 right-4 z-[60] p-2.5 rounded-lg shadow-md"
            style={{ backgroundColor: "#1e3a5f", color: "#FFFFFF" }}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="pt-0 lg:pt-4 pb-20 lg:pb-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
