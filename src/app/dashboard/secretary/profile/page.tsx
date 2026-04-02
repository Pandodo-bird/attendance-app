"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import SecretaryHeader from "@/components/SecretaryHeader";
import { RoleGuard } from "@/hooks/useRequireRole";
import { motion } from "framer-motion";
import { User, Mail, Calendar, Shield, BookOpen, Building2 } from "lucide-react";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="secretary">
        <ProfileContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user, userProfile } = useAuth();

  const getAvatarColor = (name: string): { bg: string; text: string } => {
    const colors = [
      { bg: "#e6deff", text: "#493598" },
      { bg: "#d4f0e8", text: "#00695c" },
      { bg: "#ffe5d0", text: "#c45c00" },
      { bg: "#fce4ec", text: "#ad1457" },
      { bg: "#e8eaf6", text: "#3949ab" },
      { bg: "#e0f7fa", text: "#006064" },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const avatarColors = getAvatarColor(user?.displayName || "S");
  const secretaryProfile = userProfile?.role === "secretary" ? userProfile : null;

  const formattedDate = secretaryProfile?.createdAt
    ? new Date(secretaryProfile.createdAt instanceof Date ? secretaryProfile.createdAt : secretaryProfile.createdAt.toDate()).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  return (
    <>
      <SecretaryHeader
        title="Profile"
        stats={[
          { label: "STATUS", value: "Active" },
          { label: "ROLE", value: "Secretary" },
        ]}
      />

      <motion.div
        className="px-3 sm:px-4 lg:px-8 pb-8 space-y-4 sm:space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Profile Card */}
        <div
          className="rounded-2xl border p-4 sm:p-6"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold shrink-0"
              style={{
                backgroundColor: avatarColors.bg,
                color: avatarColors.text,
              }}
            >
              {(user?.displayName || "S").charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: "#1F1F1F" }}>
                {user?.displayName || "Secretary"}
              </h2>
              <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
                {user?.email || "N/A"}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: "#D1FAE5", color: "#065F46" }}
                >
                  Active
                </span>
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: "#E6DEFF", color: "#493598" }}
                >
                  Secretary
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div
          className="rounded-2xl border p-4 sm:p-5"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: "#1F1F1F" }}>
            Account Details
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#EEF4FB" }}
              >
                <User size={16} style={{ color: "#1E3A5F" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  Full Name
                </p>
                <p className="text-sm font-medium truncate" style={{ color: "#1F1F1F" }}>
                  {user?.displayName || "N/A"}
                </p>
              </div>
            </div>

            <div
              className="h-px"
              style={{ backgroundColor: "#F3F4F6" }}
            />

            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#EEF4FB" }}
              >
                <Mail size={16} style={{ color: "#1E3A5F" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  Email
                </p>
                <p className="text-sm font-medium truncate" style={{ color: "#1F1F1F" }}>
                  {user?.email || "N/A"}
                </p>
              </div>
            </div>

            <div
              className="h-px"
              style={{ backgroundColor: "#F3F4F6" }}
            />

            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#EEF4FB" }}
              >
                <Shield size={16} style={{ color: "#1E3A5F" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  Role
                </p>
                <p className="text-sm font-medium" style={{ color: "#1F1F1F" }}>
                  Secretary
                </p>
              </div>
            </div>

            <div
              className="h-px"
              style={{ backgroundColor: "#F3F4F6" }}
            />

            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#EEF4FB" }}
              >
                <Calendar size={16} style={{ color: "#1E3A5F" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  Account Created
                </p>
                <p className="text-sm font-medium" style={{ color: "#1F1F1F" }}>
                  {formattedDate}
                </p>
              </div>
            </div>

            {secretaryProfile?.lrn && (
              <>
                <div
                  className="h-px"
                  style={{ backgroundColor: "#F3F4F6" }}
                />
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "#EEF4FB" }}
                  >
                    <BookOpen size={16} style={{ color: "#1E3A5F" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: "#6B7280" }}>
                      LRN
                    </p>
                    <p className="text-sm font-mono font-medium" style={{ color: "#1F1F1F" }}>
                      {secretaryProfile.lrn}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* App Info */}
        <div
          className="rounded-2xl border p-4 sm:p-5"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#1e3a5f" }}
            >
              <Building2 size={16} style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "#1F1F1F" }}>
                EduAttend Pro
              </h3>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                Secretary Portal
              </p>
            </div>
          </div>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>
            Attendance Management System v1.0
          </p>
        </div>
      </motion.div>
    </>
  );
}
