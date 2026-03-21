"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  History,
  Users,
  Settings,
  LogOut,
  BookOpen,
} from "lucide-react";
import { useState } from "react";

interface SecretarySidebarProps {
  activeItem?: "dashboard" | "take-attendance" | "history" | "students" | "settings";
  onNavigate?: (item: string) => void;
}

export default function SecretarySidebar({
  activeItem = "dashboard",
  onNavigate,
}: SecretarySidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const mainNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard/secretary", id: "dashboard" as const },
    { icon: ClipboardCheck, label: "Take Attendance", href: "/dashboard/secretary/attendance", id: "take-attendance" as const },
    { icon: History, label: "Attendance History", href: "/dashboard/secretary/history", id: "history" as const },
  ];

  const toolNavItems = [
    { icon: Users, label: "Students", href: "/dashboard/secretary/students", id: "students" as const },
  ];

  const settingsNavItems = [
    { icon: Settings, label: "Settings", href: "/dashboard/secretary/settings", id: "settings" as const },
  ];

  const handleNavClick = (href: string, itemId: string) => {
    if (onNavigate) {
      onNavigate(itemId);
    }
    router.push(href);
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

  const NavItem = ({
    icon: Icon,
    label,
    href,
    id,
  }: {
    icon: React.ElementType;
    label: string;
    href: string;
    id: string;
  }) => {
    const active = activeItem === id || pathname === href;
    return (
      <button
        onClick={() => handleNavClick(href, id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors border-l-2 ${
          active
            ? "bg-slate-100 border-[#1e3a5f]"
            : "border-transparent hover:bg-slate-50"
        }`}
      >
        <Icon
          className={`w-5 h-5 shrink-0 ${
            active ? "text-[#1e3a5f]" : "text-gray-500"
          }`}
        />
        <span
          className={`text-sm font-medium truncate ${
            active ? "text-[#1e3a5f]" : "text-gray-600"
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  const NavGroup = ({ title, items }: { title: string; items: typeof mainNavItems | typeof toolNavItems | typeof settingsNavItems }) => (
    <div className="mb-6">
      {title && (
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavItem key={item.label} icon={item.icon} label={item.label} href={item.href} id={item.id} />
      ))}
    </div>
  );

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
          backgroundColor: "#FFFFFF",
          borderColor: "#E5E7EB"
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="p-4 flex items-center gap-3 shrink-0 border-b" style={{ borderColor: "#E5E7EB" }}>
            <div
              className="w-9 h-9 rounded flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#1e3a5f" }}
            >
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-semibold text-base leading-tight whitespace-nowrap" style={{ color: "#1F1F1F" }}>
                EduAttend Pro
              </h1>
              <p className="text-xs" style={{ color: "#6B6B6B" }}>Secretary Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <NavGroup title="Manage" items={mainNavItems} />
            <NavGroup title="Tools" items={toolNavItems} />
            <NavGroup title="" items={settingsNavItems} />
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 shrink-0 border-t" style={{ borderColor: "#E5E7EB" }}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded flex items-center justify-center font-semibold text-sm shrink-0"
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
              className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors border-l-2 border-transparent hover:border-red-500"
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
