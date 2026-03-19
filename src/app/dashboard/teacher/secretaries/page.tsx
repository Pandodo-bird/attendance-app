"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherSidebar from "@/components/TeacherSidebar";
import TeacherHeader from "@/components/TeacherHeader";
import SecretaryCreationForm from "@/components/teacher/SecretaryCreationForm";
import { useState, useEffect } from "react";
import {
  subscribeToTeacherAppointments,
  getSectionStudents,
  getUserProfile,
  Appointment,
  Student,
  UserData,
  updateAppointmentStatus,
  deleteAppointment,
  getTeacherSections,
  Section
} from "@/lib/firestore";
import { Unsubscribe, FirestoreError } from "firebase/firestore";
import { RoleGuard } from "@/hooks/useRequireRole";

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
  const { user, createSecretaryAccount } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [secretaries, setSecretaries] = useState<SecretaryAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache for sections and students to avoid repeated lookups
  const [sectionsCache, setSectionsCache] = useState<Map<string, Section>>(new Map());
  const [studentsCache, setStudentsCache] = useState<Map<string, Map<string, Student>>>(new Map());
  const [usersCache, setUsersCache] = useState<Map<string, UserData>>(new Map());

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Real-time subscription to appointments data
  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user?.uid) {
      setIsLoading(true);
      setError(null);

      // Subscribe to real-time updates for teacher's appointments
      unsubscribe = subscribeToTeacherAppointments(
        user.uid,
        async (appointments) => {
          try {
            // First, fetch all sections for this teacher
            const sections = await getTeacherSections(user.uid);
            const sectionsMap = new Map<string, Section>();
            sections.forEach((section) => {
              sectionsMap.set(section.id, section);
            });
            setSectionsCache(sectionsMap);

            // Enrich appointments with secretary and section data
            const enriched = await Promise.all(
              appointments.map(async (apt) => {
                const secretaryName = await getSecretaryName(
                  apt.secretaryUid,
                  apt.secretaryLrn,
                  apt.sectionId,
                  usersCache,
                  studentsCache
                );
                const section = sectionsMap.get(apt.sectionId);

                return {
                  id: `${apt.secretaryUid}-${apt.sectionId}-${apt.subject}`,
                  appointmentId: apt.id,
                  secretaryUid: apt.secretaryUid,
                  secretaryLrn: apt.secretaryLrn,
                  secretaryName: secretaryName.displayName,
                  secretaryEmail: secretaryName.email,
                  sectionId: apt.sectionId,
                  sectionName: section?.sectionName || "Unknown Section",
                  gradeLevel: section?.gradeLevel || "",
                  subject: apt.subject,
                  schoolYear: apt.schoolYear,
                  status: apt.status,
                  appointedAt: apt.appointedAt,
                  lastActive: formatLastActive(apt.appointedAt),
                } as SecretaryAppointment;
              })
            );

            setSecretaries(enriched);
            setIsLoading(false);
          } catch (err) {
            console.error("Error enriching appointments:", err);
            setError("Failed to load secretary data. Please try again.");
            setIsLoading(false);
          }
        },
        (err: FirestoreError) => {
          console.error("Error fetching appointments:", err);
          if (err.code === "permission-denied") {
            setError(
              "Unable to load appointments. Firestore security rules may need to be configured."
            );
          } else {
            setError("Failed to load appointments. Please try again.");
          }
          setIsLoading(false);
        }
      );
    }

    // Cleanup: Unsubscribe when component unmounts or user changes
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  // Helper function to get secretary name from cache or Firestore
  const getSecretaryName = async (
    secretaryUid: string,
    secretaryLrn: string,
    sectionId: string,
    usersCache: Map<string, UserData>,
    studentsCache: Map<string, Map<string, Student>>
  ): Promise<{ displayName: string; email: string }> => {
    // Try users cache first
    let user = usersCache.get(secretaryUid);
    if (user) {
      return { displayName: user.displayName, email: user.email };
    }

    // Fetch from Firestore
    try {
      const userProfile = await getUserProfile(secretaryUid);
      if (userProfile) {
        setUsersCache((prev) => new Map(prev).set(secretaryUid, userProfile));
        return { displayName: userProfile.displayName, email: userProfile.email };
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }

    // Fallback: Try to get from students cache
    const sectionStudents = studentsCache.get(sectionId);
    if (sectionStudents) {
      const student = sectionStudents.get(secretaryLrn);
      if (student) {
        return {
          displayName: `${student.firstName} ${student.lastName}`,
          email: `${secretaryLrn}@student.local`,
        };
      }
    }

    // Fetch students for this section
    try {
      const students = await getSectionStudents(sectionId);
      const studentsMap = new Map<string, Student>();
      students.forEach((student) => {
        studentsMap.set(student.lrn, student);
      });
      setStudentsCache((prev) => new Map(prev).set(sectionId, studentsMap));

      const student = studentsMap.get(secretaryLrn);
      if (student) {
        return {
          displayName: `${student.firstName} ${student.lastName}`,
          email: `${secretaryLrn}@student.local`,
        };
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }

    // Ultimate fallback
    return { displayName: "Unknown", email: "unknown@local" };
  };

  // Format Firestore timestamp to readable string
  const formatLastActive = (timestamp: any): string => {
    if (!timestamp) return "Unknown";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

  const activeCount = secretaries.filter((s) => s.status === "active").length;

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
      setSecretaries((prev) =>
        prev.map((sec) =>
          sec.appointmentId === appointmentId ? { ...sec, status: "removed" } : sec
        )
      );
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
      setSecretaries((prev) => prev.filter((sec) => sec.appointmentId !== appointmentId));
    } catch (error) {
      console.error("Error deleting appointment:", error);
      alert("Failed to delete appointment. Please try again.");
    }
  };

  // Handle opening the registration modal
  const handleOpenRegisterModal = () => {
    setRefreshTrigger(prev => prev + 1); // Force reload sections
    setShowRegisterModal(true);
    setGeneratedCredentials(null);
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F3FA" }}>
      <div className="flex min-h-screen">
        {/* Teacher Sidebar */}
        <TeacherSidebar />

        {/* Main Content Area */}
        <main className="flex-1 ml-0 lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
          {/* Header */}
          <TeacherHeader
            title="Secretaries"
            stats={[
              {
                label: "ACTIVE ASSISTANTS",
                value: `${activeCount.toString().padStart(2, "0")}`,
                valueColor: "#6C5CE7",
              },
            ]}
            searchPlaceholder="Search by name, subject, or section..."
            onSearch={(query) => setSearchQuery(query)}
          />

          {/* Content Canvas */}
          <div className="p-4 lg:p-8 space-y-6 lg:space-y-12">
            {/* Header Description */}
            <div className="max-w-2xl">
              <p className="text-base lg:text-lg leading-relaxed" style={{ color: "#484553" }}>
                Manage your administrative team and delegate class operations. Authorize student
                secretaries to handle attendance for specific subjects and sections.
              </p>
            </div>

            {/* Quick Status Card */}
            <div className="flex justify-start lg:justify-end mb-4 lg:mb-8">
              <div
                className="p-4 lg:p-6 rounded-3xl w-full lg:w-64 border-b-4"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#6C5CE7" }}
              >
                <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#484553" }}>
                  Active Appointments
                </p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl lg:text-5xl font-black" style={{ color: "#6C5CE7" }}>
                    {activeCount.toString().padStart(2, "0")}
                  </span>
                  <span className="text-sm lg:text-base font-medium" style={{ color: "#484553" }}>
                    {" "}
                    appointments
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ece6f1" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${secretaries.length > 0 ? (activeCount / secretaries.length) * 100 : 0}%`,
                      backgroundColor: "#00625b",
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Bento Grid of Secretaries */}
            <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-8">
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
                      {error}
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
              ) : filteredSecretaries.length === 0 ? (
                // Empty state
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="text-center px-4">
                    <span
                      className="material-symbols-outlined text-5xl lg:text-6xl mb-4"
                      style={{ color: "#cac4d6" }}
                    >
                      person_search
                    </span>
                    <h3 className="text-xl font-bold mb-2" style={{ color: "#1c1a22" }}>
                      {searchQuery ? "No matching appointments" : "No appointments yet"}
                    </h3>
                    <p className="text-sm" style={{ color: "#484553" }}>
                      {searchQuery
                        ? "Try a different search term"
                        : "Appoint your first secretary to get started"}
                    </p>
                  </div>
                </div>
              ) : (
                filteredSecretaries.map((secretary) => (
                  <div
                    key={secretary.appointmentId}
                    className="group p-4 lg:p-8 rounded-[2rem] flex flex-col justify-between transition-all"
                    style={{
                      backgroundColor: "#FFFFFF",
                      opacity: secretary.status === "removed" ? 0.8 : 1,
                      filter: secretary.status === "removed" ? "grayscale(0.5)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (secretary.status === "active") {
                        e.currentTarget.style.backgroundColor = "#F7F6FB";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (secretary.status === "active") {
                        e.currentTarget.style.backgroundColor = "#FFFFFF";
                      }
                    }}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4 lg:mb-6">
                        {/* Avatar */}
                        <div
                          className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: "#e6e0ec" }}
                        >
                          <span
                            className="material-symbols-outlined text-3xl lg:text-4xl"
                            style={{ color: "#484553" }}
                          >
                            person
                          </span>
                        </div>
                        <span
                          className="px-2 lg:px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-widest"
                          style={
                            secretary.status === "active"
                              ? { backgroundColor: "#c5fff7", color: "#00201d" }
                              : { backgroundColor: "#ffdad6", color: "#93000a" }
                          }
                        >
                          {secretary.status === "active" ? "Active" : "Removed"}
                        </span>
                      </div>

                      {/* Secretary Info */}
                      <h3 className="text-xl lg:text-2xl font-bold" style={{ color: "#1c1a22" }}>
                        {secretary.secretaryName}
                      </h3>
                      <p className="mb-2 lg:mb-4" style={{ color: "#484553" }}>
                        {secretary.subject} • {secretary.sectionName}
                      </p>
                      <p className="text-sm mb-4 lg:mb-6" style={{ color: "#484553" }}>
                        Grade {secretary.gradeLevel} • {secretary.schoolYear}
                      </p>

                      {/* Last Active */}
                      <div className="flex items-center gap-2 mb-6 lg:mb-8">
                        <span
                          className="material-symbols-outlined text-sm"
                          style={{
                            color: secretary.status === "active" ? "#6C5CE7" : "#EF4444",
                          }}
                        >
                          {secretary.status === "active" ? "history" : "block"}
                        </span>
                        <span className="text-sm italic" style={{ color: "#484553" }}>
                          {secretary.status === "active"
                            ? `Appointed: ${secretary.lastActive}`
                            : "Access revoked"}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {secretary.status === "active" ? (
                        <>
                          <button
                            className="flex-1 py-2 lg:py-3 rounded-xl font-bold text-xs lg:text-sm flex items-center justify-center gap-2 border transition-colors"
                            style={{
                              backgroundColor: "#FFFFFF",
                              color: "#484553",
                              borderColor: "transparent",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#6C5CE7";
                              e.currentTarget.style.borderColor = "#e7deff";
                              e.currentTarget.style.backgroundColor = "#e7deff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "#484553";
                              e.currentTarget.style.borderColor = "transparent";
                              e.currentTarget.style.backgroundColor = "#FFFFFF";
                            }}
                            title="View attendance records for this secretary"
                          >
                            <span className="material-symbols-outlined text-base lg:text-lg">
                              visibility
                            </span>
                            <span className="hidden sm:inline">View Records</span>
                            <span className="sm:hidden">View</span>
                          </button>
                          <button
                            className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-colors"
                            style={{ backgroundColor: "#FFFFFF", color: "#484553" }}
                            onClick={() => handleRemoveSecretary(secretary.appointmentId)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#e7deff";
                              e.currentTarget.style.color = "#6C5CE7";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#FFFFFF";
                              e.currentTarget.style.color = "#484553";
                            }}
                            title="Remove secretary from this subject"
                          >
                            <span className="material-symbols-outlined text-base lg:text-xl">
                              person_remove
                            </span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="flex-1 py-2 lg:py-3 rounded-xl font-bold text-xs lg:text-sm flex items-center justify-center gap-2 transition-colors"
                            style={{
                              backgroundColor: "#e7deff",
                              color: "#1e0061",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#6C5CE7";
                              e.currentTarget.style.color = "#FFFFFF";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#e7deff";
                              e.currentTarget.style.color = "#1e0061";
                            }}
                            title="Restore this appointment"
                          >
                            <span className="material-symbols-outlined text-base lg:text-lg">
                              power_settings_new
                            </span>
                            <span className="hidden sm:inline">Restore</span>
                          </button>
                          <button
                            className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-colors"
                            style={{ backgroundColor: "#FFFFFF", color: "#484553" }}
                            onClick={() => handleDeleteAppointment(secretary.appointmentId)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#ffdad6";
                              e.currentTarget.style.color = "#93000a";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#FFFFFF";
                              e.currentTarget.style.color = "#484553";
                            }}
                            title="Permanently delete this appointment"
                          >
                            <span className="material-symbols-outlined text-base lg:text-xl">
                              delete
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Add New Secretary Card */}
              <button
                className="border-2 border-dashed p-4 lg:p-8 rounded-[2rem] flex flex-col items-center justify-center gap-3 lg:gap-4 transition-colors cursor-pointer min-h-[280px] lg:min-h-[320px]"
                style={{ borderColor: "#cac4d6" }}
                onClick={handleOpenRegisterModal}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#6C5CE7";
                  e.currentTarget.style.color = "#6C5CE7";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#cac4d6";
                  e.currentTarget.style.color = "#484553";
                }}
                title="Create a new appointment"
              >
                <div
                  className="w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-colors group-hover:scale-110"
                  style={{ backgroundColor: "#f1ecf7" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#e7deff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f1ecf7";
                  }}
                >
                  <span className="material-symbols-outlined text-2xl lg:text-3xl">add</span>
                </div>
                <div className="text-center px-2">
                  <h4 className="text-lg font-bold mb-1" style={{ color: "#1c1a22" }}>
                    Appoint Secretary
                  </h4>
                  <p className="text-sm" style={{ color: "#484553" }}>
                    Assign a student to a subject
                  </p>
                </div>
              </button>
            </section>

            {/* Bottom Information Bar */}
            <footer className="mt-auto pt-6 lg:pt-10 flex flex-col lg:flex-row gap-4 lg:gap-6 border-t" style={{ borderColor: "#e6e0ec" }}>
              <div
                className="flex-1 p-4 lg:p-6 rounded-2xl flex items-center gap-3 lg:gap-4"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <div
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#c5fff7", color: "#00201d" }}
                >
                  <span className="material-symbols-outlined text-base lg:text-xl">security</span>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1c1a22" }}>
                    Appointment-Based Access
                  </p>
                  <p className="text-xs" style={{ color: "#484553" }}>
                    Secretaries can only log attendance for their appointed subjects and sections.
                  </p>
                </div>
              </div>
              <div
                className="flex-1 p-4 lg:p-6 rounded-2xl flex items-center gap-3 lg:gap-4"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <div
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#e6deff", color: "#1d0061" }}
                >
                  <span className="material-symbols-outlined text-base lg:text-xl">history_edu</span>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1c1a22" }}>
                    Audit Trail
                  </p>
                  <p className="text-xs" style={{ color: "#484553" }}>
                    Every attendance record is linked to the appointing teacher and secretary.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* FAB - Hidden on mobile, visible on lg+ */}
      <button
        className="hidden lg:flex fixed bottom-10 right-10 h-14 px-6 rounded-full flex items-center gap-3 transition-transform z-50"
        style={{
          background: "linear-gradient(135deg, #6C5CE7, #5A4BD6)",
          boxShadow: "0 4px 20px rgba(108, 92, 231, 0.4)",
          color: "#FFFFFF",
        }}
        onClick={handleOpenRegisterModal}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        title="Create a new appointment"
      >
        <span className="material-symbols-outlined">person_add</span>
        <span className="font-bold tracking-tight">Appoint Secretary</span>
      </button>

      {/* Mobile FAB - smaller, icon only */}
      <button
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-transform z-50 shadow-lg"
        style={{
          background: "linear-gradient(135deg, #6C5CE7, #5A4BD6)",
          color: "#FFFFFF",
        }}
        onClick={handleOpenRegisterModal}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        title="Create a new appointment"
      >
        <span className="material-symbols-outlined text-2xl">person_add</span>
      </button>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRegisterModal(false)}
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
                  onClick={() => setShowRegisterModal(false)}
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
                onSuccess={(credentials) => {
                  setGeneratedCredentials(credentials);
                }}
                onCancel={() => setShowRegisterModal(false)}
                refreshTrigger={refreshTrigger}
                createSecretaryAccount={async (displayName, email, password) => {
                  const credentials = await createSecretaryAccount(displayName, email, password);
                  setGeneratedCredentials(credentials);
                  return credentials;
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
