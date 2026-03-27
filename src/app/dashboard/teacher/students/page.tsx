"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { RoleGuard } from "@/hooks/useRequireRole";
import { PopupAlert } from "@/components/ui";
import TeacherHeader from "@/components/TeacherHeader";
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

      <TeacherHeader
        title="Students"
        stats={[
          { label: "Total Students", value: loading ? "-" : totalStudents },
          { label: "Active Sections", value: loading ? "-" : activeSections },
        ]}
      />

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
            style={{ backgroundColor: "#F8FBFF", borderColor: "#D7E2EF" }}
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
