"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";

interface StudentActionsMenuProps {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function StudentActionsMenu({
  onView,
  onEdit,
  onDelete,
}: StudentActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
        style={{ color: "#6B7280" }}
      >
        <MoreHorizontal size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop (invisible, for click-outside-to-close) */}
            <motion.div
              className="fixed inset-0 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              className="absolute right-0 top-full mt-1 w-40 rounded-xl shadow-lg border z-20 overflow-hidden"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    onView();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-[#F9FAFB] transition-colors"
                  style={{ color: "#374151" }}
                >
                  <Eye size={16} />
                  View
                </button>
                <button
                  onClick={() => {
                    onEdit();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-[#F9FAFB] transition-colors"
                  style={{ color: "#374151" }}
                >
                  <Pencil size={16} />
                  Edit
                </button>
                <div className="h-px my-1" style={{ backgroundColor: "#E5E7EB" }} />
                <button
                  onClick={() => {
                    onDelete();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-sm hover:bg-[#FEF2F2] transition-colors"
                  style={{ color: "#DC2626" }}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
