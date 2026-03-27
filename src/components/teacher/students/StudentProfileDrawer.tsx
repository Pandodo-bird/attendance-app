"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil } from "lucide-react";
import { Timestamp } from "firebase/firestore";

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
  birthDate: Date | Timestamp | string;
  religion: string;
  
  // Address
  barangay: string;
  city: string;
  province: string;
  
  // Parent/Guardian Info
  fatherName: string;
  motherMaidenName: string;
  guardianName: string;
  guardianRelationship: string;
  guardianContactNumber: string;
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
  value: string | Date | Timestamp;
  onChange: (field: keyof StudentProfile, value: string) => void;
}

function InputField({ label, field, type = "text", isEditMode, value, onChange }: InputFieldProps) {
  const parseStudentDate = (date: Date | Timestamp | string): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (date instanceof Timestamp) return date.toDate();

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return null;
    return parsedDate;
  };

  const formatDate = (date: Date | Timestamp | string) => {
    const parsedDate = parseStudentDate(date);
    if (!parsedDate) return "";
    return parsedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatDateInput = (date: Date | Timestamp | string) => {
    const parsedDate = parseStudentDate(date);
    if (!parsedDate) return "";
    return parsedDate.toISOString().split("T")[0];
  };

  const isEmpty = !value || (typeof value === "string" && value.trim() === "");

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
          className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none transition-all"
          style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#1F1F1F" }}
        />
      ) : (
        <p className="text-sm" style={{ color: isEmpty ? "#9CA3AF" : "#1F1F1F" }}>
          {type === "date" ? formatDate(value) : String(value || "N/A")}
        </p>
      )}
    </div>
  );
}

// Religion field with predefined options + custom input
interface ReligionFieldProps {
  label: string;
  isEditMode: boolean;
  value: string;
  onChange: (value: string) => void;
}

const RELIGION_OPTIONS = [
  "Christianity",
  "Islam",
  "Hinduism",
  "Buddhism",
];

function ReligionField({ label, isEditMode, value, onChange }: ReligionFieldProps) {
  const isEmpty = !value || value.trim() === "";
  const isCustom = !RELIGION_OPTIONS.includes(value);

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "#6B7280" }}>
        {label}
      </label>
      {isEditMode ? (
        <div className="space-y-2">
          <select
            value={isCustom && value !== "" ? "custom" : value}
            onChange={(e) => {
              const selected = e.target.value;
              onChange(selected);
            }}
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none transition-all"
            style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#1F1F1F" }}
          >
            <option value="">Select religion...</option>
            {RELIGION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value="custom">Type custom...</option>
          </select>
          {(value === "custom" || (isCustom && value !== "")) && (
            <input
              type="text"
              value={value === "custom" ? "" : value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter custom religion..."
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none transition-all"
              style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#1F1F1F" }}
            />
          )}
        </div>
      ) : (
        <p className="text-sm" style={{ color: isEmpty ? "#9CA3AF" : "#1F1F1F" }}>
          {value || "N/A"}
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
                      className="px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 hover:text-[#1F1F1F]"
                      style={{ color: "#6B7280" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
                      style={{ backgroundColor: "#1e3a5f", color: "#FFFFFF" }}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    style={{ color: "#9CA3AF" }}
                  >
                    <Pencil size={20} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: "#9CA3AF" }}
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
                  style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
                >
                  {editedStudent.learningModality || "N/A"}
                </span>
              </div>

              {/* Personal Information */}
              <section className="space-y-4 pb-6" style={{ borderBottom: "0.5px solid #E5E7EB" }}>
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
                  <ReligionField
                    label="Religion"
                    isEditMode={isEditMode}
                    value={editedStudent.religion}
                    onChange={(value) => handleChange("religion", value)}
                  />
                </div>
              </section>

              {/* Contact Information */}
              <section className="space-y-4 pb-6" style={{ borderBottom: "0.5px solid #E5E7EB" }}>
                <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#6B7280" }}>
                  Address
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Barangay"
                    field="barangay"
                    isEditMode={isEditMode}
                    value={editedStudent.barangay}
                    onChange={handleChange}
                  />
                  <InputField
                    label="City"
                    field="city"
                    isEditMode={isEditMode}
                    value={editedStudent.city}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Province"
                    field="province"
                    isEditMode={isEditMode}
                    value={editedStudent.province}
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
                    field="fatherName"
                    isEditMode={isEditMode}
                    value={editedStudent.fatherName}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Mother's Maiden Name"
                    field="motherMaidenName"
                    isEditMode={isEditMode}
                    value={editedStudent.motherMaidenName}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Guardian Name"
                    field="guardianName"
                    isEditMode={isEditMode}
                    value={editedStudent.guardianName}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Guardian Relationship"
                    field="guardianRelationship"
                    isEditMode={isEditMode}
                    value={editedStudent.guardianRelationship}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Guardian Contact Number"
                    field="guardianContactNumber"
                    isEditMode={isEditMode}
                    value={editedStudent.guardianContactNumber}
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
