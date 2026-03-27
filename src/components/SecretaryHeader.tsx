"use client";

import { ReactNode } from "react";

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
    <>
      {/* Top Navigation Bar */}
      <header
        className="h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 backdrop-blur-md"
        style={{ backgroundColor: "rgba(253, 247, 255, 0.8)" }}
      >
        <h2
          className="font-headline text-lg lg:text-xl font-bold"
          style={{ color: "#1c1a22" }}
        >
          Attendance Management
        </h2>
      </header>

      {/* Page Header Section */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-4 lg:px-8 pt-6 lg:pt-8 pb-4">
        <div className="w-full sm:w-auto">
          <h3
            className="font-headline text-3xl sm:text-4xl font-extrabold -tracking-wide"
            style={{ color: "#1c1a22" }}
          >
            {title}
          </h3>
        </div>
        {stats.length > 0 && (
          <div className="flex gap-2 lg:gap-4 w-full sm:w-auto overflow-x-auto">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="px-4 lg:px-6 py-2 lg:py-3 rounded-lg shrink-0 flex flex-col items-end justify-center gap-0.5"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "0.5px solid #E5E7EB"
                }}
              >
                {stat.label && (
                  <p
                    className="font-label text-[10px] uppercase tracking-tighter font-medium"
                    style={{ color: "#6B7280" }}
                  >
                    {stat.label}
                  </p>
                )}
                {typeof stat.value === "string" || typeof stat.value === "number" ? (
                  <p
                    className="font-headline text-xl lg:text-2xl font-medium leading-none"
                    style={{ color: "#1F1F1F" }}
                  >
                    {stat.value}
                  </p>
                ) : (
                  <div
                    className="font-headline text-xl lg:text-2xl font-medium leading-none"
                    style={{ color: "#1F1F1F" }}
                  >
                    {stat.value}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
