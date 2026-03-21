"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search by name or LRN...",
  debounceMs = 300,
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value.trim()) {
      timeoutRef.current = setTimeout(() => {
        onSearch(value.trim());
      }, debounceMs);
    } else {
      onSearch("");
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, debounceMs, onSearch]);

  const handleClear = () => {
    setValue("");
    onSearch("");
  };

  return (
    <div className="relative w-full">
      <div
        className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-[#6C5CE7] focus-within:border-transparent"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }}
      >
        <Search size={20} className="shrink-0" style={{ color: "#9CA3AF" }} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9CA3AF]"
          style={{ color: "#1F1F1F" }}
        />
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-[#F3F4F6] transition-colors shrink-0"
            style={{ color: "#6B7280" }}
          >
            <X size={16} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
