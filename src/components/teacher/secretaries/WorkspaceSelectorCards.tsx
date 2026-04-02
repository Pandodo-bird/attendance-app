"use client";

import { ArrowUpRight, Calendar, ClipboardCheck, UserPlus } from "lucide-react";
import { motion } from "framer-motion";

export type WorkspaceKey = "teacher-attendance" | "secretaries" | "section-history";

interface WorkspaceOption {
  key: WorkspaceKey;
  label: string;
  description: string;
  countLabel: string;
  icon: React.ReactNode;
}

interface WorkspaceSelectorCardsProps {
  activeWorkspace: WorkspaceKey;
  onWorkspaceChange: (workspace: WorkspaceKey) => void;
  activeSectionsCount: number;
  activeSecretaryCount: number;
  sharedSectionGroupsCount: number;
}

export function WorkspaceSelectorCards({
  activeWorkspace,
  onWorkspaceChange,
  activeSectionsCount,
  activeSecretaryCount,
  sharedSectionGroupsCount,
}: WorkspaceSelectorCardsProps) {
  const workspaces: WorkspaceOption[] = [
    {
      key: "teacher-attendance",
      label: "Teacher Attendance",
      description: "Select a section and record the class attendance for the day.",
      countLabel: `${activeSectionsCount} active section${activeSectionsCount === 1 ? "" : "s"}`,
      icon: <ClipboardCheck size={18} />,
    },
    {
      key: "secretaries",
      label: "Secretary List",
      description: "View appointed secretaries and open each secretary's recorded sessions.",
      countLabel: `${activeSecretaryCount} active secretar${activeSecretaryCount === 1 ? "y" : "ies"}`,
      icon: <UserPlus size={18} />,
    },
    {
      key: "section-history",
      label: "Shared Section History",
      description: "Open a section to view all recorded attendance days for that class.",
      countLabel: `${sharedSectionGroupsCount} section${sharedSectionGroupsCount === 1 ? "" : "s"} with history`,
      icon: <Calendar size={18} />,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {workspaces.map((workspace) => {
        const isActive = activeWorkspace === workspace.key;

        return (
          <motion.button
            key={workspace.key}
            type="button"
            onClick={() => onWorkspaceChange(workspace.key)}
            className="group relative overflow-hidden rounded-2xl border p-5 text-left cursor-pointer"
            style={{
              backgroundColor: isActive ? "#1E3A5F" : "#FFFFFF",
              borderColor: isActive ? "#1E3A5F" : "#D7E2EF",
              color: isActive ? "#FFFFFF" : "#0F172A",
            }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: isActive ? "rgba(255,255,255,0.22)" : "#DBEAFE" }}
            />
            <div className="flex items-center justify-between gap-3">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.14)" : "#EAF2FF",
                  color: isActive ? "#FFFFFF" : "#1E3A5F",
                }}
              >
                {workspace.icon}
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.14)" : "#F8FAFC",
                  color: isActive ? "#DBEAFE" : "#64748B",
                }}
              >
                {workspace.countLabel}
              </span>
            </div>
            <p className="mt-4 text-base font-semibold">{workspace.label}</p>
            <p className="mt-2 text-sm" style={{ color: isActive ? "#DBEAFE" : "#475569" }}>
              {workspace.description}
            </p>

            <div className="mt-5 flex items-center justify-end">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.14)" : "#F8FAFC",
                  color: isActive ? "#FFFFFF" : "#1E3A5F",
                  border: isActive ? "1px solid rgba(255,255,255,0.16)" : "1px solid #D7E2EF",
                }}
              >
                <ArrowUpRight size={16} />
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
