"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import SecretaryCreationForm from "@/components/teacher/SecretaryCreationForm";
import { SecretaryCard, ActiveSecretariesCounter } from "@/components/secretary";
import { useState, useEffect, useRef } from "react";
import {
  getTeacherAppointments,
  getSectionStudents,
  getUserProfile,
  Appointment,
  Student,
  UserData,
  updateAppointmentStatus,
  deleteAppointment,
  getTeacherSections,
  Section,
  getCachedData
} from "@/lib/firestore";
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

  // Use refs for caches to avoid re-triggering useEffect
  const sectionsCacheRef = useRef<Map<string, Section>>(new Map());
  const studentsCacheRef = useRef<Map<string, Map<string, Student>>>(new Map());
  const usersCacheRef = useRef<Map<string, UserData>>(new Map());

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Helper function to get secretary name from cache or Firestore
  const getSecretaryName = async (
    secretaryUid: string,
    secretaryLrn: string,
    sectionId: string
  ): Promise<{ displayName: string; email: string }> => {
    // Try users cache first
    const user = usersCacheRef.current.get(secretaryUid);
    if (user) {
      return { displayName: user.displayName, email: user.email };
    }

    // Fetch from Firestore
    try {
      const userProfile = await getUserProfile(secretaryUid);
      if (userProfile) {
        usersCacheRef.current.set(secretaryUid, userProfile);
        return { displayName: userProfile.displayName, email: userProfile.email };
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }

    // Fallback: Try to get from students cache
    const sectionStudents = studentsCacheRef.current.get(sectionId);
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
      studentsCacheRef.current.set(sectionId, studentsMap);

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

  // Load secretaries on mount or when refreshTrigger changes
  useEffect(() => {
    const loadSecretaries = async () => {
      if (!user?.uid) return;

      // Check cache first to avoid showing loading state
      const cachedAppointments = getCachedData<Appointment[]>(`appointments_teacher_${user.uid}`);
      const cachedSections = getCachedData<Section[]>(`sections_${user.uid}`);
      
      // If we have both caches, load immediately without showing loading
      if (cachedAppointments && cachedSections) {
        try {
          const sectionsMap = new Map<string, Section>();
          cachedSections.forEach((section) => {
            sectionsMap.set(section.id, section);
          });
          sectionsCacheRef.current = sectionsMap;

          // Enrich appointments with secretary and section data
          const enriched = await Promise.all(
            cachedAppointments.map(async (apt) => {
              const secretaryName = await getSecretaryName(
                apt.secretaryUid,
                apt.secretaryLrn,
                apt.sectionId
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
          setError(null);
          return; // Exit early - no need to fetch from Firestore
        } catch (err) {
          console.error("Error processing cached data:", err);
          // Fall through to fetch from Firestore
        }
      }

      // No cache or error processing cache - show loading and fetch from Firestore
      setIsLoading(true);
      setError(null);

      try {
        // Fetch appointments (uses cache if < 2 min old)
        const appointments = await getTeacherAppointments(user.uid, true);

        // Fetch sections for this teacher (uses cache)
        const sections = await getTeacherSections(user.uid, true);
        const sectionsMap = new Map<string, Section>();
        sections.forEach((section) => {
          sectionsMap.set(section.id, section);
        });
        sectionsCacheRef.current = sectionsMap;

        // Enrich appointments with secretary and section data
        const enriched = await Promise.all(
          appointments.map(async (apt) => {
            const secretaryName = await getSecretaryName(
              apt.secretaryUid,
              apt.secretaryLrn,
              apt.sectionId
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
        console.error("Error loading secretaries:", err);
        setError("Failed to load secretary data. Please refresh the page.");
        setIsLoading(false);
      }
    };

    loadSecretaries();
  }, [user?.uid, refreshTrigger]);

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
      setSecretaries((prev) =>
        prev.map((sec) =>
          sec.appointmentId === appointmentId ? { ...sec, status: "active" } : sec
        )
      );
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
            valueColor: "#6C5CE7",
          },
        ]}
        searchPlaceholder="Search by name, subject, or section..."
        onSearch={(query) => setSearchQuery(query)}
      />

      {/* Content Canvas */}
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
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
              ) : (
                <>
                  {filteredSecretaries.map((secretary) => (
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
                    />
                  ))}
                  {/* Add New Secretary Card */}
                  <button
                    onClick={handleOpenRegisterModal}
                    className="group border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-all min-h-[200px] hover:bg-[#f7f1fd] hover:border-[#5b3ebf] hover:text-[#5b3ebf]"
                    style={{ borderColor: "rgba(202, 196, 214, 0.5)", color: "#484553" }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-[#f1ecf7] group-hover:bg-[#e7deff]"
                    >
                      <span className="material-symbols-outlined text-2xl">add</span>
                    </div>
                    <div className="text-center px-2">
                      <h4
                        className="font-headline text-lg font-bold mb-1"
                        style={{ color: "#1c1a22" }}
                      >
                        Appoint Secretary
                      </h4>
                      <p
                        className="font-body text-xs opacity-70"
                        style={{ color: "#484553" }}
                      >
                        Assign a student to a subject
                      </p>
                    </div>
                  </button>
                </>
              )}
            </section>
          </div>

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
    </>
  );
}
