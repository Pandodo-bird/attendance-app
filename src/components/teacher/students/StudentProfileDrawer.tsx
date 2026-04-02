"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Check, User, MapPin, Phone, BookOpen, Calendar, Shield } from "lucide-react";
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

interface InfoFieldProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  isEdit?: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
  type?: string;
}

function InfoField({ label, value, icon, isEdit, editValue, onEditChange, type = "text" }: InfoFieldProps) {
  const isEmpty = !value || (typeof value === "string" && value.trim() === "");
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-xs" style={{ color: "#64748B" }}>{icon}</span>}
        <label className="text-xs font-medium" style={{ color: "#64748B" }}>
          {label}
        </label>
      </div>
      {isEdit && onEditChange ? (
        <input
          type={type}
          value={editValue || ""}
          onChange={(e) => onEditChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
          style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#1F1F1F" }}
        />
      ) : (
        <p className="text-sm font-medium" style={{ color: isEmpty ? "#94A3B8" : "#0F172A" }}>
          {value || "N/A"}
        </p>
      )}
    </div>
  );
}

const RELIGION_OPTIONS = [
  "Christianity",
  "Islam",
  "Hinduism",
  "Buddhism",
];

interface ReligionFieldProps {
  isEditMode: boolean;
  value: string;
  onChange: (value: string) => void;
}

