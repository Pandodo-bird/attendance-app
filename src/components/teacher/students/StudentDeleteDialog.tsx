"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface StudentDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  studentName: string;
  studentLrn: string;
  isSecretary: boolean;
  isDeleting: boolean;
}

export default function StudentDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  studentName,
  studentLrn,
  isSecretary,
  isDeleting,
}: StudentDeleteDialogProps) {
  const handleConfirm = async () => {
    if (isSecretary) return;
    await onConfirm();
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

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          >
            <div
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: "#FFFFFF" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={`px-6 py-4 flex items-center justify-between ${
                  isSecretary ? "bg-[#FEF2F2]" : "bg-[#FFF7ED]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isSecretary ? "bg-[#FEE2E2]" : "bg-[#FED7AA]"
                    }`}
                  >
                    <AlertTriangle
                      size={20}
                      className={isSecretary ? "text-[#DC2626]" : "text-[#EA580C]"}
                    />
                  </div>
                  <h3
                    className="text-lg font-bold"
                    style={{ color: "#1F1F1F" }}
                  >
                    {isSecretary ? "Cannot Delete Student" : "Delete Student"}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                  style={{ color: "#6B7280" }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                {isSecretary ? (
                  <>
                    <p className="text-sm" style={{ color: "#374151" }}>
                      This student is currently an active secretary. Revoke their role before deleting.
                    </p>
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: "#F9FAFB" }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#6B7280" }}>
                        Student
                      </p>
                      <p className="text-sm font-medium" style={{ color: "#1F1F1F" }}>
                        {studentName}
                      </p>
                      <p className="text-xs" style={{ color: "#9CA3AF" }}>
                        LRN: {studentLrn}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm" style={{ color: "#374151" }}>
                      Are you sure you want to delete this student? This action cannot be undone.
                    </p>
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: "#F9FAFB" }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#6B7280" }}>
                        Student
                      </p>
                      <p className="text-sm font-medium" style={{ color: "#1F1F1F" }}>
                        {studentName}
                      </p>
                      <p className="text-xs" style={{ color: "#9CA3AF" }}>
                        LRN: {studentLrn}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div
                className="px-6 py-4 flex items-center justify-end gap-3 border-t"
                style={{ borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" }}
              >
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", border: "1px solid", color: "#374151" }}
                >
                  {isSecretary ? "Close" : "Cancel"}
                </button>
                {!isSecretary && (
                  <button
                    onClick={handleConfirm}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "#DC2626", color: "#FFFFFF" }}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
