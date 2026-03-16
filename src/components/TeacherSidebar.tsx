"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";

interface TeacherSidebarProps {
  onClose?: () => void;
}

export default function TeacherSidebar({ onClose }: TeacherSidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const navItems = [
    { icon: "dashboard", label: "Dashboard", href: "/dashboard/teacher" },
    { icon: "class", label: "Sections", href: "/dashboard/teacher/sections" },
    { icon: "group", label: "Students", href: "/dashboard/teacher/students" },
    { icon: "check_circle", label: "Attendance", href: "/dashboard/teacher/attendance" },
    { icon: "assessment", label: "Reports", href: "/dashboard/teacher/reports" },
    { icon: "badge", label: "Secretaries", href: "/dashboard/teacher/secretaries" },
    { icon: "settings", label: "Settings", href: "/dashboard/teacher/settings", separator: true },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <aside
      className="w-64 flex flex-col fixed h-full border-r z-50"
      style={{
        backgroundColor: '#F0EDF7',
        borderColor: '#E5E7EB'
      }}
    >
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
          style={{
            background: 'linear-gradient(135deg, #6C5CE7, #5A4BD6)'
          }}
        >
          <span className="material-symbols-outlined">auto_stories</span>
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight" style={{ color: '#1F1F1F' }}>EduAttend Pro</h1>
          <p className="text-xs" style={{ color: '#6B6B6B' }}>Teacher Portal</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 mt-4">
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
                  router.push(item.href);
                  onClose?.();
                }}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile & Logout */}
      <div className="p-6">
        <div
          className="flex items-center gap-3 p-3 rounded-xl shadow-sm mb-4"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <img
            alt="Teacher Profile Picture"
            className="w-10 h-10 rounded-full object-cover"
            style={{ backgroundColor: '#F0EDF7' }}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfZXLCbV9x0LdZkoOHtWI-IClSKamJ2z7ngxrovAiGZbblJPMW0bCzGs25s3pMOMwj2V2FaiiwbKACtP69LLpSTGgzBD1M09rhewza6qA6iqatb7lu494X-7O4zjqyk-1EcLrVWKvYpAnhqP75KZx0lLE214Fz8NJu0FXF6HDe4FmpjPnJDYSqND8UyQcDgg_F2fV1VW0AqySyZ3TWNgvYeqyJVVmgKz7Gl_-ReyKKMBcjNtsbM88l6TVjLqWmxUQp0_tzbTKi"
          />
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate" style={{ color: '#1F1F1F' }}>{user?.displayName || "Teacher"}</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Senior Educator</p>
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
          <span className="material-symbols-outlined text-sm">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
