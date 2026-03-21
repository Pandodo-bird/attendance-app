"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Save, XCircle } from "lucide-react";

export interface StudentProfile {
  lrn: string;
  firstName: string;
  lastName: string;
  middleName: string;
  sectionName: string;
  gradeLevel: string;
  sex: "male" | "female" | "";
  learningModality: string;
  studentStatus: "active" | "inactive" | "graduated" | "dropped";
  birthDate: Date | string;
  religion: string;
  address: string;
  parentFather: string;
  parentMother: string;
  guardian: string;
}

interface StudentProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  onSave?: (updates: Partial<StudentProfile>) => Promise<void>;
}

// Move InputField outside to prevent recreation on every render
interface InputFieldProps {
  label: string;
  field: keyof StudentProfile;
  type?: string;
  isEditMode: boolean;
  value: string | Date;
  onChange: (field: keyof StudentProfile, value: string) => void;
}

function InputField({ label, field, type = "text", isEditMode, value, onChange }: InputFieldProps) {
  const formatDate = (date: Date | string) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatDateInput = (date: Date | string) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "#6B7280" }}>
        {label}
      </label>
      {isEditMode ? (
        <input
          type={type}
          value={type === "date" && value ? formatDateInput(value) : String(value || "")}
          onChange={(e) => onChange(field, e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6C5CE7] outline-none transition-all"
          style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#1F1F1F" }}
        />
      ) : (
        <p className="text-sm" style={{ color: "#1F1F1F" }}>
          {type === "date" ? formatDate(value) : String(value || "N/A")}
        </p>
      )}
    </div>
  );
}

export default function StudentProfileDrawer({
  isOpen,
  onClose,
  student,
  onSave,
}: StudentProfileDrawerProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStudent, setEditedStudent] = useState<StudentProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setEditedStudent({ ...student });
    }
    setIsEditMode(false);
  }, [student]);

  if (!student || !editedStudent) return null;

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setEditedStudent({ ...student });
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!onSave || !editedStudent) return;

    setIsSaving(true);
    try {
      const updates: Partial<StudentProfile> = {};
      Object.keys(editedStudent).forEach((key) => {
        const k = key as keyof StudentProfile;
        if (editedStudent[k] !== (student as StudentProfile)[k]) {
          updates[k] = editedStudent[k] as never;
        }
      });

      if (Object.keys(updates).length > 0) {
        await onSave(updates);
        // Success - close edit mode
        setIsEditMode(false);
      }
    } catch (error) {
      console.error("Error saving student:", error);
      // Don't close edit mode - let user try again
      // Error is shown by parent component via setError
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof StudentProfile, value: string) => {
    if (!editedStudent) return;
    setEditedStudent({ ...editedStudent, [field]: value });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "#D1FAE5", text: "#065F46" };
      case "inactive":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "graduated":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      case "dropped":
        return { bg: "#FEE2E2", text: "#991B1B" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.95)", borderColor: "#E5E7EB" }}
            >
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#1F1F1F" }}>
                  {editedStudent.lastName}, {editedStudent.firstName}
                  {editedStudent.middleName && ` ${editedStudent.middleName}`}
                </h2>
                <p className="text-sm" style={{ color: "#6B7280" }}>
                  {editedStudent.gradeLevel} - {editedStudent.sectionName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                      style={{ color: "#6B7280" }}
                    >
                      <XCircle size={20} />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                      style={{ backgroundColor: "#6C5CE7", color: "#FFFFFF" }}
                    >
                      <Save size={16} />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    style={{ color: "#6C5CE7" }}
                  >
                    <Edit2 size={20} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: "#6B7280" }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: getStatusColor(editedStudent.studentStatus).bg,
                    color: getStatusColor(editedStudent.studentStatus).text,
                  }}
                >
                  {editedStudent.studentStatus.charAt(0).toUpperCase() + editedStudent.studentStatus.slice(1)}
                </span>
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: "#F0EDF7", color: "#6C5CE7" }}
                >
                  {editedStudent.learningModality || "N/A"}
                </span>
              </div>

              {/* Personal Information */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="LRN"
                    field="lrn"
                    isEditMode={isEditMode}
                    value={editedStudent.lrn}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Sex"
                    field="sex"
                    isEditMode={isEditMode}
                    value={editedStudent.sex}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Birth Date"
                    field="birthDate"
                    type="date"
                    isEditMode={isEditMode}
                    value={editedStudent.birthDate}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Religion"
                    field="religion"
                    isEditMode={isEditMode}
                    value={editedStudent.religion}
                    onChange={handleChange}
                  />
                </div>
              </section>

              {/* Contact Information */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <InputField
                    label="Address"
                    field="address"
                    isEditMode={isEditMode}
                    value={editedStudent.address}
                    onChange={handleChange}
                  />
                </div>
              </section>

              {/* Family Information */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                  Family Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <InputField
                    label="Father's Name"
                    field="parentFather"
                    isEditMode={isEditMode}
                    value={editedStudent.parentFather}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Mother's Name"
                    field="parentMother"
                    isEditMode={isEditMode}
                    value={editedStudent.parentMother}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Guardian"
                    field="guardian"
                    isEditMode={isEditMode}
                    value={editedStudent.guardian}
                    onChange={handleChange}
                  />
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
