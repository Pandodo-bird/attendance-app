"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, KeyRound, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === "auth/invalid-credential") {
        setError("Invalid email or password");
      } else if (firebaseError.code === "auth/user-not-found") {
        setError("No user found with this email");
      } else if (firebaseError.code === "auth/wrong-password") {
        setError("Incorrect password");
      } else {
        setError("Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F7F6FB]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(108,92,231,0.12)_0%,transparent_42%),radial-gradient(circle_at_90%_75%,rgba(30,58,95,0.14)_0%,transparent_45%)]" />

      <div className="relative min-h-screen flex items-start sm:items-center justify-center px-3 py-6 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-2xl sm:rounded-3xl overflow-hidden border shadow-lg sm:shadow-xl" style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}>
          <section className="hidden lg:flex flex-col justify-between p-10" style={{ backgroundColor: "#1e3a5f" }}>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>
                <BookOpen size={18} color="#FFFFFF" />
                <span className="font-headline text-sm font-semibold text-white">EduAttend Pro</span>
              </div>
              <h1 className="font-headline mt-8 text-4xl font-bold leading-tight text-white">
                Attendance Management
                <br />
                for Teachers and Secretaries
              </h1>
              <p className="font-body mt-4 text-sm text-blue-100 max-w-sm">
                Securely manage class sections, attendance analytics, and secretary records in one place.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-blue-100">
              <span className="px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>Teacher Portal</span>
              <span className="px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>Secretary Portal</span>
            </div>
          </section>

          <section className="p-5 sm:p-8 lg:p-10">
            <div className="mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg lg:hidden mb-4" style={{ backgroundColor: "#EEF2FF", color: "#1e3a5f" }}>
                <BookOpen size={18} />
                <span className="font-headline text-sm font-semibold">EduAttend Pro</span>
              </div>
              <h2 className="font-headline text-2xl sm:text-3xl font-bold leading-tight" style={{ color: "#1c1a22" }}>
                Welcome Back
              </h2>
              <p className="font-body mt-2 text-sm" style={{ color: "#6B7280" }}>
                Sign in to continue to your dashboard.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: "#F1F5F9", color: "#1e3a5f" }}
                >
                  Teacher Portal
                </span>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: "#F1F5F9", color: "#1e3a5f" }}
                >
                  Secretary Portal
                </span>
              </div>
            </div>

            {error && (
              <div className="border px-4 py-3 rounded-xl mb-5 sm:mb-6 text-sm" style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: "#B91C1C" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3.5 border rounded-xl outline-none focus:ring-2 transition text-base"
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
                    autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-3.5 border rounded-xl outline-none focus:ring-2 transition text-base"
                    style={{ borderColor: "#D1D5DB", color: "#111827" }}
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base"
                style={{ backgroundColor: "#2D3748", color: "#FFFFFF" }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="mt-5 sm:mt-6 text-sm text-center" style={{ color: "#6B7280" }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold" style={{ color: "#1e3a5f" }}>
                Go to Register
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
