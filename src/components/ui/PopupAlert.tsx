"use client";

import { useEffect } from "react";

interface PopupAlertProps {
  message: string;
  type: 'error' | 'success' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function PopupAlert({ message, type, onClose, duration = 3000 }: PopupAlertProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: '#FEF2F2',
          border: '#EF4444',
          text: '#EF4444',
          icon: 'error',
        };
      case 'success':
        return {
          bg: '#F0FDF4',
          border: '#22C55E',
          text: '#22C55E',
          icon: 'check_circle',
        };
      case 'info':
        return {
          bg: '#EFF6FF',
          border: '#3B82F6',
          text: '#3B82F6',
          icon: 'info',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300"
      onClick={onClose}
    >
      <div
        className="px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 cursor-pointer min-w-[300px] max-w-md"
        style={{ backgroundColor: styles.bg, borderColor: styles.border }}
      >
        <span
          className="material-symbols-outlined"
          style={{ color: styles.text }}
        >
          {styles.icon}
        </span>
        <p className="text-sm font-bold" style={{ color: styles.text }}>
          {message}
        </p>
        <button
          className="ml-auto p-1 rounded-full hover:bg-black/10 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <span className="material-symbols-outlined text-base" style={{ color: styles.text }}>
            close
          </span>
        </button>
      </div>
    </div>
  );
}
