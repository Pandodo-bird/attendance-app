"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Student } from "@/lib/firestore";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionName: string;
  existingStudents: Student[];
  onSubmit: (student: Omit<Student, "createdAt">) => Promise<void>;
}

interface NewStudentFormData {
  lrn: string;
  lastName: string;
  firstName: string;
  middleName: string;
  sex: "male" | "female" | "";
  birthDate: string;
  religion: string;
  barangay: string;
  city: string;
  province: string;
  fatherName: string;
  motherMaidenName: string;
  guardianName: string;
  guardianRelationship: string;
  guardianContactNumber: string;
  learningModality: string;
  studentStatus: "active" | "inactive" | "graduated" | "dropped";
}

const INITIAL_FORM: NewStudentFormData = {
  lrn: "",
  lastName: "",
  firstName: "",
  middleName: "",
  sex: "",
  birthDate: "",
  religion: "",
  barangay: "",
  city: "",
  province: "",
  fatherName: "",
  motherMaidenName: "",
  guardianName: "",
  guardianRelationship: "",
  guardianContactNumber: "",
  learningModality: "",
  studentStatus: "active",
};

export default function AddStudentModal({
  isOpen,
  onClose,
  sectionName,
  existingStudents,
  onSubmit,
}: AddStudentModalProps) {
  const [newStudent, setNewStudent] = useState<NewStudentFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setNewStudent(INITIAL_FORM);
      setError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setError("");
    const lrn = newStudent.lrn.trim();
    const firstName = newStudent.firstName.trim();
    const lastName = newStudent.lastName.trim();

    if (!lrn || !firstName || !lastName || !newStudent.sex) {
      setError("LRN, first name, last name, and sex are required.");
      return;
    }

    if (existingStudents.some((student) => student.lrn === lrn)) {
      setError("This LRN already exists in the section.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        lrn,
        lastName,
        firstName,
        middleName: newStudent.middleName.trim(),
        sex: newStudent.sex,
        birthDate: newStudent.birthDate ? new Date(newStudent.birthDate) : "",
        religion: newStudent.religion.trim(),
        barangay: newStudent.barangay.trim(),
        city: newStudent.city.trim(),
        province: newStudent.province.trim(),
        fatherName: newStudent.fatherName.trim(),
        motherMaidenName: newStudent.motherMaidenName.trim(),
        guardianName: newStudent.guardianName.trim(),
        guardianRelationship: newStudent.guardianRelationship.trim(),
        guardianContactNumber: newStudent.guardianContactNumber.trim(),
        learningModality: newStudent.learningModality.trim(),
        studentStatus: newStudent.studentStatus,
      });
      onClose();
    } catch (submitError) {
      console.error("Error adding student:", submitError);
      setError("Failed to add student. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center px-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          >
            <div
              className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
              style={{ backgroundColor: "#FFFFFF" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-6 py-4 border-b flex items-start justify-between" style={{ borderColor: "#E5E7EB" }}>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: "#1F1F1F" }}>
                    Add Student
                  </h3>
                  <p className="text-sm" style={{ color: "#6B7280" }}>
                    Section {sectionName}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  style={{ color: "#9CA3AF" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {error && (
                  <p className="text-xs mb-3" style={{ color: "#DC2626" }}>
                    {error}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newStudent.lrn}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, lrn: e.target.value }))}
                    placeholder="LRN (Required)"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.lastName}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last name (Required)"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.firstName}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name (Required)"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <select
                    value={newStudent.sex}
                    onChange={(e) =>
                      setNewStudent((prev) => ({
                        ...prev,
                        sex: e.target.value as "male" | "female" | "",
                      }))
                    }
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  >
                    <option value="">Sex (Required)</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  <input
                    type="text"
                    value={newStudent.middleName}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, middleName: e.target.value }))}
                    placeholder="Middle name"
                    className="md:col-span-2 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="date"
                    value={newStudent.birthDate}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, birthDate: e.target.value }))}
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <select
                    value={newStudent.studentStatus}
                    onChange={(e) =>
                      setNewStudent((prev) => ({
                        ...prev,
                        studentStatus: e.target.value as "active" | "inactive" | "graduated" | "dropped",
                      }))
                    }
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  >
                    <option value="active">Status: Active</option>
                    <option value="inactive">Status: Inactive</option>
                    <option value="graduated">Status: Graduated</option>
                    <option value="dropped">Status: Dropped</option>
                  </select>
                  <input
                    type="text"
                    value={newStudent.learningModality}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, learningModality: e.target.value }))}
                    placeholder="Learning modality"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.religion}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, religion: e.target.value }))}
                    placeholder="Religion"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.barangay}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, barangay: e.target.value }))}
                    placeholder="Barangay"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.city}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.province}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, province: e.target.value }))}
                    placeholder="Province"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.fatherName}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, fatherName: e.target.value }))}
                    placeholder="Father name"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.motherMaidenName}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, motherMaidenName: e.target.value }))}
                    placeholder="Mother maiden name"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.guardianName}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, guardianName: e.target.value }))}
                    placeholder="Guardian name"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.guardianRelationship}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, guardianRelationship: e.target.value }))}
                    placeholder="Guardian relationship"
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                  <input
                    type="text"
                    value={newStudent.guardianContactNumber}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, guardianContactNumber: e.target.value }))}
                    placeholder="Guardian contact number"
                    className="md:col-span-2 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                    style={{ borderColor: "#D1D5DB", color: "#1F1F1F" }}
                  />
                </div>
              </div>

              <div
                className="px-6 py-4 border-t flex items-center justify-end gap-2"
                style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid #D1D5DB", color: "#4B5563" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#6C5CE7", color: "#FFFFFF" }}
                >
                  {isSubmitting ? "Adding..." : "Add Student"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
