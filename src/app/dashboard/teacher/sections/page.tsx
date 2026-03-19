"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { useState, useEffect } from "react";
import { getTeacherSections, createSection, importStudentsBatch, Section, Student, deleteSection } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { ImportModal, StudentData } from "@/components/section";
import { PopupAlert } from "@/components/ui";
import { RoleGuard } from "@/hooks/useRequireRole";

// Extended section with student count
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
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sections, setSections] = useState<SectionWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingSectionData, setPendingSectionData] = useState<{
    sectionName: string;
    gradeLevel: string;
    students: StudentData[];
  } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'error' | 'success' | 'info'>('info');

  // Load sections on mount or when refreshTrigger changes
  useEffect(() => {
    const loadSections = async () => {
      if (!user?.uid) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log("Loading sections for teacher:", user.uid);
        
        // Fetch sections (uses cache if < 2 min old)
        const fetchedSections = await getTeacherSections(user.uid);
        
        console.log("Fetched sections:", fetchedSections.length);

        // Use stored studentCount, default to 0 if not set
        const sectionsWithCounts = fetchedSections.map((section) => ({
          ...section,
          studentCount: section.studentCount || 0,
        } as SectionWithCount));

        console.log("Sections with counts:", sectionsWithCounts);
        setSections(sectionsWithCounts);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading sections:", err);
        setError("Failed to load sections. Please try again.");
        setIsLoading(false);
      }
    };
    
    loadSections();
  }, [user?.uid, refreshTrigger]);

  // Calculate derived statistics
  const totalStudents = sections.reduce((sum, section) => sum + section.studentCount, 0);
  const activeSections = sections.filter((s) => s.status === "active").length;

  // Filter sections based on search query
  const filteredSections = sections.filter(
    (section) =>
      section.sectionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.schoolYear.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSectionInitial = (sectionName: string): string => {
    return sectionName.charAt(0).toUpperCase();
  };

  // Generate consistent color based on section name hash
  const getSectionColor = (sectionName: string): { bg: string; text: string; border: string; bgLight: string } => {
    const colors = [
      { bg: "#e6deff", text: "#493598", border: "#6C5CE7", bgLight: "rgba(108, 92, 231, 0.05)" },   // Purple
      { bg: "#d4f0e8", text: "#00695c", border: "#00897b", bgLight: "rgba(0, 137, 123, 0.05)" },     // Teal
      { bg: "#ffe5d0", text: "#c45c00", border: "#f57c00", bgLight: "rgba(245, 124, 0, 0.05)" },     // Amber
      { bg: "#fce4ec", text: "#ad1457", border: "#e91e63", bgLight: "rgba(233, 30, 99, 0.05)" },     // Pink
      { bg: "#e8eaf6", text: "#3949ab", border: "#3f51b5", bgLight: "rgba(63, 81, 181, 0.05)" },     // Indigo
      { bg: "#e0f7fa", text: "#006064", border: "#0097a7", bgLight: "rgba(0, 151, 167, 0.05)" },     // Cyan
      { bg: "#f3e5f5", text: "#6a1b9a", border: "#8e24aa", bgLight: "rgba(142, 36, 170, 0.05)" },    // Deep Purple
      { bg: "#e8f5e9", text: "#2e7d32", border: "#43a047", bgLight: "rgba(67, 160, 71, 0.05)" },     // Green
      { bg: "#fff8e1", text: "#f57f17", border: "#fbc02d", bgLight: "rgba(251, 192, 45, 0.05)" },    // Yellow
      { bg: "#efebe9", text: "#5d4037", border: "#795548", bgLight: "rgba(121, 85, 72, 0.05)" },     // Brown
    ];
    
    // Generate hash from section name for consistent color
    let hash = 0;
    for (let i = 0; i < sectionName.length; i++) {
      hash = sectionName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getSectionIcon = (sectionName: string): string => {
    const nameLower = sectionName.toLowerCase();
    if (nameLower.includes("math")) return "functions";
    if (nameLower.includes("history") || nameLower.includes("social"))
      return "auto_stories";
    if (
      nameLower.includes("science") ||
      nameLower.includes("bio") ||
      nameLower.includes("chem") ||
      nameLower.includes("phys")
    )
      return "biotech";
    if (
      nameLower.includes("english") ||
      nameLower.includes("language") ||
      nameLower.includes("literature")
    )
      return "menu_book";
    if (nameLower.includes("art")) return "palette";
    if (nameLower.includes("music")) return "music_note";
    if (
      nameLower.includes("pe") ||
      nameLower.includes("physical") ||
      nameLower.includes("sport")
    )
      return "sports";
    return "school";
  };

  // Handle deleting a section
  const handleDeleteSection = async (sectionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this section? This will also remove all student records. This cannot be undone."
      )
    )
      return;

    try {
      await deleteSection(sectionId, user?.uid || "");
      // Refresh sections list
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error deleting section:", error);
      alert("Failed to delete section. Please try again.");
    }
  };

  // Navigate to section details
  const handleManageSection = (sectionId: string) => {
    router.push(`/dashboard/teacher/sections/${sectionId}`);
  };

  // Handle opening the import modal
  const handleOpenModal = () => {
    setShowImportModal(true);
  };

  // Handle saving section and students
  const handleSave = (sectionName: string, gradeLevel: string, students: StudentData[]) => {
    if (!user?.uid) {
      console.error("No user logged in");
      setAlertMessage("Please log in to create a section");
      setAlertType('error');
      setShowAlert(true);
      return;
    }

    // Store the data and show confirmation dialog
    setPendingSectionData({ sectionName, gradeLevel, students });
    setShowConfirmDialog(true);
  };

  // Confirm and create section
  const confirmCreateSection = async () => {
    if (!pendingSectionData || !user?.uid) return;

    const { sectionName, gradeLevel, students } = pendingSectionData;

    try {
      // Create the section first
      console.log("Creating section:", { sectionName, gradeLevel, teacherId: user.uid });
      const sectionId = await createSection(user.uid, sectionName, gradeLevel, "2025-2026");
      console.log("Section created with ID:", sectionId);

      // Transform StudentData to Student format for batch import
      const studentData: Array<Omit<Student, "createdAt">> = students.map((s) => ({
        lrn: s.lrn,
        lastName: s.lastName,
        firstName: s.firstName,
        middleName: s.middleName || "",
        sex: s.sex === "female" ? "female" as const : s.sex === "male" ? "male" as const : "" as const,
        birthDate: s.birthDate || "",
        religion: s.religion || "",
        address: `${s.barangay || ""}, ${s.city || ""}, ${s.province || ""}`.replace(/^,\s*|\s*,\s*|,\s*$/g, ""),
        parentFather: s.fatherName || "",
        parentMother: s.motherMaidenName || "",
        guardian: s.guardianName || "",
        learningModality: s.learningModality || "",
        studentStatus: ["active", "inactive", "graduated", "dropped"].includes(s.studentStatus?.toLowerCase())
          ? s.studentStatus.toLowerCase() as "active" | "inactive" | "graduated" | "dropped"
          : "active",
      }));

      console.log("Importing students:", studentData.length);
      
      // Import students using batch
      await importStudentsBatch(sectionId, studentData);
      console.log("Students imported successfully");

      // Close modal and reset
      setShowConfirmDialog(false);
      setPendingSectionData(null);
      setShowImportModal(false);

      // Refresh sections list
      setRefreshTrigger(prev => prev + 1);

      // Show success message
      setAlertMessage(`Section "${sectionName}" created with ${students.length} student(s)!`);
      setAlertType('success');
      setShowAlert(true);

      // Sections will auto-refresh via real-time subscription
    } catch (error) {
      console.error("Error creating section:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setAlertMessage(`Failed to create section: ${errorMessage}`);
      setAlertType('error');
      setShowAlert(true);
      setShowConfirmDialog(false);
      setPendingSectionData(null);
    }
  };

  return (
    <>
      {/* Header */}
      <TeacherHeader
        title="Current Sections"
        stats={[
              { label: "TOTAL STUDENTS", value: totalStudents },
              {
                label: "ACTIVE SECTIONS",
                value: activeSections,
                valueColor: "#00625b",
              },
            ]}
            searchPlaceholder="Search by section name, grade, or school year..."
            onSearch={(query) => setSearchQuery(query)}
          />

          {/* Content Canvas */}
          <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
            {/* Bento Grid of Classes */}
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
                      Loading sections...
                    </p>
                  </div>
                </div>
              ) : filteredSections.length === 0 ? (
                // Empty state - show nothing, the "Add New Section" card will be visible
                <></>
              ) : (
                filteredSections.map((section) => {
                  const sectionColor = getSectionColor(section.sectionName);
                  const sectionInitial = getSectionInitial(section.sectionName);
                  
                  return (
                  <div
                    key={section.id}
                    className="group rounded-xl p-4 transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col shadow-sm hover:shadow-md border-l-4"
                    style={{ 
                      backgroundColor: "#ffffff",
                      borderColor: sectionColor.border
                    }}
                  >
                    {/* Background glow effect */}
                    <div
                      className="absolute top-0 right-0 w-20 h-20 -mr-8 -mt-8 rounded-full blur-2xl"
                      style={{
                        backgroundColor: sectionColor.bgLight
                      }}
                    ></div>

                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-3 relative z-10">
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
                                className="font-label text-[10px] font-bold py-0.5 px-2 rounded-full"
                                style={{ backgroundColor: "#c5fff7", color: "#00201d" }}
                              >
                                ACTIVE
                              </span>
                            ) : section.status === "archived" ? (
                              <span
                                className="font-label text-[10px] font-bold py-0.5 px-2 rounded-full"
                                style={{ backgroundColor: "#f3f4f6", color: "#6B7280" }}
                              >
                                ARCHIVED
                              </span>
                            ) : (
                              <span
                                className="font-label text-[10px] font-bold py-0.5 px-2 rounded-full"
                                style={{ backgroundColor: "#ffdad6", color: "#93000a" }}
                              >
                                INACTIVE
                              </span>
                            )}
                          </div>
                          <p
                            className="font-body text-[10px]"
                            style={{ color: "#9CA3AF" }}
                          >
                            Grade {section.gradeLevel} • {section.schoolYear}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Student Count - Enhanced */}
                    <div className="mb-4">
                      <div
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ backgroundColor: "#f7f6fb" }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: sectionColor.bg, color: sectionColor.text }}
                          >
                            <span className="material-symbols-outlined text-lg">people</span>
                          </div>
                          <div>
                            <p className="text-2xl font-bold" style={{ color: "#6C5CE7" }}>
                              {section.studentCount}
                            </p>
                            <p className="text-[10px]" style={{ color: "#484553" }}>
                              Students enrolled
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      className="mt-auto flex justify-between items-center pt-3 border-t"
                      style={{ borderColor: "rgba(202, 196, 214, 0.3)" }}
                    >
                      <div
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "#484553" }}
                      >
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        <span>Created: </span>
                        <span className="font-bold">
                          {section.createdAt
                            ? new Date(
                                typeof section.createdAt === 'object' && 'seconds' in section.createdAt
                                  ? (section.createdAt as any).seconds * 1000
                                  : section.createdAt
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                          style={{ backgroundColor: "#F7F6FB", color: "#9CA3AF" }}
                          onClick={() => handleDeleteSection(section.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#ffdad6";
                            e.currentTarget.style.color = "#93000a";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#F7F6FB";
                            e.currentTarget.style.color = "#9CA3AF";
                          }}
                          title="Delete section"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                        <button
                          className="font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1"
                          style={{ backgroundColor: sectionColor.border, color: "#FFFFFF" }}
                          onClick={() => handleManageSection(section.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.9";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          MANAGE
                          <span className="material-symbols-outlined text-sm">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })
              )}

              {/* Add New Class Button */}
              <button
                onClick={handleOpenModal}
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
                    Add New Section
                  </h4>
                  <p
                    className="font-body text-xs opacity-70"
                    style={{ color: "#484553" }}
                  >
                    Create a new class section
                  </p>
                </div>
              </button>
            </section>
          </div>

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
            {/* Header */}
            <div
              className="px-6 py-4"
              style={{ backgroundColor: '#F0EDF7' }}
            >
              <h3 className="text-xl font-bold" style={{ color: '#1F1F1F' }}>
                Confirm Section Creation
              </h3>
            </div>

            {/* Body */}
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

            {/* Footer */}
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
    </>
  );
}
