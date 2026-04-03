"use client";

import { ReactNode } from "react";
import SecretaryStatusStrip from "@/components/SecretaryStatusStrip";

interface SecretaryHeaderProps {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  stats?: Array<{
    label: string;
    value: string | number | ReactNode;
    valueColor?: string;
  }>;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}

export default function SecretaryHeader({
  title,
  stats = []
}: SecretaryHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-white">
      <header
        className="h-14 flex items-center justify-between px-4 border-b"
        style={{ borderColor: "#E5E7EB" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="leading-tight">
            <h2
              className="text-sm font-bold"
              style={{ color: "#1e3a5f" }}
            >
              EduAttend Pro
            </h2>
            <p className="text-[10px]" style={{ color: "#9CA3AF" }}>
              Secretary Portal
            </p>
          </div>
        </div>
      </header>

      <section className="px-4 pt-3 pb-2 bg-white">
        <div className="flex flex-col items-center gap-3">
          <h3
            className="text-2xl sm:text-3xl font-extrabold -tracking-wide"
            style={{ color: "#1c1a22" }}
          >
            {title}
          </h3>
          {stats.length > 0 && (
            <div className="flex flex-row justify-between items-center w-full">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="px-3 py-2 rounded-lg flex flex-col items-start gap-0.5 flex-1"
                  style={{
                    backgroundColor: "#F9FAFB",
                    border: "0.5px solid #E5E7EB"
                  }}
                >
                  {stat.label && (
                    <p
                      className="text-[9px] uppercase tracking-tighter font-medium"
                      style={{ color: "#6B7280" }}
                    >
                      {stat.label}
                    </p>
                  )}
                  {typeof stat.value === "string" || typeof stat.value === "number" ? (
                    <p
                      className="text-lg font-medium leading-none"
                      style={{ color: "#1F1F1F" }}
                    >
                      {stat.value}
                    </p>
                  ) : (
                    <div
                      className="text-lg font-medium leading-none"
                      style={{ color: "#1F1F1F" }}
                    >
                      {stat.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="w-full">
            <SecretaryStatusStrip />
          </div>
        </div>
      </section>
    </div>
  );
}
