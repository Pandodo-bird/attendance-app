"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  User,
  LogOut,
  History,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { APP_VERSION } from "@/lib/appVersion";

interface SecretarySidebarProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export default function SecretarySidebar({ onClose, isOpen = true }: SecretarySidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
    { icon: LayoutDashboard, label: "Home", href: "/dashboard/secretary/dashboard" },
    { icon: ClipboardCheck, label: "Attendance", href: "/dashboard/secretary/attendance" },
    { icon: History, label: "History", href: "/dashboard/secretary/history" },
    { icon: User, label: "Profile", href: "/dashboard/secretary/profile" },
  ];

  const allNavItems = [...mainNavItems];

  const isActive = (href: string) => pathname === href;

  const handleNavClick = (href: string) => {
    router.push(href);
    onClose?.();
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
          backgroundColor: active ? "#F1F5F9" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = "#F8FAFC";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = active ? "#F1F5F9" : "transparent";
          }
        }}
      >
        <Icon
          className={`w-5 h-5 shrink-0 ${
            active ? "text-[#1e3a5f]" : "text-gray-500"
          }`}
        />
        <span
          className={`text-[15px] font-medium ${
            active ? "text-[#1e3a5f]" : "text-gray-600"
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => onClose?.()}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed h-full border-r z-50 transition-transform duration-300 ease-in-out
          lg:w-64
          ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-0"}
        `}
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E5E7EB"
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="p-4 flex items-center gap-3 shrink-0 border-b" style={{ borderColor: "#E5E7EB" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-transparent.png" alt="SchoolSync" className="w-9 h-9 rounded shrink-0" />
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-base leading-tight whitespace-nowrap" style={{ color: "#1F1F1F" }}>
                  SchoolSync
                </h1>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ backgroundColor: "#E2E8F0", color: "#475569" }}
                >
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs" style={{ color: "#6B6B6B" }}>Secretary Portal</p>
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
              style={{ backgroundColor: "#1e3a5f", top: indicatorTop, left: "12px" }}
              animate={{
                top: indicatorTop,
                opacity: indicatorOpacity
              }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              initial={false}
            />
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 shrink-0 border-t" style={{ borderColor: "#E5E7EB" }}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded flex items-center justify-center font-semibold text-base shrink-0"
                style={{
                  backgroundColor: getAvatarColor(user?.displayName || "S"),
                  color: getAvatarTextColor(user?.displayName || "S"),
                }}
              >
                {(user?.displayName || "S").charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#1F1F1F" }}>
                  {user?.displayName || "Secretary"}
                </p>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  Secretary
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors border-l-2 border-transparent hover:border-red-500"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#FEF2F2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <LogOut className="w-5 h-5 text-gray-500 hover:text-red-600 shrink-0" />
              <span className="text-sm font-medium text-gray-500 hover:text-red-600">
                Logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E5E7EB",
          minHeight: "var(--secretary-mobile-nav-offset, calc(4.75rem + env(safe-area-inset-bottom)))",
        }}
      >
        <div className="flex min-h-16 items-center justify-around">
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
                style={{
                  color: active ? "#1e3a5f" : "#6B7280",
                }}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
