"use client";

interface SecretarySidebarProps {
  activeItem?: "dashboard" | "take-attendance" | "history" | "students" | "settings";
  onNavigate?: (item: string) => void;
}

export default function SecretarySidebar({ 
  activeItem = "dashboard", 
  onNavigate 
}: SecretarySidebarProps) {
  const menuItems = [
    {
      id: "dashboard" as const,
      label: "Dashboard",
      description: "Today's summary",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "take-attendance" as const,
      label: "Take Attendance",
      description: "Mark daily attendance",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      highlighted: true,
    },
    {
      id: "history" as const,
      label: "Attendance History",
      description: "Past submissions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "students" as const,
      label: "Students",
      description: "View roster",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: "settings" as const,
      label: "Settings",
      description: "Account settings",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const handleNavigation = (itemId: string) => {
    if (onNavigate) {
      onNavigate(itemId);
    }
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen transition-colors duration-300">
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">Attendance</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Secretary</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = activeItem === item.id;
          const isHighlighted = item.highlighted;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 group text-left
                ${isActive 
                  ? "bg-linear-to-br from-orange-500 to-rose-500 text-white shadow-md" 
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }
                ${isHighlighted && !isActive ? "ring-2 ring-orange-300 dark:ring-orange-600 ring-inset" : ""}
              `}
            >
              <span className={`flex-shrink-0 ${isActive ? "text-white" : "text-gray-500 dark:text-gray-400 group-hover:text-orange-500 dark:group-hover:text-orange-400"}`}>
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${isActive ? "text-white" : ""}`}>
                  {item.label}
                </p>
                <p className={`text-xs truncate ${isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
                  {item.description}
                </p>
              </div>
              {isHighlighted && !isActive && (
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Section at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white font-medium text-sm">
            S
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">Secretary</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">secretary@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
