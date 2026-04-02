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
import { motion } from "framer-motion";

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
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
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

  // Calculate stats from loaded data
  const totalStudents = allStudents.length;
  const uniqueSectionIds = new Set(allStudents.map(s => s.sectionId));
  const activeSections = uniqueSectionIds.size;
  const activeStudents = allStudents.filter(s => s.student.studentStatus === "active").length;

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
      if (urlSearch) setSearchQuery(urlSearch);
      if (urlSection) setFilterSection(urlSection);
      if (urlSex) setFilterSex(urlSex);
      if (urlModality) setFilterModality(urlModality);
    } else if (savedFilters) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const displayError = error?.message || localError;

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

  const handleSaveStudent = useCallback(async (updates: Partial<StudentProfile>) => {
    if (!selectedStudent || !user) return;

    try {
      const studentData = students.find(s => s.lrn === selectedStudent.lrn);
      if (!studentData) throw new Error("Student not found");

      await updateStudent(studentData.sectionId, selectedStudent.lrn, updates);
      queryClient.invalidateQueries({ queryKey: ["students", user.uid] });
    } catch (err) {
      console.error("Error saving student:", err);
      setLocalError("Failed to save changes. Please try again.");
      throw err;
    }
  }, [selectedStudent, user, students, queryClient]);

  const handleDeleteRequest = useCallback(async (student: StudentRow) => {
    setStudentToDelete(student);
    setIsDeleting(false);
    setDeleteBlocked(false);

    const hasActiveAppointment = await checkStudentHasActiveSecretaryAppointment(student.lrn);
    setDeleteBlocked(hasActiveAppointment);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!studentToDelete || !user || deleteBlocked) return;

    setIsDeleting(true);
    try {
      const studentData = students.find(s => s.lrn === studentToDelete.lrn);
      if (!studentData) throw new Error("Student not found");

      await deleteStudent(studentData.sectionName, studentToDelete.lrn);
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
      {displayError && (
        <PopupAlert
          message={displayError}
          type="error"
          onClose={() => setLocalError(null)}
        />
      )}

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
                Student Management
              </p>
              <h1 className="mt-3 text-2xl font-bold leading-tight lg:text-3xl" style={{ color: "#102A43" }}>
                Manage your students across all sections
              </h1>
              <p className="mt-3 max-w-3xl text-sm lg:text-[15px]" style={{ color: "#486581" }}>
                Search, view, and edit student information. Track enrollment status and manage student records efficiently.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
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
                  {loading ? "-" : totalStudents}
                </p>
              </motion.div>
              <motion.div
                className="rounded-2xl border px-4 py-3"
                style={{ backgroundColor: "rgba(255,255,255,0.72)", borderColor: "#D7E2EF" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#829AB1" }}>
                  Active Students
                </p>
                <p className="mt-2 text-2xl font-bold" style={{ color: "#102A43" }}>
                  {loading ? "-" : activeStudents}
                </p>
              </motion.div>
              <motion.div
                className="rounded-2xl border px-4 py-3"
                style={{ backgroundColor: "rgba(16,42,67,0.06)", borderColor: "#C9D9EA" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.25 }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#627D98" }}>
                  Sections
                </p>
                <p className="mt-2 text-2xl font-bold" style={{ color: "#102A43" }}>
                  {loading ? "-" : activeSections}
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
        {/* Search and Controls Bar */}
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" }}
        >
          <div className="flex-1 max-w-xl">
            <SearchBar
              onSearch={setSearchQuery}
              placeholder="Search by name or LRN..."
              debounceMs={300}
            />
          </div>

          {/* Filters */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "#F1F5F9" }}>
            <FilterRow
              students={students}
              filterSection={filterSection}
              filterSex={filterSex}
              filterModality={filterModality}
              onFilterSection={setFilterSection}
              onFilterSex={setFilterSex}
              onFilterModality={setFilterModality}
            />
          </div>
        </div>

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
      </motion.div>

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
