import Link from "next/link";
import { Signal, WifiOff } from "lucide-react";

const cachedSecretaryLinks = [
  { href: "/dashboard/secretary/dashboard", label: "Secretary Dashboard" },
  { href: "/dashboard/secretary/attendance", label: "Attendance" },
  { href: "/dashboard/secretary/history", label: "History" },
];

export default function OfflineFallbackPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: "#F5F3FA" }}
    >
      <div
        className="w-full max-w-md rounded-3xl border p-6 sm:p-8"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: "#EEF4FB", color: "#1e3a5f" }}
        >
          <WifiOff className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold mb-2" style={{ color: "#1F1F1F" }}>
          You&apos;re offline
        </h1>
        <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
          This page is not cached yet. Use one of the secretary pages below while the connection is unavailable.
        </p>

        <div className="space-y-3">
          {cachedSecretaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#1e3a5f" }}
            >
              <span>{link.label}</span>
              <Signal className="w-4 h-4" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
