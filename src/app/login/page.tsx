"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
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

            <div className="relative z-10 flex flex-col items-center h-full">
              <motion.button
                layout
                onClick={() => setShowFeatures(!showFeatures)}
                className="relative cursor-pointer focus:outline-none"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div
                  className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
                  style={{
                    background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
                    transform: "scale(1.5)",
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-transparent.png" alt="SchoolSync" className="relative w-44 h-44" />
              </motion.button>

              <AnimatePresence>
                {!showFeatures && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-6 text-center"
                  >
                    <p className="text-2xl font-bold text-white">SchoolSync</p>
                    <p className="mt-2 text-xl font-semibold text-blue-100/90">Attendance Management System</p>
                    <p className="mt-3 text-sm text-blue-100/80 max-w-sm mx-auto leading-relaxed">
                      Track daily attendance, manage class lists, and analyze attendance trends for your school.
                    </p>
                    <p className="mt-5 text-xs text-blue-100/50">
                      Click icon to see features
                    </p>
                  </motion.div>
                )}
                {showFeatures && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 16, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 16, height: 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="overflow-hidden mt-6"
                  >
                    <div className="space-y-4 max-w-md w-full text-left">
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05, duration: 0.2 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-2 h-2 rounded-full bg-sky-300 mt-2 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-white">Role-based access</p>
                          <p className="mt-1 text-xs text-blue-100">Separate teacher and secretary portals with scoped permissions</p>
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.2 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-2 h-2 rounded-full bg-sky-300 mt-2 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-white">Offline attendance</p>
                          <p className="mt-1 text-xs text-blue-100">Secretaries can record attendance without internet; data syncs when reconnected</p>
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15, duration: 0.2 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-2 h-2 rounded-full bg-sky-300 mt-2 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-white">Analytics &amp; reports</p>
                          <p className="mt-1 text-xs text-blue-100">Pre-computed student summaries, monthly trends, and semester exports</p>
                        </div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.2 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-2 h-2 rounded-full bg-sky-300 mt-2 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-white">Audit trail</p>
                          <p className="mt-1 text-xs text-blue-100">Every attendance change is logged with timestamps and override tracking</p>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </section>

          <section className="p-5 sm:p-8 lg:p-10">
            <div className="mb-6 sm:mb-8 lg:hidden">
              <div className="flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-transparent.png" alt="SchoolSync" className="w-14 h-14 rounded-2xl shadow-sm" />
                <h2 className="font-headline mt-4 text-2xl font-bold leading-tight" style={{ color: "#1c1a22" }}>
                  SchoolSync
                </h2>
                <p className="font-body mt-1 text-sm" style={{ color: "#6B7280" }}>
                  Sign in to continue.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
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

            <div className="hidden lg:block mb-6 sm:mb-8">
              <div className="flex justify-center mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-transparent.png" alt="SchoolSync" className="w-16 h-16" />
              </div>
              <h2 className="font-headline text-2xl sm:text-3xl font-bold leading-tight text-center" style={{ color: "#1c1a22" }}>
                Welcome Back
              </h2>
              <p className="font-body mt-1 text-sm text-center" style={{ color: "#6B7280" }}>
                Sign in to continue.
              </p>
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

            <p className="mt-3 text-sm text-center" style={{ color: "#6B7280" }}>
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
