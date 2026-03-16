"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import TeacherSidebar from "@/components/TeacherSidebar";
import TeacherHeader from "@/components/TeacherHeader";
import { useState } from "react";

export default function SectionsPage() {
  return (
    <AuthGuard>
      <SectionsContent />
    </AuthGuard>
  );
}

function SectionsContent() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Mock sections data - replace with actual data from your backend
  const sections = [
    {
      id: "1",
      name: "Mathematics 101",
      icon: "functions",
      status: "ACTIVE",
      attendanceRate: 98,
      schedule: "Mon, Wed • 09:00 AM",
      students: [
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCPLiIJNKV5ar3KooHarM2vVLgGb3Qq2ha9CpAC-426J5sJq3b777w8kZRNzaPiu0Klvt_uE2lECi8Z-n1W5GP6Yo2s1h2JiqGzzOA8rCpc1JCsD6W3OmqixeIfSpt_2lx4SaAtcn8tD5tT1xv8cH3H9fgLSLRdUUq6MY0FC0b-NzGx-SI1ssnJQG9W7MXTfQ_Z-W48EkYyxvWC8TYT1ADIcI8fms-jNagmGOE7INiaO6WU5n6Y2yoEBfOA75sg9CA-0Y-GVT8Z",
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBfZXLCbV9x0LdZkoOHtWI-IClSKamJ2z7ngxrovAiGZbblJPMW0bCzGs25s3pMOMwj2V2FaiiwbKACtP69LLpSTGgzBD1M09rhewza6qA6iqatb7lu494X-7O4zjqwk-1EcLrVWKvYpAnhqP75KZx0lLE214Fz8NJu0FXF6HDe4FmpjPnJDYSqND8UyQcDgg_F2fV1VW0AqySyZ3TWNgvYeqyJVVmgKz7Gl_-ReyKKMBcjNtsbM88l6TVjLqWmxUQp0_tzbTKi",
      ],
      totalStudents: 44,
    },
    {
      id: "2",
      name: "History 202",
      icon: "auto_stories",
      status: "ACTIVE",
      attendanceRate: 85,
      schedule: "Tue, Thu • 01:30 PM",
      students: [
        "https://lh3.googleusercontent.com/aida-public/AB6AXuABLuT5sII8poGZgJlDASTo0J-O5QqZGZwEv5CHb85JyOYLp7kQQDEaK218ZRjPgbN4VE_owiw0gwh6HYUQ6DZ4UuY2x6YuLLXeOQskmrNAJzO9bHdpwIQbb38PVh7iipOF5Wvm7_z0pobT-bhChPFDbmaSKVf0sa2J5GLhUDoAkC-UZ4GSBez6HG8p-iBzoG0TRr_JMuc5Ad9gSOVYT710PeRsi9ISyi88Df3KI49q8osv76JROmjX-8wRGQvT9HhI0TQz2l1L",
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDYoQfgKeEovoTzg6LlPDZLV6v8Pioh3jHPDLqHfvSCWAL97yEfE5VpXw6gxxpxKeP9m8BUthiaHapZmgOpj6km6MdInEFfaY_ei5aZgKhpTP7cfl6zKFtTrUdMsAVhfrGqXRr-ppkC09fn9KyhL-tfMiLXT6HeKSOYHRWqdkPMKRk7APaMh_MF04CaYeN7YZZd4MFxM8dFiUhO_GTdnP88WQI-baSiZ29NsXBgohkCx3K6UvVyLa1eyDO-ujq8Rqy6DLdf7mrr",
      ],
      totalStudents: 36,
    },
    {
      id: "3",
      name: "Science 303",
      icon: "biotech",
      status: "ACTION_REQ",
      attendanceRate: 72,
      schedule: "Wed, Fri • 11:00 AM",
      students: [
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAyjxuuQu9_wRjEdGJvFxlrMq8mmCO7Xk2rLvZ9x1XGDDGuam5n_RBJ3VOxcDvZzrfn4V-2W8FwBiUeMdO_XhXCO5C3OoEm83NVUeRwxsPgB-uGwr91iX1ETihJYx4vC-V_-O8i5sse9JqZQOsswQKfUrHTVh7__LTs3zOrWPQgsYTCHSeBIHo1-UptCDrW2NwWwkp9OyIQazeI2U3WNNTEwmzEAyZ74wZ9KD8GEsCSJRa8RP8r77fN6MNBOEu_n8eM--GZGWlh",
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCZpVhEoVPoU2Ze0CVyGveRW7VxQ3JZnzwaarQvcqubH-a7aC-I8iqNVPGQIgF7xNtITX6a7SGiLt-G5sjXPQEWT8UWInsy1SuJQAiJQxh5dDCqXdDY1Iuq-h1HwyZoeX0nGMAOlsZOTx_LvLMJHl0E0FKxtHrZYkYuQGsq58NrwbSsSJaUMvN2HbTRFHigFsGxkQj9pwVSv_A1Go1mN487XmIkOfGGmZgYdo1iIeytwq70O-ixLlumLhXp4HaKAAqV7frziB5",
      ],
      totalStudents: 30,
    },
  ];

  const totalStudents = 124;
  const avgAttendance = 94.2;

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return "#22C55E";
    if (rate >= 75) return "#6C5CE7";
    return "#EF4444";
  };

  const getStatusBadge = (status: string) => {
    if (status === "ACTIVE") {
      return (
        <span
          className="font-label text-[10px] font-bold py-1 px-3 rounded-full"
          style={{ backgroundColor: "#8ef4e9", color: "#00201d" }}
        >
          ACTIVE
        </span>
      );
    }
    return (
      <span
        className="font-label text-[10px] font-bold py-1 px-3 rounded-full"
        style={{ backgroundColor: "#ffdad6", color: "#93000a" }}
      >
        ACTION REQ.
      </span>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F3FA" }}>
      <div className="flex min-h-screen">
        {/* Teacher Sidebar */}
        <TeacherSidebar />

        {/* Main Content Area */}
        <main className="flex-1 ml-0 lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
          {/* Header */}
          <TeacherHeader
            title="Current Sections"
            stats={[
              { label: "TOTAL STUDENTS", value: totalStudents },
              { label: "AVG ATTENDANCE", value: `${avgAttendance}%`, valueColor: "#00625b" }
            ]}
            searchPlaceholder="Search sections..."
            onSearch={(query) => setSearchQuery(query)}
          />

          {/* Content Canvas */}
          <div className="p-4 lg:p-8 space-y-6 lg:space-y-12">
            {/* Bento Grid of Classes */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="group rounded-xl p-4 lg:p-6 transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  {/* Background glow effect */}
                  <div
                    className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 -mr-12 lg:-mr-16 -mt-12 lg:-mt-16 rounded-full blur-3xl"
                    style={{
                      backgroundColor:
                        section.status === "ACTION_REQ"
                          ? "rgba(239, 68, 68, 0.05)"
                          : "rgba(108, 92, 231, 0.05)",
                    }}
                  ></div>

                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-6 lg:mb-8 relative z-10">
                    <div
                      className="p-2 lg:p-3 rounded-lg"
                      style={{ backgroundColor: "#e6deff", color: "#493598" }}
                    >
                      <span className="material-symbols-outlined text-base lg:text-xl">
                        {section.icon}
                      </span>
                    </div>
                    {getStatusBadge(section.status)}
                  </div>

                  {/* Section Info */}
                  <h4
                    className="font-headline text-xl lg:text-2xl font-bold mb-1"
                    style={{ color: "#1c1a22" }}
                  >
                    {section.name}
                  </h4>
                  <p
                    className="font-body text-sm mb-4 lg:mb-6"
                    style={{ color: "#484553" }}
                  >
                    Participation across all active sections
                  </p>

                  {/* Attendance Progress */}
                  <div className="space-y-3 lg:space-y-4 mb-6 lg:mb-8">
                    <div className="flex justify-between items-center text-xs">
                      <span
                        className="text-on-surface-variant"
                        style={{ color: "#484553" }}
                      >
                        Attendance Rate
                      </span>
                      <span
                        className="font-bold"
                        style={{ color: getAttendanceColor(section.attendanceRate) }}
                      >
                        {section.attendanceRate}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full rounded-full overflow-hidden relative"
                      style={{ backgroundColor: "#ece6f1" }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${section.attendanceRate}%`,
                          backgroundColor: getAttendanceColor(section.attendanceRate),
                        }}
                      ></div>
                    </div>
                    <div
                      className="flex items-center gap-2 text-xs"
                      style={{ color: "#484553" }}
                    >
                      <span className="material-symbols-outlined text-sm">
                        schedule
                      </span>
                      <span className="truncate">{section.schedule}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    className="mt-auto flex justify-between items-center pt-4 border-t"
                    style={{ borderColor: "rgba(202, 196, 214, 0.1)" }}
                  >
                    <div className="flex -space-x-2">
                      {section.students.map((studentUrl, index) => (
                        <img
                          key={index}
                          className="w-6 h-6 rounded-full border-2"
                          style={{ borderColor: "#ffffff" }}
                          alt="Student"
                          src={studentUrl}
                        />
                      ))}
                      <div
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold"
                        style={{
                          borderColor: "#ffffff",
                          backgroundColor: "#e6e0ec",
                          color: "#484553",
                        }}
                      >
                        +{section.totalStudents}
                      </div>
                    </div>
                    <button
                      className="font-bold text-xs flex items-center gap-1 hover:underline transition-colors whitespace-nowrap"
                      style={{ color: "#5b3ebf" }}
                    >
                      MANAGE <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add New Class Button */}
              <button
                className="group border-2 border-dashed rounded-xl p-4 lg:p-6 flex flex-col items-center justify-center gap-3 lg:gap-4 transition-all min-h-[280px] lg:min-h-[320px]"
                style={{ borderColor: "rgba(202, 196, 214, 0.5)", color: "#484553" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f7f1fd";
                  e.currentTarget.style.borderColor = "#5b3ebf";
                  e.currentTarget.style.color = "#5b3ebf";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderColor = "rgba(202, 196, 214, 0.5)";
                  e.currentTarget.style.color = "#484553";
                }}
              >
                <div
                  className="w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: "#f1ecf7" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#e7deff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f1ecf7")
                  }
                >
                  <span className="material-symbols-outlined text-2xl lg:text-3xl">add</span>
                </div>
                <div className="text-center px-2">
                  <h4
                    className="font-headline text-lg font-bold mb-1"
                    style={{ color: "#1c1a22" }}
                  >
                    Add New Section
                  </h4>
                  <p
                    className="font-body text-xs opacity-70"
                    style={{ color: "#484553" }}
                  >
                    Participation across all active sections
                  </p>
                </div>
              </button>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
