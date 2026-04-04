"use client";

import SecretarySidebar from "@/components/SecretarySidebar";
import { useAuth } from "@/contexts/AuthContext";
import { getSecretaryAppointments, getSectionById, getSectionStudents } from "@/lib/firestore";
import { mergeSecretaryBootstrapCache } from "@/lib/secretaryOfflineBootstrap";
import { useNetworkStatus } from "@/lib/networkStatus";
import { Menu, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface SecretaryLayoutProps {
  children: ReactNode;
}

export default function SecretaryLayout({ children }: SecretaryLayoutProps) {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const { isOnline } = useNetworkStatus();

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

  useEffect(() => {
    if (!user?.uid || !isOnline) {
      return;
    }

    let cancelled = false;

    const prefetchSecretaryBootstrap = async () => {
      try {
        const appointments = await getSecretaryAppointments(user.uid);
        if (cancelled || appointments.length === 0) {
          return;
        }

        const sectionEntries = await Promise.all(
          appointments.map(async (appointment) => {
            const [section, students] = await Promise.all([
              getSectionById(appointment.sectionId),
              getSectionStudents(appointment.sectionId),
            ]);

            return {
              appointment,
              section,
              students,
            };
          })
        );

        if (cancelled) {
          return;
        }

        mergeSecretaryBootstrapCache(user.uid, {
          appointments,
          sectionsById: Object.fromEntries(
            sectionEntries
              .filter((entry) => entry.section)
              .map((entry) => [entry.appointment.sectionId, entry.section!])
          ),
          studentsBySectionId: Object.fromEntries(
            sectionEntries.map((entry) => [entry.appointment.sectionId, entry.students])
          ),
        });
      } catch (error) {
        console.error("Error prefetching secretary offline bootstrap:", error);
      }
    };

    void prefetchSecretaryBootstrap();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void prefetchSecretaryBootstrap();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOnline, user?.uid]);

  return (
    <div className="h-dvh overflow-hidden" style={{ backgroundColor: "#F5F3FA" }}>
      <div className="flex h-full min-h-0">
        <SecretarySidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main
          className={`flex-1 flex min-h-0 flex-col overflow-hidden transition-all duration-300 ${
            isSidebarOpen ? "lg:ml-64" : "lg:ml-0"
          }`}
        >
          <button
            type="button"
            className="fixed right-4 top-4 z-[60] rounded-lg p-2.5 shadow-md lg:top-5"
            style={{ backgroundColor: "#1e3a5f", color: "#FFFFFF" }}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex min-h-0 flex-1 flex-col px-3 pt-4 sm:px-4 lg:px-8 lg:pt-4">
            <div className="flex min-h-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-4">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
