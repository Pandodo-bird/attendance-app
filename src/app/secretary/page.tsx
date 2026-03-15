"use client";

import { useState } from "react";
import SecretarySidebar from "@/components/SecretarySidebar";
import { useTheme } from "@/contexts/ThemeContext";

export default function SecretaryPage() {
  const [activeItem, setActiveItem] = useState("dashboard");
  const { isDark, toggleTheme } = useTheme();

  const renderContent = () => {
    switch (activeItem) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400">Today's section summary will appear here.</p>
          </div>
        );
      case "take-attendance":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Take Attendance</h2>
            <p className="text-gray-600 dark:text-gray-400">Daily attendance form will appear here.</p>
          </div>
        );
      case "history":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Attendance History</h2>
            <p className="text-gray-600 dark:text-gray-400">Past attendance submissions will appear here.</p>
          </div>
        );
      case "students":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Students</h2>
            <p className="text-gray-600 dark:text-gray-400">View-only roster of your section will appear here.</p>
          </div>
        );
      case "settings":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h2>
            <p className="text-gray-600 dark:text-gray-400">Account settings will appear here.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <SecretarySidebar activeItem={activeItem as any} onNavigate={setActiveItem} />

      {/* Main Content */}
      <main className="flex-1">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center transition-colors duration-300">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white capitalize">
              {activeItem.replace("-", " ")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
