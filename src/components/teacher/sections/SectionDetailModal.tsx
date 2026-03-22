"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Check, XCircle } from "lucide-react";
import { Section, Student } from "@/lib/firestore";

interface SectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: Section | null;
  students: Student[];
  onEditSection: (updates: Partial<Section>) => Promise<void>;
  onViewStudent: (student: Student) => void;
}

export default function SectionDetailModal({
  isOpen,
  onClose,
  section,
  students,
  onEditSection,
  onViewStudent,
}: SectionDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSection, setEditedSection] = useState<Section | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (section) {
      setEditedSection({ ...section });
    }
    setIsEditMode(false);
  }, [section]);

  if (!section || !editedSection) return null;

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setEditedSection({ ...section });
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!editedSection) return;

    setIsSaving(true);
    try {
      const updates: Partial<Section> = {};
      if (editedSection.sectionName !== section.sectionName) {
        updates.sectionName = editedSection.sectionName;
      }
      if (editedSection.gradeLevel !== section.gradeLevel) {
        updates.gradeLevel = editedSection.gradeLevel;
      }
      if (editedSection.schoolYear !== section.schoolYear) {
        updates.schoolYear = editedSection.schoolYear;
      }
      if (editedSection.status !== section.status) {
        updates.status = editedSection.status;
      }

      if (Object.keys(updates).length > 0) {
        await onEditSection(updates);
      }
      setIsEditMode(false);
    } catch (error) {
      console.error("Error updating section:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof Section, value: string) => {
    if (!editedSection) return;
    setEditedSection({ ...editedSection, [field]: value });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "#D1FAE5", text: "#065F46", label: "Active" };
      case "inactive":
        return { bg: "#FEE2E2", text: "#991B1B", label: "Inactive" };
      case "archived":
        return { bg: "#F3F4F6", text: "#6B7280", label: "Archived" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280", label: status };
    }
  };

  const statusBadge = getStatusBadge(editedSection.status);

  const getFullName = (student: Student) => {
    const middle = student.middleName ? ` ${student.middleName}` : "";
    return `${student.lastName}, ${student.firstName}${middle}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          >
            <div
              className="w-full max-w-[800px] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
              style={{ backgroundColor: "#FFFFFF" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="px-6 py-4 border-b flex items-start justify-between"
                style={{ borderColor: "#E5E7EB" }}
              >
                <div className="flex-1">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editedSection.sectionName}
                      onChange={(e) => handleChange("sectionName", e.target.value)}
                      className="text-xl font-bold px-2 py-1 rounded border focus:ring-2 focus:ring-[#6C5CE7] outline-none"
                      style={{ borderColor: "#E5E7EB", color: "#1F1F1F" }}
                      placeholder="Section name"
                    />
                  ) : (
                    <h2
                      className="text-xl font-bold"
                      style={{ color: "#1F1F1F" }}
                    >
                      Section {editedSection.sectionName}
                    </h2>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {isEditMode ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editedSection.gradeLevel}
                          onChange={(e) => handleChange("gradeLevel", e.target.value)}
                          className="text-sm px-2 py-1 rounded border focus:ring-2 focus:ring-[#6C5CE7] outline-none w-20"
                          style={{ borderColor: "#E5E7EB", color: "#374151" }}
                          placeholder="Grade"
                        />
                        <span style={{ color: "#9CA3AF" }}>•</span>
                        <input
                          type="text"
                          value={editedSection.schoolYear}
                          onChange={(e) => handleChange("schoolYear", e.target.value)}
                          className="text-sm px-2 py-1 rounded border focus:ring-2 focus:ring-[#6C5CE7] outline-none w-28"
                          style={{ borderColor: "#E5E7EB", color: "#374151" }}
                          placeholder="School year"
                        />
                      </div>
                    ) : (
                      <>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#6B7280" }}
                        >
                          Grade {editedSection.gradeLevel} • {editedSection.schoolYear}
                        </p>
                        <span
                          className="font-label text-[10px] font-medium py-0.5 px-2 rounded-full"
                          style={{ backgroundColor: statusBadge.bg, color: statusBadge.text }}
                        >
                          {statusBadge.label}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditMode ? (
                    <>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="p-2 rounded-lg transition-colors disabled:opacity-50"
                        style={{ color: "#6B7280", backgroundColor: "#F9FAFB" }}
                        title="Cancel"
                      >
                        <XCircle size={20} />
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="p-2 rounded-lg transition-colors disabled:opacity-50"
                        style={{ backgroundColor: "#6C5CE7", color: "#FFFFFF" }}
                        title="Save"
                      >
                        <Check size={20} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEdit}
                      className="p-2 rounded-lg hover:bg-[#F9FAFB] transition-colors"
                      style={{ color: "#6B7280" }}
                      title="Edit section"
                    >
                      <Pencil size={20} />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-[#F9FAFB] transition-colors"
                    style={{ color: "#9CA3AF" }}
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Body - Student Roster */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {students.length === 0 ? (
                  <div
                    className="rounded-xl border p-12 flex flex-col items-center justify-center gap-4"
                    style={{ backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }}
                  >
                    <span
                      className="material-symbols-outlined text-4xl"
                      style={{ color: "#9CA3AF" }}
                    >
                      people_outline
                    </span>
                    <div className="text-center">
                      <p className="text-base font-medium" style={{ color: "#374151" }}>
                        No students enrolled in this section yet.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-xl overflow-hidden border"
                    style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: "#F9FAFB" }}>
                            <th
                              className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide"
                              style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                            >
                              LRN
                            </th>
                            <th
                              className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide"
                              style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                            >
                              Name
                            </th>
                            <th
                              className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide"
                              style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student, index) => (
                            <motion.tr
                              key={student.lrn}
                              className="border-b last:border-b-0 hover:bg-[#F9FAFB] transition-colors"
                              style={{ borderColor: "#E5E7EB" }}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.02, duration: 0.15 }}
                            >
                              <td
                                className="px-4 py-3 text-sm font-mono"
                                style={{ color: "#6B7280" }}
                              >
                                {student.lrn}
                              </td>
                              <td
                                className="px-4 py-3 text-sm font-medium"
                                style={{ color: "#1F1F1F" }}
                              >
                                {getFullName(student)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => {
                                    onViewStudent(student);
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                                  style={{
                                    backgroundColor: "#F0EDF7",
                                    color: "#6C5CE7",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#E6E0EC";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#F0EDF7";
                                  }}
                                >
                                  View profile
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 border-t flex items-center justify-between"
                style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}
              >
                <p className="text-sm font-medium" style={{ color: "#6B7280" }}>
                  Total: <span style={{ color: "#1F1F1F" }}>{students.length}</span> student{students.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E5E7EB",
                    border: "1px solid",
                    color: "#374151",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
