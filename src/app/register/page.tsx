"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, KeyRound, Mail, UserRound } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!masterKey.trim()) {
      setError("Master key is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register-teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: name.trim(),
          email: email.trim(),
          password,
          masterKey: masterKey.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      await signIn(email.trim(), password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const appError = err as { code?: string; message?: string };
      if (appError.message === "Email is already registered" || appError.code === "auth/email-already-in-use") {
        setError("Email is already registered");
      } else if (appError.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (appError.code === "auth/weak-password") {
        setError("Password is too weak");
      } else if (appError.message === "Invalid master key") {
        setError("Invalid master key");
      } else if (appError.message === "Teacher registration is currently disabled") {
        setError("Teacher registration is currently disabled");
      } else {
        setError(appError.message || "Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F7F6FB]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(108,92,231,0.12)_0%,transparent_42%),radial-gradient(circle_at_90%_75%,rgba(30,58,95,0.14)_0%,transparent_45%)]" />

      <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-3xl overflow-hidden border shadow-xl" style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}>
          <section
            className="hidden lg:flex relative overflow-hidden flex-col justify-between p-10"
            style={{
              background: "linear-gradient(150deg, #102a43 0%, #1e3a5f 45%, #2f4f74 100%)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 18%, rgba(125,211,252,0.26) 0%, transparent 36%), radial-gradient(circle at 82% 82%, rgba(191,219,254,0.24) 0%, transparent 40%), linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
                backgroundSize: "auto, auto, 26px 26px, 26px 26px",
              }}
            />
            <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-sky-200/20 blur-2xl pointer-events-none" />
            <div className="absolute bottom-8 -left-8 h-36 w-36 rounded-full bg-blue-100/20 blur-xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm">
                <BookOpen size={18} color="#FFFFFF" />
                <span className="font-headline text-sm font-semibold text-white tracking-wide">SchoolSync</span>
              </div>
              <h1 className="font-headline mt-8 text-4xl font-bold leading-tight text-white">
                School Attendance Management
              </h1>
              <p className="font-body mt-4 text-sm max-w-sm text-blue-100/95">
                Manage attendance records, class lists, and daily logs in one place.
              </p>

              <div className="mt-7 grid grid-cols-2 gap-3 max-w-md">
                <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <p className="text-xs font-semibold text-white">Attendance Recording</p>
                  <p className="mt-1 text-[11px] text-blue-100">Log daily student attendance</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <p className="text-xs font-semibold text-white">Reports &amp; Analytics</p>
                  <p className="mt-1 text-[11px] text-blue-100">View attendance summaries and trends</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 flex items-center gap-3 text-xs text-blue-100">
              <span className="px-3 py-1 rounded-full border border-white/20 bg-white/10">Teacher Access</span>
              <span className="px-3 py-1 rounded-full border border-white/20 bg-white/10">Secretary Access</span>
            </div>
          </section>

          <section className="p-8 sm:p-10">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg lg:hidden mb-5" style={{ backgroundColor: "#EEF2FF", color: "#1e3a5f" }}>
                <BookOpen size={18} />
                <span className="font-headline text-sm font-semibold">SchoolSync</span>
              </div>
              <h2 className="font-headline text-3xl font-bold" style={{ color: "#1c1a22" }}>Create Account</h2>
              <p className="font-body mt-2 text-sm" style={{ color: "#6B7280" }}>
                Register a teacher account to get started.
              </p>
            </div>

            {error && (
              <div className="border px-4 py-3 rounded-xl mb-6 text-sm" style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: "#B91C1C" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold mb-2" style={{ color: "#374151" }}>
                  Full Name
                </label>
                <div className="relative">
                  <UserRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 transition"
                    style={{ borderColor: "#D1D5DB", color: "#111827" }}
                    placeholder="Juan Dela Cruz"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{ color: "#374151" }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 transition"
                    style={{ borderColor: "#D1D5DB", color: "#111827" }}
                    placeholder="you@app.local"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold mb-2" style={{ color: "#374151" }}>
                  Password
                </label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 transition"
                    style={{ borderColor: "#D1D5DB", color: "#111827" }}
                    placeholder="Create a password"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2" style={{ color: "#374151" }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 transition"
                    style={{ borderColor: "#D1D5DB", color: "#111827" }}
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="masterKey" className="block text-sm font-semibold mb-2" style={{ color: "#374151" }}>
                  Master Key
                </label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                  <input
                    id="masterKey"
                    type="password"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 transition"
                    style={{ borderColor: "#D1D5DB", color: "#111827" }}
                    placeholder="Enter teacher registration key"
                  />
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ borderColor: "#DCE7F3", backgroundColor: "#F8FAFC" }}>
                <p className="text-sm font-semibold" style={{ color: "#1E3A5F" }}>
                  Teacher Account
                </p>
                <p className="text-xs mt-1" style={{ color: "#475569" }}>
                  Secretary accounts are created by teachers from the dashboard.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                style={{ backgroundColor: "#2D3748", color: "#FFFFFF" }}
              >
                {loading ? "Creating Account..." : "Register as Teacher"}
              </button>
            </form>

            <p className="mt-6 text-sm text-center" style={{ color: "#6B7280" }}>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold" style={{ color: "#1e3a5f" }}>
                Sign In
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
