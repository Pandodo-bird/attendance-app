"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { RoleGuard } from "@/hooks/useRequireRole";
import { PopupAlert } from "@/components/ui";
import {
  getAllTeacherStudents,
  getTeacherSectionCount,
  getTeacherStudentCount,
  updateStudent,
  deleteStudent,
  checkStudentHasActiveSecretaryAppointment,
  getCachedData,
} from "@/lib/firestore";
import SearchBar from "@/components/teacher/students/SearchBar";
import FilterRow, { StudentRow } from "@/components/teacher/students/FilterRow";
import StudentResultsTable from "@/components/teacher/students/StudentResultsTable";
import StudentProfileDrawer, { StudentProfile } from "@/components/teacher/students/StudentProfileDrawer";
import StudentDeleteDialog from "@/components/teacher/students/StudentDeleteDialog";

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
  
  // Initialize from cache to avoid loading flash on navigation
  const initialCacheKey = user?.uid ? `students_all_${user.uid}` : null;
  const hasCachedStudents = initialCacheKey ? getCachedData<Awaited<ReturnType<typeof getAllTeacherStudents>>>(initialCacheKey) : null;
  const [loading, setLoading] = useState(!hasCachedStudents);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>(
    hasCachedStudents
      ? hasCachedStudents.map(({ sectionId, sectionName, gradeLevel, student }) => ({
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
        }))
      : []
  );

  // Stats
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeSections, setActiveSections] = useState(0);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterSex, setFilterSex] = useState("");
  const [filterModality, setFilterModality] = useState("");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);

  // Load students and stats on mount
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      try {
        // Load stats first (with caching)
        const [studentCount, sectionCount] = await Promise.all([
          getTeacherStudentCount(user!.uid, true),
          getTeacherSectionCount(user!.uid, true),
        ]);
        setTotalStudents(studentCount);
        setActiveSections(sectionCount);

        // Load all students (with caching)
        const allStudents = await getAllTeacherStudents(user!.uid, true);

        // Transform to StudentRow format
        const studentRows: StudentRow[] = allStudents.map(({ sectionId, sectionName, gradeLevel, student }) => ({
          lrn: student.lrn,
          firstName: student.firstName,
          lastName: student.lastName,
          middleName: student.middleName,
          sectionId,  // Include the actual section document ID
          sectionName,
          gradeLevel,
          sex: student.sex,
          learningModality: student.learningModality,
          studentStatus: student.studentStatus,
        }));

        setStudents(studentRows);
        setError(null);
      } catch (err) {
        console.error("Error loading students:", err);
        setError("Failed to load students. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Handle viewing a student
  const handleViewStudent = useCallback((student: StudentRow) => {
    const fullProfile: StudentProfile = {
      ...student,
      birthDate: new Date(),
      religion: "",
      address: "",
      parentFather: "",
      parentMother: "",
      guardian: "",
    };
    setSelectedStudent(fullProfile);
    setIsDrawerOpen(true);
  }, []);

  // Handle editing a student
  const handleEditStudent = useCallback((student: StudentRow) => {
    const fullProfile: StudentProfile = {
      ...student,
      birthDate: new Date(),
      religion: "",
      address: "",
      parentFather: "",
      parentMother: "",
      guardian: "",
    };
    setSelectedStudent(fullProfile);
    setIsDrawerOpen(true);
  }, []);

  // Handle save from drawer
  const handleSaveStudent = useCallback(async (updates: Partial<StudentProfile>) => {
    if (!selectedStudent || !user) return;

    try {
      // Find the section for this student
      const studentData = students.find(s => s.lrn === selectedStudent.lrn);
      if (!studentData) throw new Error("Student not found");

      // Use sectionId (document ID) for Firestore operations
      await updateStudent(studentData.sectionId, selectedStudent.lrn, updates);

      // Firestore update succeeded - now update local state (no refetch needed)
      setStudents(prev => prev.map(s =>
        s.lrn === selectedStudent.lrn ? { ...s, ...updates } : s
      ));

      setSelectedStudent(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error("Error updating student:", err);
      setError("Failed to save changes. Please try again.");
      throw err; // Re-throw so drawer knows it failed
    }
  }, [selectedStudent, user, students]);

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

      // Remove from local state
      setStudents(prev => prev.filter(s => s.lrn !== studentToDelete.lrn));

      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
    } catch (err) {
      console.error("Error deleting student:", err);
      setError("Failed to delete student. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }, [studentToDelete, user, deleteBlocked, students]);

  const getFullName = (student: StudentRow) => {
    const middle = student.middleName ? ` ${student.middleName}` : "";
    return `${student.lastName}, ${student.firstName}${middle}`;
  };

  return (
    <>
      {/* Error Alert */}
      {error && (
        <PopupAlert
          message={error}
          type="error"
          onClose={() => setError(null)}
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
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-4 lg:px-8 pt-6 lg:pt-8 pb-4">
        <div className="w-full sm:w-auto">
          <h3
            className="font-headline text-3xl sm:text-4xl font-extrabold -tracking-wide"
            style={{ color: "#1c1a22" }}
          >
            Students
          </h3>
        </div>
        <div className="flex gap-2 lg:gap-4 w-full sm:w-auto overflow-x-auto">
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