function ReligionField({ isEditMode, value, onChange }: ReligionFieldProps) {
  const isCustom = !RELIGION_OPTIONS.includes(value);
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <BookOpen size={12} style={{ color: "#64748B" }} />
        <label className="text-xs font-medium" style={{ color: "#64748B" }}>
          Religion
        </label>
      </div>
      {isEditMode ? (
        <div className="space-y-2">
          <select
            value={isCustom && value !== "" ? "custom" : value}
            onChange={(e) => {
              const selected = e.target.value;
              if (selected !== "custom") {
                onChange(selected);
              }
            }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
            style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#1F1F1F" }}
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
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent outline-none transition-all"
              style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#1F1F1F" }}
            />
          )}
        </div>
      ) : (
        <p className="text-sm font-medium" style={{ color: !value ? "#94A3B8" : "#0F172A" }}>
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

  const parseDate = (date: Date | Timestamp | string): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (date instanceof Timestamp) return date.toDate();
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const formatDate = (date: Date | Timestamp | string) => {
    const parsed = parseDate(date);
    if (!parsed) return "N/A";
    return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatDateInput = (date: Date | Timestamp | string) => {
    const parsed = parseDate(date);
    if (!parsed) return "";
    return parsed.toISOString().split("T")[0];
  };

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
        setIsEditMode(false);
      }
    } catch (error) {
      console.error("Error saving student:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof StudentProfile, value: string) => {
    if (!editedStudent) return;
    setEditedStudent({ ...editedStudent, [field]: value });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "#DCFCE7", text: "#166534", label: "Active" };
      case "inactive":
        return { bg: "#FEF3C7", text: "#92400E", label: "Inactive" };
      case "graduated":
        return { bg: "#DBEAFE", text: "#1D4ED8", label: "Graduated" };
      case "dropped":
        return { bg: "#FEE2E2", text: "#991B1B", label: "Dropped" };
      default:
        return { bg: "#F1F5F9", text: "#64748B", label: status };
    }
  };

  const statusConfig = getStatusConfig(editedStudent.studentStatus);
  const fullName = `${editedStudent.firstName} ${editedStudent.middleName ? editedStudent.middleName + " " : ""}${editedStudent.lastName}`;
  const initials = `${editedStudent.firstName.charAt(0)}${editedStudent.lastName.charAt(0)}`.toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header with gradient */}
            <div
              className="relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #1E3A5F 0%, #2D4A6F 100%)",
              }}
            >
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
              </div>
              
              <div className="relative px-6 py-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#FFFFFF" }}
                    >
                      {initials}
                    </div>
                    
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: "#FFFFFF" }}>
                        {fullName}
                      </h2>
                      <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {editedStudent.gradeLevel} • {editedStudent.sectionName}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
                        >
                          {statusConfig.label}
                        </span>
                        {editedStudent.learningModality && (
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#FFFFFF" }}
                          >
                            {editedStudent.learningModality}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isEditMode ? (
                      <>
                        <button
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                          style={{ color: "rgba(255,255,255,0.7)" }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          style={{ backgroundColor: "#FFFFFF", color: "#1E3A5F" }}
                        >
                          <Check size={14} />
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleEdit}
                        className="p-2 rounded-lg transition-colors hover:bg-white/10"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                      >
                        <Pencil size={18} />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg transition-colors hover:bg-white/10"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* LRN */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                    LRN: <span style={{ color: "rgba(255,255,255,0.9)", fontFamily: "monospace" }}>{editedStudent.lrn}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Personal Information */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#EEF2FF" }}>
                      <User size={16} style={{ color: "#4F46E5" }} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#0F172A" }}>
                      Personal Information
                    </h3>
                  </div>
                  <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField
                        label="Sex"
                        value={editedStudent.sex ? editedStudent.sex.charAt(0).toUpperCase() + editedStudent.sex.slice(1) : ""}
                        isEdit={isEditMode}
                        editValue={editedStudent.sex}
                        onEditChange={(v) => handleChange("sex", v)}
                      />
                      <InfoField
                        label="Birth Date"
                        value={isEditMode ? "" : formatDate(editedStudent.birthDate)}
                        icon={<Calendar size={12} />}
                        isEdit={isEditMode}
                        editValue={isEditMode ? formatDateInput(editedStudent.birthDate) : ""}
                        onEditChange={(v) => handleChange("birthDate", v)}
                        type="date"
                      />
                    </div>
                    <ReligionField
                      isEditMode={isEditMode}
                      value={editedStudent.religion}
                      onChange={(value) => handleChange("religion", value)}
                    />
                  </div>
                </section>

                {/* Address */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F0FDF4" }}>
                      <MapPin size={16} style={{ color: "#16A34A" }} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#0F172A" }}>
                      Address
                    </h3>
                  </div>
                  <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    <InfoField
                      label="Barangay"
                      value={editedStudent.barangay}
                      isEdit={isEditMode}
                      editValue={editedStudent.barangay}
                      onEditChange={(v) => handleChange("barangay", v)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField
                        label="City"
                        value={editedStudent.city}
                        isEdit={isEditMode}
                        editValue={editedStudent.city}
                        onEditChange={(v) => handleChange("city", v)}
                      />
                      <InfoField
                        label="Province"
                        value={editedStudent.province}
                        isEdit={isEditMode}
                        editValue={editedStudent.province}
                        onEditChange={(v) => handleChange("province", v)}
                      />
                    </div>
                  </div>
                </section>

                {/* Family Information */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEF3C7" }}>
                      <Shield size={16} style={{ color: "#D97706" }} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#0F172A" }}>
                      Family Information
                    </h3>
                  </div>
                  <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    <InfoField
                      label="Father's Name"
                      value={editedStudent.fatherName}
                      isEdit={isEditMode}
                      editValue={editedStudent.fatherName}
                      onEditChange={(v) => handleChange("fatherName", v)}
                    />
                    <InfoField
                      label="Mother's Maiden Name"
                      value={editedStudent.motherMaidenName}
                      isEdit={isEditMode}
                      editValue={editedStudent.motherMaidenName}
                      onEditChange={(v) => handleChange("motherMaidenName", v)}
                    />
                  </div>
                </section>

                {/* Guardian Information */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FCE7F3" }}>
                      <Phone size={16} style={{ color: "#DB2777" }} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#0F172A" }}>
                      Guardian Information
                    </h3>
                  </div>
                  <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                    <InfoField
                      label="Guardian Name"
                      value={editedStudent.guardianName}
                      isEdit={isEditMode}
                      editValue={editedStudent.guardianName}
                      onEditChange={(v) => handleChange("guardianName", v)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField
                        label="Relationship"
                        value={editedStudent.guardianRelationship}
                        isEdit={isEditMode}
                        editValue={editedStudent.guardianRelationship}
                        onEditChange={(v) => handleChange("guardianRelationship", v)}
                      />
                      <InfoField
                        label="Contact Number"
                        value={editedStudent.guardianContactNumber}
                        isEdit={isEditMode}
                        editValue={editedStudent.guardianContactNumber}
                        onEditChange={(v) => handleChange("guardianContactNumber", v)}
                      />
                    </div>
                  </div>
                </section>

                {/* Bottom padding for scroll */}
                <div className="h-4" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
