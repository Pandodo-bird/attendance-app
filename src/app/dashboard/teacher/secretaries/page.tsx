"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { SecretaryCard, ActiveSecretariesCounter, SecretaryCreationForm } from "@/components/teacher/secretaries";
import { useState } from "react";
import {
  getTeacherAppointments,
  getTeacherSections,
  updateAppointmentStatus,
  deleteAppointment,
  Section,
  getUserProfilesBatch,
  UserData,
} from "@/lib/firestore";
import { RoleGuard } from "@/hooks/useRequireRole";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Extended appointment with enriched data
interface SecretaryAppointment {
  id: string;
  appointmentId: string;
  secretaryUid: string;
  secretaryLrn: string;
  secretaryName: string;
  secretaryEmail: string;
  sectionId: string;
  sectionName: string;
  gradeLevel: string;
  subject: string;
  schoolYear: string;
  status: "active" | "removed";
  appointedAt: Date | string;
  lastActive?: string;
}

export default function SecretariesPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="teacher">
        <SecretariesContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function SecretariesContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // TanStack Query for appointments (rarely changes - 30 min cache)
  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ["appointments", user?.uid],
    queryFn: () => getTeacherAppointments(user?.uid || "", true),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000, // 30 minutes - appointments set once per semester
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  // TanStack Query for sections (rarely changes - 30 min cache)
  const { data: sections = [] } = useQuery({
    queryKey: ["sections", user?.uid],
    queryFn: () => getTeacherSections(user?.uid || "", true),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000, // 30 minutes - sections rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  // Get unique secretary UIDs for profile fetching
  const uniqueSecretaryUids = [...new Set(appointments.map(apt => apt.secretaryUid))];

  // TanStack Query for secretary profiles (almost never changes - 60 min cache)
  const { data: userProfilesResponses } = useQuery({
    queryKey: ["secretaryProfiles", uniqueSecretaryUids],
    queryFn: async () => {
      if (uniqueSecretaryUids.length === 0) return new Map<string, UserData>();
      return await getUserProfilesBatch(uniqueSecretaryUids);
    },
    enabled: uniqueSecretaryUids.length > 0,
    staleTime: 60 * 60 * 1000, // 60 minutes - user profiles almost never change
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });

  const userProfilesMap = userProfilesResponses || new Map<string, UserData>();

  // Build sections map
  const sectionsMap = new Map<string, Section>();
  sections.forEach((section) => {
    sectionsMap.set(section.id, section);
  });

  // Enrich appointments with secretary names and section data
  const secretaries: SecretaryAppointment[] = appointments.map((apt) => {
    const section = sectionsMap.get(apt.sectionId);
    const userInfo = userProfilesMap.get(apt.secretaryUid);

    return {
      id: `${apt.secretaryUid}-${apt.sectionId}-${apt.subject}`,
      appointmentId: apt.id,
      secretaryUid: apt.secretaryUid,
      secretaryLrn: apt.secretaryLrn,
      secretaryName: userInfo?.displayName || apt.secretaryLrn,
      secretaryEmail: userInfo?.email || `${apt.secretaryLrn}@app.local`,
      sectionId: apt.sectionId,
      sectionName: section?.sectionName || "Unknown Section",
      gradeLevel: section?.gradeLevel || "",
      subject: apt.subject,
      schoolYear: apt.schoolYear,
      status: apt.status,
      appointedAt: apt.appointedAt,
      lastActive: formatLastActive(apt.appointedAt),
    } as SecretaryAppointment;
  });

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [shouldRefreshAfterClose, setShouldRefreshAfterClose] = useState(false);

  // Format Firestore timestamp to readable string
  const formatLastActive = (timestamp: Date | { toDate: () => Date } | string | null): string => {
    if (!timestamp) return "Unknown";

    // Convert to Date object
    let date: Date;

    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else {
      date = timestamp as Date;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  // Filter secretaries based on search query
  const filteredSecretaries = secretaries.filter(
    (sec) =>
      sec.secretaryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.sectionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.gradeLevel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle removing a secretary (deactivating appointment)
  const handleRemoveSecretary = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to remove this secretary from this subject?")) return;

    try {
      await updateAppointmentStatus(appointmentId, "removed", user?.uid);
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["appointments", user?.uid] });
    } catch (error) {
      console.error("Error removing secretary:", error);
      alert("Failed to remove secretary. Please try again.");
    }
  };

  // Handle deleting an appointment permanently
  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to permanently delete this appointment? This cannot be undone.")) return;

    try {
      await deleteAppointment(appointmentId, user?.uid);
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["appointments", user?.uid] });
    } catch (error) {
      console.error("Error deleting appointment:", error);
      alert("Failed to delete appointment. Please try again.");
    }
  };

  // Handle opening the registration modal
  const handleOpenRegisterModal = () => {
    setShowRegisterModal(true);
    setShouldRefreshAfterClose(false); // Reset refresh flag
  };

  // Handle closing the registration modal (refresh data only if secretary was created)
  const handleCloseRegisterModal = () => {
    // Only refresh if a secretary was successfully created
    if (shouldRefreshAfterClose) {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["appointments", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["secretaryProfiles"] });
      setShouldRefreshAfterClose(false);
    }
    setShowRegisterModal(false);
  };

  // Handle viewing records (placeholder - to be implemented)
  const handleViewRecords = (appointmentId: string) => {
    console.log("View records for appointment:", appointmentId);
    // TODO: Navigate to attendance records page
  };

  // Handle restoring a secretary (reactivating appointment)
  const handleRestoreSecretary = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to restore this secretary?")) return;

    try {
      await updateAppointmentStatus(appointmentId, "active", user?.uid);
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["appointments", user?.uid] });
    } catch (error) {
      console.error("Error restoring secretary:", error);
      alert("Failed to restore secretary. Please try again.");
    }
  };

  return (
    <>
      {/* Header */}
      <TeacherHeader
        title="Secretaries"
        stats={[
          {
            label: "ACTIVE SECRETARIES",
            value: <ActiveSecretariesCounter teacherId={user?.uid || ""} />,
          },
          {
            label: "",
            value: (
              <button
                onClick={handleOpenRegisterModal}
                className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors h-[50px]"
                style={{ backgroundColor: "#2D3748", color: "#FFFFFF" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1A202C";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2D3748";
                }}
              >
                <UserPlus size={18} strokeWidth={2} />
                <span className="text-sm">Appoint Secretary</span>
              </button>
            ),
          },
        ]}
        searchPlaceholder="Search by name, subject, or section..."
        onSearch={(query) => setSearchQuery(query)}
      />

      {/* Content Canvas */}
      <motion.div
        className="p-4 lg:p-8 space-y-6 lg:space-y-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
            {/* Bento Grid of Secretaries */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {error ? (
                // Error state
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="text-center px-4 max-w-md">
                    <span
                      className="material-symbols-outlined text-5xl lg:text-6xl mb-4"
                      style={{ color: "#EF4444" }}
                    >
                      error
                    </span>
                    <h3 className="text-xl font-bold mb-2" style={{ color: "#1c1a22" }}>
                      Unable to Load
                    </h3>
                    <p className="text-sm mb-4" style={{ color: "#484553" }}>
                      {error instanceof Error ? error.message : "Failed to load secretary data. Please refresh the page."}
                    </p>
                  </div>
                </div>
              ) : isLoading ? (
                // Loading state
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className="w-8 h-8 border-4 rounded-full animate-spin"
                      style={{ borderColor: "#6C5CE7", borderTopColor: "#e7deff" }}
                    ></div>
                    <p className="text-sm" style={{ color: "#484553" }}>
                      Loading appointments...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {filteredSecretaries.map((secretary, index) => (
                      <SecretaryCard
                        key={secretary.appointmentId}
                        secretaryUid={secretary.secretaryUid}
                        secretaryLrn={secretary.secretaryLrn}
                        secretaryName={secretary.secretaryName}
                        secretaryEmail={secretary.secretaryEmail}
                        sectionId={secretary.sectionId}
                        sectionName={secretary.sectionName}
                        gradeLevel={secretary.gradeLevel}
                        subject={secretary.subject}
                        schoolYear={secretary.schoolYear}
                        status={secretary.status}
                        appointedAt={secretary.appointedAt}
                        lastActive={secretary.lastActive}
                        onViewRecords={() => handleViewRecords(secretary.appointmentId)}
                        onRemove={() => handleRemoveSecretary(secretary.appointmentId)}
                        onRestore={() => handleRestoreSecretary(secretary.appointmentId)}
                        onDelete={() => handleDeleteAppointment(secretary.appointmentId)}
                        index={index}
                      />
                  ))}
                </>
              )}
            </section>
          </motion.div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowRegisterModal(false);
            }}
          ></div>
          
          {/* Modal Content */}
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 lg:p-8 border-b flex-shrink-0" style={{ borderColor: "#e6e0ec", backgroundColor: "#faf8fc" }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: "#1c1a22" }}>
                    Register Secretary
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "#484553" }}>
                    Create a new secretary account for your section
                  </p>
                </div>
                <button
                  onClick={handleCloseRegisterModal}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: "#f1ecf7", color: "#484553" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#e7deff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f1ecf7";
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 lg:p-8 flex-1 overflow-y-auto">
              <SecretaryCreationForm
                teacherId={user?.uid || ''}
                onSuccess={() => {
                  setShouldRefreshAfterClose(true); // Mark for refresh on close
                }}
                onCancel={handleCloseRegisterModal}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
