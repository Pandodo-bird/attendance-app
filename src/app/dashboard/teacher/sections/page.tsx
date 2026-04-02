"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { RoleGuard } from "@/hooks/useRequireRole";
import { useState, useMemo } from "react";
import {
  getTeacherSections,
  createSection,
  importStudentsBatch,
  Section,
  Student,
  getSectionById,
  getSectionStudents,
  updateSection,
  addStudentToSection,
  getTeacherAppointments,
  getUserProfilesBatch,
  UserData,
} from "@/lib/firestore";
import { AddStudentModal, ImportModal, StudentData, SectionDetailModal } from "@/components/teacher/sections";
import { PopupAlert } from "@/components/ui";
import { motion } from "framer-motion";
import { Plus, Users, Building2, Search } from "lucide-react";
import StudentProfileDrawer, { StudentProfile } from "@/components/teacher/students/StudentProfileDrawer";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface SectionWithCount extends Section {
  studentCount: number;
}

export default function SectionsPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="teacher">
        <SectionsContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function SectionsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: sectionsData = [], isLoading, error } = useQuery({
    queryKey: ["sections", user?.uid],
    queryFn: () => getTeacherSections(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const sections: SectionWithCount[] = sectionsData.map((section) => ({
    ...section,
    studentCount: section.studentCount || 0,
  } as SectionWithCount));

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", user?.uid],
    queryFn: () => getTeacherAppointments(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const secretaryUids = useMemo(
    () =>
      Array.from(
        new Set(
          appointments
            .filter((appointment) => appointment.status === "active")
            .map((appointment) => appointment.secretaryUid)
        )
      ),
    [appointments]
  );

  const { data: secretaryProfiles = new Map<string, UserData>() } = useQuery({
    queryKey: ["secretaryProfiles", user?.uid, secretaryUids],
    queryFn: () => getUserProfilesBatch(secretaryUids),
    enabled: !!user?.uid && secretaryUids.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingSectionData, setPendingSectionData] = useState<{
    sectionName: string;
    gradeLevel: string;
    students: StudentData[];
  } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success" | "info">("info");

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentSectionId, setAddStudentSectionId] = useState<string | null>(null);

  const { data: selectedSection } = useQuery({
    queryKey: ["section", selectedSectionId],
    queryFn: () => getSectionById(selectedSectionId!),
    enabled: !!selectedSectionId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: sectionStudents = [] } = useQuery({
    queryKey: ["sectionStudents", selectedSectionId],
    queryFn: () => getSectionStudents(selectedSectionId!),
    enabled: !!selectedSectionId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const { data: addStudentSection } = useQuery({
    queryKey: ["section", addStudentSectionId],
    queryFn: () => getSectionById(addStudentSectionId!),
    enabled: !!addStudentSectionId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: addStudentSectionStudents = [] } = useQuery({
    queryKey: ["sectionStudents", addStudentSectionId],
    queryFn: () => getSectionStudents(addStudentSectionId!),
    enabled: !!addStudentSectionId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const sortedSectionStudents = useMemo(() => {
    return [...sectionStudents].sort((a, b) => {
      const lastCompare = a.lastName.localeCompare(b.lastName);
      if (lastCompare !== 0) return lastCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  }, [sectionStudents]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

  const totalStudents = sections.reduce((sum, section) => sum + section.studentCount, 0);
  const activeSections = sections.filter((s) => s.status === "active").length;

  const filteredSections = sections.filter(
    (section) =>
      section.sectionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.schoolYear.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeAppointmentsBySection = useMemo(() => {
    const map = new Map<string, typeof appointments>();
    appointments.forEach((appointment) => {
      if (appointment.status !== "active") return;
      const existing = map.get(appointment.sectionId) ?? [];
      existing.push(appointment);
      map.set(appointment.sectionId, existing);
    });
    return map;
  }, [appointments]);

  const handleOpenModal = () => {
    setShowImportModal(true);
  };

  const getSectionInitial = (sectionName: string): string => {
    return sectionName.charAt(0).toUpperCase();
  };

  const getSectionColor = (sectionName: string): { bg: string; text: string; border: string; bgLight: string } => {
    const colors = [
      { bg: "#e6deff", text: "#493598", border: "#6C5CE7", bgLight: "rgba(108, 92, 231, 0.05)" },
      { bg: "#d4f0e8", text: "#00695c", border: "#00897b", bgLight: "rgba(0, 137, 123, 0.05)" },
      { bg: "#ffe5d0", text: "#c45c00", border: "#f57c00", bgLight: "rgba(245, 124, 0, 0.05)" },
      { bg: "#fce4ec", text: "#ad1457", border: "#e91e63", bgLight: "rgba(233, 30, 99, 0.05)" },
      { bg: "#e8eaf6", text: "#3949ab", border: "#3f51b5", bgLight: "rgba(63, 81, 181, 0.05)" },
      { bg: "#e0f7fa", text: "#006064", border: "#0097a7", bgLight: "rgba(0, 151, 167, 0.05)" },
      { bg: "#f3e5f5", text: "#6a1b9a", border: "#8e24aa", bgLight: "rgba(142, 36, 170, 0.05)" },
      { bg: "#e8f5e9", text: "#2e7d32", border: "#43a047", bgLight: "rgba(67, 160, 71, 0.05)" },
      { bg: "#fff8e1", text: "#f57f17", border: "#fbc02d", bgLight: "rgba(251, 192, 45, 0.05)" },
      { bg: "#efebe9", text: "#5d4037", border: "#795548", bgLight: "rgba(121, 85, 72, 0.05)" },
    ];

    let hash = 0;
    for (let i = 0; i < sectionName.length; i++) {
      hash = sectionName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const handleManageSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
  };

  const handleEditSection = async (updates: Partial<Section>) => {
    if (!selectedSectionId) return;

    try {
      await updateSection(selectedSectionId, updates);
      queryClient.invalidateQueries({ queryKey: ["section", selectedSectionId] });
      queryClient.invalidateQueries({ queryKey: ["sections", user?.uid] });
    } catch (error) {
      console.error("Error updating section:", error);
      throw error;
    }
  };

  const handleAddStudent = async (sectionId: string, student: Omit<Student, "createdAt">) => {
    await addStudentToSection(sectionId, student);
    queryClient.invalidateQueries({ queryKey: ["sectionStudents", sectionId] });
    queryClient.invalidateQueries({ queryKey: ["section", sectionId] });
    queryClient.invalidateQueries({ queryKey: ["sections", user?.uid] });
  };

  const handleViewStudent = (student: Student) => {
    const section = selectedSection;
    const fullProfile: StudentProfile = {
      lrn: student.lrn,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      sectionName: section?.sectionName || "",
      gradeLevel: section?.gradeLevel || "",
      sex: student.sex,
      learningModality: student.learningModality,
      studentStatus: student.studentStatus,
      birthDate: student.birthDate || new Date(),
      religion: student.religion || "",
      barangay: student.barangay || "",
      city: student.city || "",
      province: student.province || "",
      fatherName: student.fatherName || "",
      motherMaidenName: student.motherMaidenName || "",
      guardianName: student.guardianName || "",
      guardianRelationship: student.guardianRelationship || "",
      guardianContactNumber: student.guardianContactNumber || "",
    };
    setSelectedStudent(fullProfile);
    setIsDrawerOpen(true);
    handleCloseSectionModal();
  };

  const handleCloseSectionModal = () => {
    setSelectedSectionId(null);
  };

  const handleOpenAddStudentModal = () => {
    if (!selectedSectionId) return;
    setAddStudentSectionId(selectedSectionId);
    setShowAddStudentModal(true);
    setSelectedSectionId(null);
  };

  const handleCloseAddStudentModal = () => {
    setShowAddStudentModal(false);
    setAddStudentSectionId(null);
  };

  const handleSubmitAddStudent = async (student: Omit<Student, "createdAt">) => {
    if (!addStudentSectionId) {
      throw new Error("No section selected for student insertion.");
    }
    await handleAddStudent(addStudentSectionId, student);
    setAlertMessage("Student added successfully.");
    setAlertType("success");
    setShowAlert(true);
  };

  const handleSave = (sectionName: string, gradeLevel: string, students: StudentData[]) => {
    if (!user?.uid) {
      setAlertMessage("Please log in to create a section");
      setAlertType('error');
      setShowAlert(true);
      return;
    }

    setPendingSectionData({ sectionName, gradeLevel, students });
    setShowConfirmDialog(true);
  };

  const confirmCreateSection = async () => {
    if (!pendingSectionData || !user?.uid) return;

    const { sectionName, gradeLevel, students } = pendingSectionData;

    try {
      const sectionId = await createSection(user.uid, sectionName, gradeLevel, "2025-2026");

      const studentData: Array<Omit<Student, "createdAt">> = students.map((s) => ({
        lrn: s.lrn,
        lastName: s.lastName,
        firstName: s.firstName,
        middleName: s.middleName || "",
        sex: s.sex === "female" ? "female" as const : s.sex === "male" ? "male" as const : "" as const,
        birthDate: s.birthDate || "",
        religion: s.religion || "",
        barangay: s.barangay || "",
        city: s.city || "",
        province: s.province || "",
        fatherName: s.fatherName || "",
        motherMaidenName: s.motherMaidenName || "",
        guardianName: s.guardianName || "",
        guardianRelationship: s.guardianRelationship || "",
        guardianContactNumber: s.guardianContactNumber || "",
        learningModality: s.learningModality || "",
        studentStatus: ["active", "inactive", "graduated", "dropped"].includes(s.studentStatus?.toLowerCase())
          ? s.studentStatus.toLowerCase() as "active" | "inactive" | "graduated" | "dropped"
          : "active",
      }));

      await importStudentsBatch(sectionId, studentData);

      setShowConfirmDialog(false);
      setPendingSectionData(null);
      setShowImportModal(false);

      queryClient.invalidateQueries({ queryKey: ["sections", user.uid] });

      setAlertMessage(`Section "${sectionName}" created with ${students.length} student(s)!`);
      setAlertType("success");
      setShowAlert(true);
    } catch (error) {
      console.error("Error creating section:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setAlertMessage(`Failed to create section: ${errorMessage}`);
      setAlertType("error");
      setShowAlert(true);
      setShowConfirmDialog(false);
      setPendingSectionData(null);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #F7FBFF 0%, #EEF5FF 58%, #E8F0FB 100%)",
          borderBottom: "1px solid #D7E2EF",
        }}
      >
        <div className="p-4 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: "#56738F" }}>
                Section Management
              </p>
              <h1 className="mt-3 text-2xl font-bold leading-tight lg:text-3xl" style={{ color: "#102A43" }}>
                Organize and manage your class sections
              </h1>
              <p className="mt-3 max-w-3xl text-sm lg:text-[15px]" style={{ color: "#486581" }}>
                Create sections, import students, and manage class rosters all in one place.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
              <motion.div
                className="rounded-2xl border px-4 py-3"
                style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.25 }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#829AB1" }}>
                  Total Students
                </p>
                <p className="mt-2 text-2xl font-bold" style={{ color: "#102A43" }}>
                  {isLoading ? "-" : totalStudents}
                </p>
              </motion.div>
              <motion.div
                className="rounded-2xl border px-4 py-3"
                style={{ backgroundColor: "rgba(16,42,67,0.06)", borderColor: "#C9D9EA" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#627D98" }}>
                  Active Sections
                </p>
                <p className="mt-2 text-2xl font-bold" style={{ color: "#102A43" }}>
                  {isLoading ? "-" : activeSections}
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Canvas */}
      <motion.div
        className="p-4 lg:p-8 space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Search and Action Bar */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by section name, grade, or school year..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
                  style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#1F1F1F" }}
                />
              </div>
            </div>

            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors shrink-0"
              style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#152C49";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#1E3A5F";
              }}
            >
              <Plus size={16} strokeWidth={2} />
              <span>New Section</span>
            </button>
          </div>
        </div>

        {/* Section Cards Grid */}
        {error ? (
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
                {error instanceof Error ? error.message : "Failed to load sections. Please try again."}
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-8 h-8 border-4 rounded-full animate-spin"
                style={{ borderColor: "#6C5CE7", borderTopColor: "#e7deff" }}
              ></div>
              <p className="text-sm" style={{ color: "#484553" }}>
                Loading sections...
              </p>
            </div>
          </div>
        ) : filteredSections.length === 0 ? (
          <div
            className="rounded-xl border p-12 flex flex-col items-center justify-center gap-4"
            style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#F0EDF7" }}
            >
              <Building2 size={32} style={{ color: "#6C5CE7" }} />
            </div>
            <div className="text-center">
              <p className="text-base font-medium" style={{ color: "#1F1F1F" }}>
                {searchQuery ? "No sections match your search" : "No sections yet"}
              </p>
              <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>
                {searchQuery ? "Try adjusting your search terms" : "Click \"New Section\" to get started"}
              </p>
            </div>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filteredSections.map((section, index) => {
              const sectionColor = getSectionColor(section.sectionName);
              const sectionInitial = getSectionInitial(section.sectionName);

              return (
                <motion.div
                  key={section.id}
                  className="group rounded-xl p-5 relative overflow-hidden flex flex-col cursor-pointer"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
                  whileHover={{
                    borderColor: "#D1D5DB",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  onClick={() => handleManageSection(section.id)}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-xl"
                        style={{
                          backgroundColor: sectionColor.bg,
                          color: sectionColor.text
                        }}
                      >
                        {sectionInitial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className="font-headline text-lg font-bold"
                            style={{ color: "#1c1a22" }}
                          >
                            Section {section.sectionName}
                          </h4>
                          {section.status === "active" ? (
                            <span
                              className="text-[10px] font-medium py-0.5 px-2 rounded-full"
                              style={{ backgroundColor: "#DCFCE7", color: "#166534" }}
                            >
                              Active
                            </span>
                          ) : section.status === "archived" ? (
                            <span
                              className="text-[10px] font-medium py-0.5 px-2 rounded-full"
                              style={{ backgroundColor: "#F1F5F9", color: "#64748B" }}
                            >
                              Archived
                            </span>
                          ) : (
                            <span
                              className="text-[10px] font-medium py-0.5 px-2 rounded-full"
                              style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}
                            >
                              Inactive
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs font-medium mt-0.5"
                          style={{ color: "#64748B" }}
                        >
                          Grade {section.gradeLevel} • {section.schoolYear}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={16} style={{ color: "#64748B" }} />
                      <div>
                        <p className="text-lg font-bold" style={{ color: "#0F172A" }}>
                          {section.studentCount}
                        </p>
                        <p className="text-xs" style={{ color: "#64748B" }}>
                          Students
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Appointed Secretary */}
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "#64748B" }}>
                      Secretary
                    </p>
                    {(() => {
                      const sectionAppointments = activeAppointmentsBySection.get(section.id) ?? [];
                      if (sectionAppointments.length === 0) {
                        return (
                          <p className="text-sm" style={{ color: "#94A3B8" }}>
                            Not appointed
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-0.5">
                          {sectionAppointments.map((appointment) => {
                            const profile = secretaryProfiles.get(appointment.secretaryUid);
                            return (
                              <p
                                key={appointment.id}
                                className="text-sm font-medium"
                                style={{ color: "#0F172A" }}
                              >
                                {profile?.displayName || `Secretary ${appointment.secretaryLrn}`}
                              </p>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer */}
                  <div
                    className="mt-auto pt-3 border-t flex items-center justify-between"
                    style={{ borderColor: "#F1F5F9" }}
                  >
                    <span className="text-xs" style={{ color: "#64748B" }}>
                      Created: {section.createdAt
                        ? new Date(
                            typeof section.createdAt === 'object' && 'seconds' in section.createdAt
                              ? (section.createdAt as { seconds: number }).seconds * 1000
                              : section.createdAt
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#1E3A5F" }}>
                      Open
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </section>
        )}
      </motion.div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSave={handleSave}
      />

      {/* Popup Alert */}
      {showAlert && (
        <PopupAlert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && pendingSectionData && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div
              className="px-6 py-4"
              style={{ backgroundColor: '#F0EDF7' }}
            >
              <h3 className="text-xl font-bold" style={{ color: '#1F1F1F' }}>
                Confirm Section Creation
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: '#6B6B6B' }}>SECTION NAME</p>
                <p className="text-sm" style={{ color: '#1F1F1F' }}>{pendingSectionData.sectionName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: '#6B6B6B' }}>GRADE LEVEL</p>
                  <p className="text-sm" style={{ color: '#1F1F1F' }}>Grade {pendingSectionData.gradeLevel}</p>
                </div>
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: '#6B6B6B' }}>SCHOOL YEAR</p>
                  <p className="text-sm" style={{ color: '#1F1F1F' }}>2025-2026</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: '#6B6B6B' }}>NUMBER OF STUDENTS</p>
                <p className="text-lg font-bold" style={{ color: '#6C5CE7' }}>{pendingSectionData.students.length} student(s)</p>
              </div>
            </div>

            <div
              className="px-6 py-4 flex items-center justify-end gap-3"
              style={{ backgroundColor: '#F0EDF7' }}
            >
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingSectionData(null);
                }}
                className="px-5 py-2.5 rounded-xl font-bold transition-all hover:bg-[#F7F6FB]"
                style={{ backgroundColor: '#FFFFFF', color: '#6B6B6B' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateSection}
                className="px-5 py-2.5 rounded-xl font-bold transition-all hover:bg-[#5A4BD6]"
                style={{ backgroundColor: '#6C5CE7', color: '#FFFFFF' }}
              >
                Create Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Detail Modal */}
      <SectionDetailModal
        isOpen={!!selectedSectionId}
        onClose={handleCloseSectionModal}
        section={selectedSection || null}
        students={sortedSectionStudents}
        onEditSection={handleEditSection}
        onViewStudent={handleViewStudent}
        onOpenAddStudent={handleOpenAddStudentModal}
      />

      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={handleCloseAddStudentModal}
        sectionName={addStudentSection?.sectionName || ""}
        existingStudents={addStudentSectionStudents}
        onSubmit={handleSubmitAddStudent}
      />

      {/* Student Profile Drawer */}
      <StudentProfileDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />
    </>
  );
}
