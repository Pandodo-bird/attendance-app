"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

interface TeacherSidebarProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export default function TeacherSidebar({ onClose, isOpen = true }: TeacherSidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(isOpen);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const navItems = [
    { icon: "dashboard", label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { icon: "class", label: "Sections", href: "/dashboard/teacher/sections" },
    { icon: "group", label: "Students", href: "/dashboard/teacher/students" },
    { icon: "check_circle", label: "Attendance", href: "/dashboard/teacher/attendance" },
    { icon: "assessment", label: "Reports", href: "/dashboard/teacher/reports" },
    { icon: "badge", label: "Secretaries", href: "/dashboard/teacher/secretaries" },
    { icon: "settings", label: "Settings", href: "/dashboard/teacher/settings", separator: true },
  ];

  const isActive = (href: string) => pathname === href;

  const handleNavClick = (href: string) => {
    router.push(href);
    onClose?.();
    setIsMobileOpen(false);
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
          backgroundColor: '#F0EDF7',
          borderColor: '#E5E7EB'
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="p-6 flex items-center gap-3 shrink-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6C5CE7, #5A4BD6)'
              }}
            >
              <span className="material-symbols-outlined">auto_stories</span>
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg leading-tight whitespace-nowrap" style={{ color: '#1F1F1F' }}>EduAttend Pro</h1>
              <p className="text-xs" style={{ color: '#6B6B6B' }}>Teacher Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 mt-4 overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.label}>
                  {item.separator && <div className="my-4" />}
                  <a
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors"
                    style={{
                      backgroundColor: isActive(item.href) ? '#6C5CE7' : 'transparent',
                      color: isActive(item.href) ? '#FFFFFF' : '#6B6B6B'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive(item.href)) {
                        e.currentTarget.style.backgroundColor = '#E5E7EB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive(item.href)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.href);
                    }}
                  >
                    <span className="material-symbols-outlined shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Profile & Logout */}
          <div className="p-6 shrink-0">
            <div
              className="flex items-center gap-3 p-3 rounded-xl shadow-sm mb-4"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #6C5CE7, #5A4BD6)'
                }}
              >
                {(user?.displayName || "T").charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: '#1F1F1F' }}>{user?.displayName || "Teacher"}</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-colors"
              style={{
                backgroundColor: '#EF4444',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
            >
              <span className="material-symbols-outlined text-sm shrink-0">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-md"
        style={{ backgroundColor: '#6C5CE7', color: '#FFFFFF' }}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <span className="material-symbols-outlined">
          {isMobileOpen ? 'close' : 'menu'}
        </span>
      </button>
    </>
  );
}
