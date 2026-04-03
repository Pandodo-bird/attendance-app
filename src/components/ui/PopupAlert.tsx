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
  buttonBg: string;
  buttonText: string;
  Icon: typeof Info;
}

function getPresentation(type: PopupAlertProps["type"]): AlertPresentation {
  switch (type) {
    case "error":
      return {
        title: "Action Needed",
        bg: "#FFF7F7",
        border: "#FECACA",
        titleColor: "#991B1B",
        textColor: "#7F1D1D",
        iconBg: "#FEE2E2",
        iconColor: "#DC2626",
        buttonBg: "#FEE2E2",
        buttonText: "#991B1B",
        Icon: AlertCircle,
      };
    case "success":
      return {
        title: "Saved",
        bg: "#F5FBF7",
        border: "#BBF7D0",
        titleColor: "#065F46",
        textColor: "#166534",
        iconBg: "#DCFCE7",
        iconColor: "#059669",
        buttonBg: "#DCFCE7",
        buttonText: "#065F46",
        Icon: CheckCircle2,
      };
    case "info":
      return {
        title: "Heads Up",
        bg: "#F8FAFF",
        border: "#BFDBFE",
        titleColor: "#1D4ED8",
        textColor: "#1E3A5F",
        iconBg: "#DBEAFE",
        iconColor: "#2563EB",
        buttonBg: "#DBEAFE",
        buttonText: "#1D4ED8",
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
        className="rounded-3xl border shadow-[0_18px_40px_rgba(15,23,42,0.12)] overflow-hidden"
        style={{ backgroundColor: presentation.bg, borderColor: presentation.border }}
      >
        <div className="flex items-start gap-3 px-4 py-4 sm:px-5 sm:py-5">
          <div
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: presentation.iconBg, color: presentation.iconColor }}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold sm:text-[15px]" style={{ color: presentation.titleColor }}>
              {presentation.title}
            </p>
            <p className="mt-1 text-sm leading-6" style={{ color: presentation.textColor }}>
              {message}
            </p>
          </div>

          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.8)", color: presentation.textColor }}
            onClick={onClose}
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end border-t px-4 py-3 sm:px-5" style={{ borderColor: presentation.border }}>
          <button
            type="button"
            className="rounded-2xl px-4 py-2 text-sm font-semibold transition-transform active:scale-[0.98]"
            style={{ backgroundColor: presentation.buttonBg, color: presentation.buttonText }}
            onClick={onClose}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
