"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

interface PopupAlertProps {
  message: string;
  type: "error" | "success" | "info";
  onClose: () => void;
  duration?: number;
}

interface AlertPresentation {
  title: string;
  bg: string;
  border: string;
  titleColor: string;
  textColor: string;
  iconBg: string;
  iconColor: string;
  Icon: typeof Info;
}

function getPresentation(type: PopupAlertProps["type"]): AlertPresentation {
  switch (type) {
    case "error":
      return {
        title: "Action Needed",
        bg: "#FEF2F2",
        border: "#FECACA",
        titleColor: "#991B1B",
        textColor: "#B91C1C",
        iconBg: "#FFFFFF",
        iconColor: "#DC2626",
        Icon: AlertCircle,
      };
    case "success":
      return {
        title: "Success",
        bg: "#ECFDF5",
        border: "#A7F3D0",
        titleColor: "#065F46",
        textColor: "#047857",
        iconBg: "#FFFFFF",
        iconColor: "#10B981",
        Icon: CheckCircle2,
      };
    case "info":
      return {
        title: "Heads Up",
        bg: "#EFF6FF",
        border: "#BFDBFE",
        titleColor: "#1D4ED8",
        textColor: "#1E40AF",
        iconBg: "#FFFFFF",
        iconColor: "#2563EB",
        Icon: Info,
      };
  }
}

export default function PopupAlert({ message, type, onClose, duration = 0 }: PopupAlertProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const presentation = getPresentation(type);
  const { Icon } = presentation;

  return (
    <div
      className="fixed top-4 left-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 sm:top-6 sm:w-full"
    >
      <div
        className="rounded-2xl border shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        style={{ backgroundColor: presentation.bg, borderColor: presentation.border }}
      >
        <div className="flex items-start gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <div
            className="mt-0.5 h-9 w-9 shrink-0 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: presentation.iconBg, color: presentation.iconColor }}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1 pr-8">
            <p className="text-sm font-bold" style={{ color: presentation.titleColor }}>
              {presentation.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: presentation.textColor }}>
              {message}
            </p>
          </div>

          <button
            type="button"
            className="absolute top-3 right-3 p-1.5 rounded-lg shrink-0"
            style={{ backgroundColor: presentation.iconBg, color: presentation.titleColor }}
            onClick={onClose}
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
