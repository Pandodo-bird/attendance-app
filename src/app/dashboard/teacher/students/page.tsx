"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { RoleGuard } from "@/hooks/useRequireRole";
import { PopupAlert } from "@/components/ui";
import {
  getAllTeacherStudents,
  updateStudent,
  deleteStudent,
  checkStudentHasActiveSecretaryAppointment,
} from "@/lib/firestore";
import SearchBar from "@/components/teacher/students/SearchBar";
import FilterRow, { StudentRow } from "@/components/teacher/students/FilterRow";
import StudentResultsTable from "@/components/teacher/students/StudentResultsTable";
import StudentProfileDrawer, { StudentProfile } from "@/components/teacher/students/StudentProfileDrawer";
import StudentDeleteDialog from "@/components/teacher/students/StudentDeleteDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function StudentsPage() {
  return (
    <AuthGuard>
      <RoleGuard requiredRole="teacher">
        <StudentsContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function StudentsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // TanStack Query for students (moderate changes - 10 min cache)
  const { data: allStudents = [], isLoading: loading, error } = useQuery({
    queryKey: ["students", user?.uid],
    queryFn: () => getAllTeacherStudents(user?.uid || "", true),
    enabled: !!user?.uid,
    staleTime: 10 * 60 * 1000, // 10 minutes - students may get added/removed
    gcTime: 20 * 60 * 1000, // 20 minutes
  });

  // Transform to StudentRow format
  const students: StudentRow[] = allStudents.map(({ sectionId, sectionName, gradeLevel, student }) => ({
    lrn: student.lrn,
    firstName: student.firstName,
    lastName: student.lastName,
    middleName: student.middleName,
    sectionId,
    sectionName,
    gradeLevel,
    sex: student.sex,
    learningModality: student.learningModality,
    studentStatus: student.studentStatus,
    birthDate: student.birthDate,
    religion: student.religion,
    barangay: student.barangay,
    city: student.city,
    province: student.province,
    fatherName: student.fatherName,
    motherMaidenName: student.motherMaidenName,
    guardianName: student.guardianName,
    guardianRelationship: student.guardianRelationship,
    guardianContactNumber: student.guardianContactNumber,
  }));

  // Calculate stats from loaded data (no extra queries needed)
  const totalStudents = allStudents.length;
  const uniqueSectionIds = new Set(allStudents.map(s => s.sectionId));
  const activeSections = uniqueSectionIds.size;

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterSex, setFilterSex] = useState("");
  const [filterModality, setFilterModality] = useState("");

  // Load filters from URL or localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem(`students_filters_${user?.uid}`);
    const urlSearch = searchParams?.get("search");
    const urlSection = searchParams?.get("section");
    const urlSex = searchParams?.get("sex");
    const urlModality = searchParams?.get("modality");

    if (urlSearch || urlSection || urlSex || urlModality) {
      // URL params take priority
      if (urlSearch) setSearchQuery(urlSearch);
      if (urlSection) setFilterSection(urlSection);
      if (urlSex) setFilterSex(urlSex);
      if (urlModality) setFilterModality(urlModality);
    } else if (savedFilters) {
      // Fall back to localStorage
      try {
        const parsed = JSON.parse(savedFilters);
        if (parsed.searchQuery) setSearchQuery(parsed.searchQuery);
        if (parsed.filterSection) setFilterSection(parsed.filterSection);
        if (parsed.filterSex) setFilterSex(parsed.filterSex);
        if (parsed.filterModality) setFilterModality(parsed.filterModality);
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }
  }, [user?.uid]);

  // Save filters to localStorage and URL whenever they change
  useEffect(() => {
    const filters = {
      searchQuery,
      filterSection,
      filterSex,
      filterModality,
    };
    localStorage.setItem(`students_filters_${user?.uid}`, JSON.stringify(filters));

    // Sync to URL
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (filterSection) params.set("section", filterSection);
    if (filterSex) params.set("sex", filterSex);
    if (filterModality) params.set("modality", filterModality);

    const queryString = params.toString();
    if (queryString) {
      router.push(`/dashboard/teacher/students?${queryString}`, { scroll: false });
    } else {
      router.push("/dashboard/teacher/students", { scroll: false });
    }
  }, [searchQuery, filterSection, filterSex, filterModality, user?.uid, router]);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Use error from query or local error
  const displayError = error?.message || localError;

  // Handle viewing a student
  const handleViewStudent = useCallback((student: StudentRow) => {
    const fullProfile: StudentProfile = {
      lrn: student.lrn,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      sectionName: student.sectionName,
      gradeLevel: student.gradeLevel,
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
  }, []);

  // Handle editing a student
  const handleEditStudent = useCallback((student: StudentRow) => {
    const fullProfile: StudentProfile = {
      lrn: student.lrn,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      sectionName: student.sectionName,
      gradeLevel: student.gradeLevel,
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
  }, []);

  // Handle save from drawer
  const handleSaveStudent = useCallback(async (updates: Partial<StudentProfile>) => {
    if (!selectedStudent || !user) return;

    console.log("💾 Saving student updates:", { selectedStudent, updates });

    try {
      // Find the section for this student
      const studentData = students.find(s => s.lrn === selectedStudent.lrn);
      console.log("📋 Student data found:", studentData);
      
      if (!studentData) throw new Error("Student not found");

      // Use sectionId (document ID) for Firestore operations
      console.log("📝 Calling updateStudent with:", { sectionId: studentData.sectionId, lrn: selectedStudent.lrn, updates });
      await updateStudent(studentData.sectionId, selectedStudent.lrn, updates);

      // Invalidate queries to refetch fresh data
      console.log("♻️ Invalidating TanStack Query cache");
      queryClient.invalidateQueries({ queryKey: ["students", user.uid] });
      
      console.log("✅ Student save completed successfully");
    } catch (err) {
      console.error("❌ Error saving student:", err);
      setLocalError("Failed to save changes. Please try again.");
      throw err; // Re-throw so drawer knows it failed
    }
  }, [selectedStudent, user, students, queryClient]);

  // Handle delete request
  const handleDeleteRequest = useCallback(async (student: StudentRow) => {
    setStudentToDelete(student);
    setIsDeleting(false);
    setDeleteBlocked(false);

    // Check if student has active secretary appointment
    const hasActiveAppointment = await checkStudentHasActiveSecretaryAppointment(student.lrn);
    setDeleteBlocked(hasActiveAppointment);
    setIsDeleteDialogOpen(true);
  }, []);

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!studentToDelete || !user || deleteBlocked) return;

    setIsDeleting(true);
    try {
      // Find section for this student
      const studentData = students.find(s => s.lrn === studentToDelete.lrn);
      if (!studentData) throw new Error("Student not found");

      await deleteStudent(studentData.sectionName, studentToDelete.lrn);

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["students", user.uid] });

      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
    } catch (err) {
      console.error("Error deleting student:", err);
      setLocalError("Failed to delete student. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }, [studentToDelete, user, deleteBlocked, students, queryClient]);

  const getFullName = (student: StudentRow) => {
    const middle = student.middleName ? ` ${student.middleName}` : "";
    return `${student.lastName}, ${student.firstName}${middle}`;
  };

  return (
    <>
      {/* Error Alert */}
      {displayError && (
        <PopupAlert
          message={displayError}
          type="error"
          onClose={() => setLocalError(null)}
        />
      )}

      {/* Header */}
      <header
        className="h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 backdrop-blur-md"
        style={{ backgroundColor: "rgba(253, 247, 255, 0.8)" }}
      >
        <h2
          className="font-headline text-lg lg:text-xl font-bold"
          style={{ color: "#1c1a22" }}
        >
          Attendance Management
        </h2>
        <div className="flex items-center gap-2 lg:gap-6">
          <div className="flex items-center gap-2 lg:gap-4">
            <button
              className="w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-full transition-colors"
              style={{ color: "#484553" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#ece6f1")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <span className="material-symbols-outlined text-base lg:text-xl">help</span>
            </button>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full overflow-hidden border-2" style={{ borderColor: '#e6e0ec' }}>
              <img
                alt="User Avatar"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD__NsPqKYtlRm9fRKN5UCAPgbWqTN_36QZNbTj2TSl2En7OrhpRZHmg-Gj1xJr4uCeze53ZJWM1Vk3eR77w99sr_a31raGwI0I6I2vxBGvWv1CfjoqMQtzacv3Rndxsmls5n4AKdhu_p9utzYzhbb1HwlX4TrLZE2JiTwJwE5DCKQvc4brSPYuLTDRzzq9ZIkz00BJluaTzYy2GJg4kQkEhUzih9dMTknOzOLGBUyc1uO4ltNBUqjKKbCnZw_ITovK_O6vn3uo"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Page Header with Stats */}
      <section className="flex items-center justify-between px-4 lg:px-8 pt-6 lg:pt-8 pb-4">
        <h3
          className="font-headline text-3xl sm:text-4xl font-extrabold -tracking-wide"
          style={{ color: "#1c1a22" }}
        >
          Students
        </h3>
        <div className="flex gap-2 lg:gap-4">
          {/* Total Students Stat */}
          <div
            className="px-4 lg:px-6 py-2 lg:py-3 rounded-lg shrink-0 flex flex-col items-end justify-center gap-0.5"
            style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
          >
            <p
              className="font-label text-[10px] uppercase tracking-tighter font-medium"
              style={{ color: "#6B7280" }}
            >
              Total Students
            </p>
            <p
              className="font-headline text-xl lg:text-2xl font-medium leading-none"
              style={{ color: "#1F1F1F" }}
            >
              {loading ? "-" : totalStudents}
            </p>
          </div>

          {/* Active Sections Stat */}
          <div
            className="px-4 lg:px-6 py-2 lg:py-3 rounded-lg shrink-0 flex flex-col items-end justify-center gap-0.5"
            style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
          >
            <p
              className="font-label text-[10px] uppercase tracking-tighter font-medium"
              style={{ color: "#6B7280" }}
            >
              Active Sections
            </p>
            <p
              className="font-headline text-xl lg:text-2xl font-medium leading-none"
              style={{ color: "#1F1F1F" }}
            >
              {loading ? "-" : activeSections}
            </p>
          </div>
        </div>
      </section>

      {/* Content Canvas */}
      <div className="p-4 lg:p-8 space-y-6">
        {/* Search Bar */}
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search by name or LRN..."
          debounceMs={300}
        />

        {/* Filter Row */}
        <FilterRow
          students={students}
          filterSection={filterSection}
          filterSex={filterSex}
          filterModality={filterModality}
          onFilterSection={setFilterSection}
          onFilterSex={setFilterSex}
          onFilterModality={setFilterModality}
        />

        {/* Results Area */}
        {loading ? (
          <div
            className="rounded-xl border p-12 flex flex-col items-center justify-center gap-4"
            style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}
          >
            <span className="material-symbols-outlined text-4xl animate-spin" style={{ color: "#6C5CE7" }}>
              progress_activity
            </span>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Loading students...
            </p>
          </div>
        ) : (
          <StudentResultsTable
            students={students}
            searchQuery={searchQuery}
            filterSection={filterSection}
            filterSex={filterSex}
            filterModality={filterModality}
            onViewStudent={handleViewStudent}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteRequest}
          />
        )}
      </div>

      {/* Student Profile Drawer */}
      <StudentProfileDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSave={handleSaveStudent}
      />

      {/* Delete Confirmation Dialog */}
      <StudentDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setStudentToDelete(null);
          setDeleteBlocked(false);
        }}
        onConfirm={handleConfirmDelete}
        studentName={studentToDelete ? getFullName(studentToDelete) : ""}
        studentLrn={studentToDelete?.lrn || ""}
        isSecretary={deleteBlocked}
        isDeleting={isDeleting}
      />
    </>
  );
}
