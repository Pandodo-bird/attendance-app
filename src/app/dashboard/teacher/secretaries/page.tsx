"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherSidebar from "@/components/TeacherSidebar";
import TeacherHeader from "@/components/TeacherHeader";
import { useState, useEffect } from "react";
import { subscribeToSecretaries, Secretary as SecretaryData } from "@/lib/firestore";
import { Unsubscribe } from "firebase/firestore";

interface Secretary {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: "active" | "inactive";
  lastActive?: string;
}

export default function SecretariesPage() {
  return (
    <AuthGuard>
      <SecretariesContent />
    </AuthGuard>
  );
}

function SecretariesContent() {
  const { user, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time subscription to secretaries data
  // Optimized: Uses onSnapshot for real-time updates, prevents repeated reads
  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    if (user?.uid) {
      setIsLoading(true);
      setError(null);

      // Subscribe to real-time updates instead of polling
      unsubscribe = subscribeToSecretaries(user.uid, 
        (fetchedSecretaries) => {
          const mappedSecretaries: Secretary[] = fetchedSecretaries.map(sec => ({
            id: sec.id,
            name: sec.displayName,
            role: sec.role,
            status: sec.status,
            lastActive: sec.lastActive 
              ? formatLastActive(sec.lastActive)
              : sec.status === "inactive" 
                ? "Access revoked"
                : "Recently",
          }));
          
          setSecretaries(mappedSecretaries);
          setIsLoading(false);
        },
        (err) => {
          // Handle permission errors gracefully
          console.error("Error fetching secretaries:", err);
          if (err.code === 'permission-denied') {
            setError("Unable to load secretaries. Firestore security rules may need to be configured.");
          } else {
            setError("Failed to load secretaries. Please try again.");
          }
          setIsLoading(false);
        }
      );
    }

    // Cleanup: Unsubscribe when component unmounts or user changes
    // This prevents memory leaks and unnecessary Firebase reads
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  // Format Firestore timestamp to readable string
  const formatLastActive = (timestamp: any): string => {
    if (!timestamp) return "Unknown";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const activeCount = secretaries.filter(s => s.status === "active").length;
  const totalSpots = 12;

  // Filter secretaries based on search query
  const filteredSecretaries = secretaries.filter(sec =>
    sec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3FA' }}>
      <div className="flex min-h-screen">
        {/* Teacher Sidebar */}
        <TeacherSidebar />

        {/* Main Content Area */}
        <main className="flex-1 ml-0 lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
          {/* Header */}
          <TeacherHeader
            title="Secretaries"
            stats={[
              { label: "ACTIVE ASSISTANTS", value: `${activeCount.toString().padStart(2, '0')}`, valueColor: "#6C5CE7" }
            ]}
            searchPlaceholder="Search administrators..."
            onSearch={(query) => setSearchQuery(query)}
          />

          {/* Content Canvas */}
          <div className="p-4 lg:p-8 space-y-6 lg:space-y-12">
            {/* Header Description */}
            <div className="max-w-2xl">
              <p className="text-base lg:text-lg leading-relaxed" style={{ color: '#484553' }}>
                Manage your administrative team and delegate class operations. Authorize assistants to handle student check-ins and attendance validation.
              </p>
            </div>

            {/* Quick Status Card */}
            <div className="flex justify-start lg:justify-end mb-4 lg:mb-8">
              <div
                className="p-4 lg:p-6 rounded-3xl w-full lg:w-64 border-b-4"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#6C5CE7' }}
              >
                <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#484553' }}>
                  Active Assistants
                </p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl lg:text-5xl font-black" style={{ color: '#6C5CE7' }}>{activeCount.toString().padStart(2, '0')}</span>
                  <span className="text-sm lg:text-base font-medium" style={{ color: '#484553' }}>/ {totalSpots} spots</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#ece6f1' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(activeCount / totalSpots) * 100}%`,
                      backgroundColor: '#00625b',
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Bento Grid of Secretaries */}
            <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-8">
              {error ? (
                // Error state - shown when there's a permission or fetch error
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="text-center px-4 max-w-md">
                    <span className="material-symbols-outlined text-5xl lg:text-6xl mb-4" style={{ color: '#EF4444' }}>error</span>
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#1c1a22' }}>Unable to Load</h3>
                    <p className="text-sm mb-4" style={{ color: '#484553' }}>
                      {error}
                    </p>
                    <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: '#F0EDF7' }}>
                      <p className="font-bold mb-1" style={{ color: '#1c1a22' }}>To fix this:</p>
                      <ol className="text-left list-decimal list-inside space-y-1">
                        <li>Go to Firebase Console</li>
                        <li>Navigate to Firestore Database → Rules</li>
                        <li>Add the secretaries collection rules</li>
                        <li>Click Publish</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : isLoading ? (
                // Loading state - prevents unnecessary renders
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#6C5CE7', borderTopColor: '#e7deff' }}></div>
                    <p className="text-sm" style={{ color: '#484553' }}>Loading secretaries...</p>
                  </div>
                </div>
              ) : filteredSecretaries.length === 0 ? (
                // Empty state - shown when no secretaries match search
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="text-center px-4">
                    <span className="material-symbols-outlined text-5xl lg:text-6xl mb-4" style={{ color: '#cac4d6' }}>person_search</span>
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#1c1a22' }}>No secretaries yet</h3>
                    <p className="text-sm" style={{ color: '#484553' }}>
                      {searchQuery ? "Try a different search term" : "Add your first secretary to get started"}
                    </p>
                  </div>
                </div>
              ) : (
                filteredSecretaries.map((secretary) => (
                  <div
                    key={secretary.id}
                    className="group p-4 lg:p-8 rounded-[2rem] flex flex-col justify-between transition-all"
                    style={{
                      backgroundColor: '#FFFFFF',
                      opacity: secretary.status === "inactive" ? 0.8 : 1,
                      filter: secretary.status === "inactive" ? 'grayscale(0.5)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (secretary.status === "active") {
                        e.currentTarget.style.backgroundColor = '#F7F6FB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (secretary.status === "active") {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }
                    }}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4 lg:mb-6">
                        {secretary.avatar ? (
                          <img
                            alt={secretary.name}
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl object-cover shadow-sm"
                            src={secretary.avatar}
                          />
                        ) : (
                          <div
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: '#e6e0ec' }}
                          >
                            <span className="material-symbols-outlined text-3xl lg:text-4xl" style={{ color: '#484553' }}>
                              person
                            </span>
                          </div>
                        )}
                        <span
                          className="px-2 lg:px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-widest"
                          style={
                            secretary.status === "active"
                              ? { backgroundColor: '#c5fff7', color: '#00201d' }
                              : { backgroundColor: '#ffdad6', color: '#93000a' }
                          }
                        >
                          {secretary.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <h3 className="text-xl lg:text-2xl font-bold" style={{ color: '#1c1a22' }}>
                        {secretary.name}
                      </h3>
                      <p className="mb-4 lg:mb-6" style={{ color: '#484553' }}>
                        {secretary.role}
                      </p>

                      <div className="flex items-center gap-2 mb-6 lg:mb-8">
                        <span
                          className="material-symbols-outlined text-sm"
                          style={{
                            color: secretary.status === "active" ? '#6C5CE7' : '#EF4444',
                          }}
                        >
                          {secretary.status === "active" ? "history" : "block"}
                        </span>
                        <span className="text-sm italic" style={{ color: '#484553' }}>
                          {secretary.status === "active"
                            ? `Last active: ${secretary.lastActive}`
                            : secretary.lastActive}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {secretary.status === "active" ? (
                        <>
                          <button
                            className="flex-1 py-2 lg:py-3 rounded-xl font-bold text-xs lg:text-sm flex items-center justify-center gap-2 border transition-colors"
                            style={{
                              backgroundColor: '#FFFFFF',
                              color: '#484553',
                              borderColor: 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#6C5CE7';
                              e.currentTarget.style.borderColor = '#e7deff';
                              e.currentTarget.style.backgroundColor = '#e7deff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#484553';
                              e.currentTarget.style.borderColor = 'transparent';
                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                            }}
                          >
                            <span className="material-symbols-outlined text-base lg:text-lg">visibility</span>
                            <span className="hidden sm:inline">View Activity</span>
                            <span className="sm:hidden">View</span>
                          </button>
                          <button
                            className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-colors"
                            style={{ backgroundColor: '#FFFFFF', color: '#484553' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#e7deff';
                              e.currentTarget.style.color = '#6C5CE7';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                              e.currentTarget.style.color = '#484553';
                            }}
                          >
                            <span className="material-symbols-outlined text-base lg:text-xl">edit</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="flex-1 py-2 lg:py-3 rounded-xl font-bold text-xs lg:text-sm flex items-center justify-center gap-2 transition-colors"
                            style={{
                              backgroundColor: '#e7deff',
                              color: '#1e0061',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#6C5CE7';
                              e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#e7deff';
                              e.currentTarget.style.color = '#1e0061';
                            }}
                          >
                            <span className="material-symbols-outlined text-base lg:text-lg">power_settings_new</span>
                            <span className="hidden sm:inline">Restore</span>
                          </button>
                          <button
                            className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-colors"
                            style={{ backgroundColor: '#FFFFFF', color: '#484553' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffdad6';
                              e.currentTarget.style.color = '#93000a';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                              e.currentTarget.style.color = '#484553';
                            }}
                          >
                            <span className="material-symbols-outlined text-base lg:text-xl">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Add New Secretary Card */}
              <button
                className="border-2 border-dashed p-4 lg:p-8 rounded-[2rem] flex flex-col items-center justify-center gap-3 lg:gap-4 transition-colors cursor-pointer min-h-[280px] lg:min-h-[320px]"
                style={{ borderColor: '#cac4d6' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6C5CE7';
                  e.currentTarget.style.color = '#6C5CE7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#cac4d6';
                  e.currentTarget.style.color = '#484553';
                }}
              >
                <div
                  className="w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-colors group-hover:scale-110"
                  style={{ backgroundColor: '#f1ecf7' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e7deff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1ecf7';
                  }}
                >
                  <span className="material-symbols-outlined text-2xl lg:text-3xl">add</span>
                </div>
                <div className="text-center px-2">
                  <h4 className="text-lg font-bold mb-1" style={{ color: '#1c1a22' }}>
                    Add New Secretary
                  </h4>
                  <p className="text-sm" style={{ color: '#484553' }}>
                    Create a new administrative profile
                  </p>
                </div>
              </button>
            </section>

            {/* Bottom Information Bar */}
            <footer className="mt-auto pt-6 lg:pt-10 flex flex-col lg:flex-row gap-4 lg:gap-6 border-t" style={{ borderColor: '#e6e0ec' }}>
              <div
                className="flex-1 p-4 lg:p-6 rounded-2xl flex items-center gap-3 lg:gap-4"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#c5fff7', color: '#00201d' }}
                >
                  <span className="material-symbols-outlined text-base lg:text-xl">security</span>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1c1a22' }}>Role-Based Access Control</p>
                  <p className="text-xs" style={{ color: '#484553' }}>
                    Secretaries can log attendance but cannot modify class records.
                  </p>
                </div>
              </div>
              <div
                className="flex-1 p-4 lg:p-6 rounded-2xl flex items-center gap-3 lg:gap-4"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div
                  className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#e6deff', color: '#1d0061' }}
                >
                  <span className="material-symbols-outlined text-base lg:text-xl">history_edu</span>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1c1a22' }}>Audit Logs</p>
                  <p className="text-xs" style={{ color: '#484553' }}>
                    Every check-in is stamped with the secretary&apos;s digital signature.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* FAB - Hidden on mobile, visible on lg+ */}
      <button
        className="hidden lg:flex fixed bottom-10 right-10 h-14 px-6 rounded-full flex items-center gap-3 transition-transform z-50"
        style={{
          background: 'linear-gradient(135deg, #6C5CE7, #5A4BD6)',
          boxShadow: '0 4px 20px rgba(108, 92, 231, 0.4)',
          color: '#FFFFFF',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span className="material-symbols-outlined">person_add</span>
        <span className="font-bold tracking-tight">Add New Secretary</span>
      </button>

      {/* Mobile FAB - smaller, icon only */}
      <button
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-transform z-50 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #6C5CE7, #5A4BD6)',
          color: '#FFFFFF',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span className="material-symbols-outlined text-2xl">person_add</span>
      </button>
    </div>
  );
}
