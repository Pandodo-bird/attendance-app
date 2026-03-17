"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherSidebar from "@/components/TeacherSidebar";
import TeacherHeader from "@/components/TeacherHeader";
import { useState, useEffect } from "react";
import {
  subscribeToSections,
  getSectionStudents,
  Section,
  Student,
  deleteSection
} from "@/lib/firestore";
import { Unsubscribe, FirestoreError } from "firebase/firestore";
import { useRouter } from "next/navigation";

// Extended section with student count
interface SectionWithCount extends Section {
  studentCount: number;
}

export default function SectionsPage() {
  return (
    <AuthGuard>
      <SectionsContent />
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

  // Real-time subscription to sections data with student counts
  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user?.uid) {
      setIsLoading(true);
      setError(null);

      // Subscribe to real-time updates for teacher's sections
      unsubscribe = subscribeToSections(
        user.uid,
        async (fetchedSections) => {
          try {
            // Enrich sections with student counts
            const sectionsWithCounts = await Promise.all(
              fetchedSections.map(async (section) => {
                const students = await getSectionStudents(section.id);
                return {
                  ...section,
                  studentCount: students.length,
                } as SectionWithCount;
              })
            );

            setSections(sectionsWithCounts);
            setIsLoading(false);
          } catch (err) {
            console.error("Error fetching student counts:", err);
            setError("Failed to load section data. Please try again.");
            setIsLoading(false);
          }
        },
        (err: FirestoreError) => {
          console.error("Error fetching sections:", err);
          if (err.code === "permission-denied") {
            setError(
              "Unable to load sections. Firestore security rules may need to be configured."
            );
          } else {
            setError("Failed to load sections. Please try again.");
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
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    } catch (error) {
      console.error("Error deleting section:", error);
      alert("Failed to delete section. Please try again.");
    }
  };

  // Navigate to section details
  const handleManageSection = (sectionId: string) => {
    router.push(`/dashboard/teacher/sections/${sectionId}`);
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
          <div className="p-4 lg:p-8 space-y-6 lg:space-y-12">
            {/* Header Description */}
            <div className="max-w-2xl">
              <p className="text-base lg:text-lg leading-relaxed" style={{ color: "#484553" }}>
                Manage your class sections. Add students, appoint secretaries, and track attendance
                for each section.
              </p>
            </div>

            {/* Bento Grid of Classes */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
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
                // Empty state
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="text-center px-4">
                    <span
                      className="material-symbols-outlined text-5xl lg:text-6xl mb-4"
                      style={{ color: "#cac4d6" }}
                    >
                      class
                    </span>
                    <h3 className="text-xl font-bold mb-2" style={{ color: "#1c1a22" }}>
                      {searchQuery ? "No matching sections" : "No sections yet"}
                    </h3>
                    <p className="text-sm" style={{ color: "#484553" }}>
                      {searchQuery
                        ? "Try a different search term"
                        : "Create your first section to get started"}
                    </p>
                  </div>
                </div>
              ) : (
                filteredSections.map((section) => (
                  <div
                    key={section.id}
                    className="group rounded-xl p-4 lg:p-6 transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col"
                    style={{ backgroundColor: "#ffffff" }}
                  >
                    {/* Background glow effect */}
                    <div
                      className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 -mr-12 lg:-mr-16 -mt-12 lg:-mt-16 rounded-full blur-3xl"
                      style={{
                        backgroundColor:
                          section.status === "inactive"
                            ? "rgba(239, 68, 68, 0.05)"
                            : "rgba(108, 92, 231, 0.05)",
                      }}
                    ></div>

                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-6 lg:mb-8 relative z-10">
                      <div
                        className="p-2 lg:p-3 rounded-lg"
                        style={{ backgroundColor: "#e6deff", color: "#493598" }}
                      >
                        <span className="material-symbols-outlined text-base lg:text-xl">
                          {getSectionIcon(section.sectionName)}
                        </span>
                      </div>
                      {section.status === "active" ? (
                        <span
                          className="font-label text-[10px] font-bold py-1 px-3 rounded-full"
                          style={{ backgroundColor: "#c5fff7", color: "#00201d" }}
                        >
                          ACTIVE
                        </span>
                      ) : section.status === "archived" ? (
                        <span
                          className="font-label text-[10px] font-bold py-1 px-3 rounded-full"
                          style={{ backgroundColor: "#e6e0ec", color: "#484553" }}
                        >
                          ARCHIVED
                        </span>
                      ) : (
                        <span
                          className="font-label text-[10px] font-bold py-1 px-3 rounded-full"
                          style={{ backgroundColor: "#ffdad6", color: "#93000a" }}
                        >
                          INACTIVE
                        </span>
                      )}
                    </div>

                    {/* Section Info */}
                    <h4
                      className="font-headline text-xl lg:text-2xl font-bold mb-1"
                      style={{ color: "#1c1a22" }}
                    >
                      {section.sectionName}
                    </h4>
                    <p
                      className="font-body text-sm mb-4 lg:mb-6"
                      style={{ color: "#484553" }}
                    >
                      Grade {section.gradeLevel} • {section.schoolYear}
                    </p>

                    {/* Student Count */}
                    <div className="space-y-3 lg:space-y-4 mb-6 lg:mb-8">
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: "#f7f6fb" }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "#e6deff", color: "#493598" }}
                        >
                          <span className="material-symbols-outlined text-lg">people</span>
                        </div>
                        <div>
                          <p className="text-2xl font-bold" style={{ color: "#6C5CE7" }}>
                            {section.studentCount}
                          </p>
                          <p className="text-xs" style={{ color: "#484553" }}>
                            Students enrolled
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      className="mt-auto flex justify-between items-center pt-4 border-t"
                      style={{ borderColor: "rgba(202, 196, 214, 0.3)" }}
                    >
                      <div
                        className="flex items-center gap-2 text-xs"
                        style={{ color: "#484553" }}
                      >
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        <span className="truncate">
                          Created {new Date(section.createdAt as any).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                          style={{ backgroundColor: "#FFFFFF", color: "#484553" }}
                          onClick={() => handleDeleteSection(section.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#ffdad6";
                            e.currentTarget.style.color = "#93000a";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#FFFFFF";
                            e.currentTarget.style.color = "#484553";
                          }}
                          title="Delete section"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                        <button
                          className="font-bold text-xs flex items-center gap-1 hover:underline transition-colors whitespace-nowrap"
                          style={{ color: "#5b3ebf" }}
                          onClick={() => handleManageSection(section.id)}
                        >
                          MANAGE{" "}
                          <span className="material-symbols-outlined text-xs">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Add New Class Button */}
              <button
                className="group border-2 border-dashed rounded-xl p-4 lg:p-6 flex flex-col items-center justify-center gap-3 lg:gap-4 transition-all min-h-[280px] lg:min-h-[320px]"
                style={{ borderColor: "rgba(202, 196, 214, 0.5)", color: "#484553" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f7f1fd";
                  e.currentTarget.style.borderColor = "#5b3ebf";
                  e.currentTarget.style.color = "#5b3ebf";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderColor = "rgba(202, 196, 214, 0.5)";
                  e.currentTarget.style.color = "#484553";
                }}
              >
                <div
                  className="w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: "#f1ecf7" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#e7deff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f1ecf7")
                  }
                >
                  <span className="material-symbols-outlined text-2xl lg:text-3xl">add</span>
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

            {/* Bottom Information Bar */}
            <footer className="mt-auto pt-6 lg:pt-10 flex flex-col lg:flex-row gap-4 lg:gap-6 border-t" style={{ borderColor: "#e6e0ec" }}>
              <div
                className="flex-1 p-4 lg:p-6 rounded-2xl flex items-center gap-3 lg:gap-4"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <div
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#e6deff", color: "#1d0061" }}
                >
                  <span className="material-symbols-outlined text-base lg:text-xl">folder</span>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1c1a22" }}>
                    Student Records
                  </p>
                  <p className="text-xs" style={{ color: "#484553" }}>
                    Each section has its own student roster stored in Firestore.
                  </p>
                </div>
              </div>
              <div
                className="flex-1 p-4 lg:p-6 rounded-2xl flex items-center gap-3 lg:gap-4"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <div
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#c5fff7", color: "#00201d" }}
                >
                  <span className="material-symbols-outlined text-base lg:text-xl">link</span>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1c1a22" }}>
                    Appointment-Based
                  </p>
                  <p className="text-xs" style={{ color: "#484553" }}>
                    Link student secretaries to specific subjects and sections.
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
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <span className="material-symbols-outlined">add_circle</span>
        <span className="font-bold tracking-tight">Create Section</span>
      </button>

      {/* Mobile FAB - smaller, icon only */}
      <button
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-transform z-50 shadow-lg"
        style={{
          background: "linear-gradient(135deg, #6C5CE7, #5A4BD6)",
          color: "#FFFFFF",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>
    </div>
  );
}
