"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardCheck,
  UserCheck,
  Settings,
  LogOut,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { APP_VERSION } from "@/lib/appVersion";

interface TeacherSidebarProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export default function TeacherSidebar({ onClose, isOpen = true }: TeacherSidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(isOpen);
  const [indicatorTop, setIndicatorTop] = useState(0);
  const [indicatorOpacity, setIndicatorOpacity] = useState(0);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeButtonRef.current && navContainerRef.current) {
      const button = activeButtonRef.current;
      const top = button.offsetTop;
      setIndicatorTop(top);
      setIndicatorOpacity(1);
    }
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const mainNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { icon: BookOpen, label: "Sections", href: "/dashboard/teacher/sections" },
    { icon: Users, label: "Students", href: "/dashboard/teacher/students" },
  ];

  const toolNavItems = [
    { icon: ClipboardCheck, label: "Attendance", href: "/dashboard/teacher/attendance" },
    { icon: UserCheck, label: "Secretaries & Records", href: "/dashboard/teacher/secretaries" },
  ];

  const settingsNavItems = [
    { icon: Settings, label: "Settings", href: "/dashboard/teacher/settings" },
  ];

  // Flatten all nav items into a single continuous list
  const allNavItems = [
    ...mainNavItems,
    ...toolNavItems,
    ...settingsNavItems,
  ];

  const isActive = (href: string) => pathname === href;

  const handleNavClick = (href: string) => {
    router.push(href);
    onClose?.();
    setIsMobileOpen(false);
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      { bg: "#e6deff", text: "#493598" },
      { bg: "#d4f0e8", text: "#00695c" },
      { bg: "#ffe5d0", text: "#c45c00" },
      { bg: "#fce4ec", text: "#ad1457" },
      { bg: "#e8eaf6", text: "#3949ab" },
      { bg: "#e0f7fa", text: "#006064" },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index].bg;
  };

  const getAvatarTextColor = (name: string): string => {
    const colors = [
      { bg: "#e6deff", text: "#493598" },
      { bg: "#d4f0e8", text: "#00695c" },
      { bg: "#ffe5d0", text: "#c45c00" },
      { bg: "#fce4ec", text: "#ad1457" },
      { bg: "#e8eaf6", text: "#3949ab" },
      { bg: "#e0f7fa", text: "#006064" },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index].text;
  };

  const NavItem = ({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) => {
    const active = isActive(href);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (active) {
        activeButtonRef.current = buttonRef.current;
      }
    }, [active]);

    return (
      <button
        ref={buttonRef}
        onClick={() => handleNavClick(href)}
        className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors relative"
        style={{
          backgroundColor: active ? "rgba(255, 255, 255, 0.16)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = active
              ? "rgba(255, 255, 255, 0.16)"
              : "transparent";
          }
        }}
      >
        <Icon
          className="w-5 h-5 shrink-0"
          style={{ color: active ? "#FFFFFF" : "#C7D5E6" }}
        />
        <span className="text-[15px] font-medium" style={{ color: active ? "#FFFFFF" : "#D8E3EF" }}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed h-full border-r z-50 transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:w-64
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 lg:w-64'}
        `}
        style={{
          backgroundColor: "#1E3A5F",
          borderColor: "rgba(255,255,255,0.14)"
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="p-4 flex items-center gap-3 shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/app-icon-512.png" alt="SchoolSync" className="w-9 h-9 rounded shrink-0" />
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-base leading-tight whitespace-nowrap" style={{ color: "#FFFFFF" }}>
                  SchoolSync
                </h1>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ backgroundColor: "rgba(255,255,255,0.16)", color: "#E2E8F0" }}
                >
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs" style={{ color: "#C7D5E6" }}>Teacher Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-6 overflow-y-auto flex flex-col relative" ref={navContainerRef}>
            {allNavItems.map((item) => (
              <NavItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                href={item.href}
              />
            ))}
            {/* Single animated indicator - rendered last to appear on top */}
            <motion.div
              className="absolute left-0 w-[3px] h-[42px] pointer-events-none"
              style={{ backgroundColor: "#BFDBFE", top: indicatorTop, left: "12px" }}
              animate={{
                top: indicatorTop,
                opacity: indicatorOpacity
              }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              initial={false}
            />
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded flex items-center justify-center font-semibold text-base shrink-0"
                style={{
                  backgroundColor: getAvatarColor(user?.displayName || "T"),
                  color: getAvatarTextColor(user?.displayName || "T"),
                }}
              >
                {(user?.displayName || "T").charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#FFFFFF" }}>
                  {user?.displayName || "Teacher"}
                </p>
                <p className="text-xs" style={{ color: "#C7D5E6" }}>
                  Teacher
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors border-l-2 border-transparent hover:border-red-300"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <LogOut className="w-5 h-5 text-slate-200 hover:text-red-200 shrink-0" />
              <span className="text-sm font-medium text-slate-200 hover:text-red-200">
                Logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-md"
        style={{ backgroundColor: "#1e3a5f", color: "#FFFFFF" }}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <LayoutDashboard className="w-5 h-5" />
      </button>
    </>
  );
}
