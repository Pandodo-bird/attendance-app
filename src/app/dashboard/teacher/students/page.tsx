"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherHeader from "@/components/TeacherHeader";
import { RoleGuard } from "@/hooks/useRequireRole";
import StudentTable, { StudentRow } from "@/components/teacher/students/StudentTable";
import { getAllTeacherStudents } from "@/lib/firestore";
import { PopupAlert } from "@/components/ui";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterSex, setFilterSex] = useState("");
  const [filterModality, setFilterModality] = useState("");

  // Stats
  const totalStudents = students.length;
  const activeSections = new Set(students.map((s) => `${s.gradeLevel}-${s.sectionName}`)).size;

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      try {
        setLoading(true);
        
        // Load all students
        const allStudents = await getAllTeacherStudents(user!.uid, false);
        
        // Transform to StudentRow format
        const studentRows: StudentRow[] = allStudents.map(({ sectionName, gradeLevel, student }) => ({
          lrn: student.lrn,
          firstName: student.firstName,
          lastName: student.lastName,
          middleName: student.middleName,
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

  return (
    <>
      {/* Header */}
      <TeacherHeader
        title="Students"
        stats={[
          { label: "TOTAL STUDENTS", value: totalStudents },
          { label: "ACTIVE SECTIONS", value: activeSections },
        ]}
        searchPlaceholder="Search by name or LRN..."
        onSearch={(query) => setSearchQuery(query)}
      />

      {/* Content Canvas */}
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Error Alert */}
        {error && (
          <PopupAlert
            message={error}
            type="error"
            onClose={() => setError(null)}
          />
        )}

        {/* Content Area */}
        <div
          className="rounded-xl p-6 lg:p-8"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <span className="material-symbols-outlined text-4xl animate-spin" style={{ color: "#6C5CE7" }}>
                progress_activity
              </span>
              <p className="text-sm" style={{ color: "#6B7280" }}>
                Loading students...
              </p>
            </div>
          ) : (
            <StudentTable
              students={students}
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              filterSection={filterSection}
              filterSex={filterSex}
              filterModality={filterModality}
              onFilterSection={setFilterSection}
              onFilterSex={setFilterSex}
              onFilterModality={setFilterModality}
            />
          )}
        </div>
      </div>
    </>
  );
}
