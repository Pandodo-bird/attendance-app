"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import SecretaryHeader from "@/components/SecretaryHeader";
import { RoleGuard } from "@/hooks/useRequireRole";
import { motion } from "framer-motion";

export default function SecretaryDashboardPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="secretary">
        <SecretaryDashboardContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function SecretaryDashboardContent() {
  const { user } = useAuth();

  return (
    <>
      {/* Header */}
      <SecretaryHeader
        title="Dashboard Overview"
        searchPlaceholder="Search sections, subjects..."
      />

      {/* Content Canvas */}
      <motion.div
        className="p-4 lg:p-8 space-y-6 lg:space-y-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Quick Actions */}
        <div
          className="p-4 lg:p-8 rounded-3xl shadow-sm"
          style={{ backgroundColor: '#F0EDF7' }}
        >
          <h4 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6" style={{ color: '#1F1F1F' }}>Quick Actions</h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            <motion.button
              className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm"
              style={{ backgroundColor: '#FFFFFF' }}
              whileHover={{
                backgroundColor: '#F7F6FB',
                scale: 1.02,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: '#6C5CE7' }}
              >
                edit_calendar
              </span>
              <span className="text-xs font-bold text-center" style={{ color: '#6B6B6B' }}>Today&apos;s Attendance</span>
            </motion.button>
            <motion.button
              className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm"
              style={{ backgroundColor: '#FFFFFF' }}
              whileHover={{
                backgroundColor: '#F7F6FB',
                scale: 1.02,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: '#6C5CE7' }}
              >
                description
              </span>
              <span className="text-xs font-bold text-center" style={{ color: '#6B6B6B' }}>View Reports</span>
            </motion.button>
            <motion.button
              className="p-3 lg:p-4 rounded-2xl flex flex-col items-center gap-2 transition-all shadow-sm"
              style={{ backgroundColor: '#FFFFFF' }}
              whileHover={{
                backgroundColor: '#F7F6FB',
                scale: 1.02,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: '#6C5CE7' }}
              >
                history
              </span>
              <span className="text-xs font-bold text-center" style={{ color: '#6B6B6B' }}>History</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
