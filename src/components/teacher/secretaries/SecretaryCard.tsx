"use client";

interface SecretaryCardProps {
  secretaryUid: string;
  secretaryLrn: string;
  secretaryName: string;
  secretaryEmail: string;
  sectionId: string;
  sectionName: string;
  gradeLevel: string;
  subject: string;
  schoolYear: string;
  status: "active" | "removed";
  appointedAt: Date | string;
  lastActive?: string;
  onViewRecords?: () => void;
  onRemove?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
}

export default function SecretaryCard({
  secretaryUid,
  secretaryLrn,
  secretaryName,
  secretaryEmail,
  sectionId,
  sectionName,
  gradeLevel,
  subject,
  schoolYear,
  status,
  appointedAt,
  lastActive,
  onViewRecords,
  onRemove,
  onRestore,
  onDelete,
}: SecretaryCardProps) {
  return (
    <div
      className="group p-4 lg:p-8 rounded-[2rem] flex flex-col justify-between transition-all"
      style={{
        backgroundColor: "#FFFFFF",
        opacity: status === "removed" ? 0.8 : 1,
        filter: status === "removed" ? "grayscale(0.5)" : "none",
      }}
      onMouseEnter={(e) => {
        if (status === "active") {
          e.currentTarget.style.backgroundColor = "#F7F6FB";
        }
      }}
      onMouseLeave={(e) => {
        if (status === "active") {
          e.currentTarget.style.backgroundColor = "#FFFFFF";
        }
      }}
    >
      <div>
        <div className="flex justify-between items-start mb-4 lg:mb-6">
          {/* Avatar */}
          <div
            className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "#e6e0ec" }}
          >
            <span
              className="material-symbols-outlined text-3xl lg:text-4xl"
              style={{ color: "#484553" }}
            >
              person
            </span>
          </div>
          <span
            className="px-2 lg:px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-widest"
            style={
              status === "active"
                ? { backgroundColor: "#c5fff7", color: "#00201d" }
                : { backgroundColor: "#ffdad6", color: "#93000a" }
            }
          >
            {status === "active" ? "Active" : "Removed"}
          </span>
        </div>

        {/* Secretary Info */}
        <h3 className="text-xl lg:text-2xl font-bold" style={{ color: "#1c1a22" }}>
          {secretaryName || `Secretary (${secretaryLrn})`}
        </h3>
        <p className="mb-2 lg:mb-4" style={{ color: "#484553" }}>
          {subject} • {sectionName}
        </p>
        <p className="text-sm mb-4 lg:mb-6" style={{ color: "#484553" }}>
          Grade {gradeLevel} • {schoolYear}
        </p>

        {/* Last Active */}
        <div className="flex items-center gap-2 mb-6 lg:mb-8">
          <span
            className="material-symbols-outlined text-sm"
            style={{
              color: status === "active" ? "#6C5CE7" : "#EF4444",
            }}
          >
            {status === "active" ? "history" : "block"}
          </span>
          <span className="text-sm italic" style={{ color: "#484553" }}>
            {status === "active"
              ? `Appointed: ${lastActive}`
              : "Access revoked"}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {status === "active" ? (
          <>
            <button
              className="flex-1 py-2 lg:py-3 rounded-xl font-bold text-xs lg:text-sm flex items-center justify-center gap-2 border transition-colors"
              style={{
                backgroundColor: "#FFFFFF",
                color: "#484553",
                borderColor: "transparent",
              }}
              onClick={onViewRecords}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#6C5CE7";
                e.currentTarget.style.borderColor = "#e7deff";
                e.currentTarget.style.backgroundColor = "#e7deff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#484553";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
              title="View attendance records for this secretary"
            >
              <span className="material-symbols-outlined text-base lg:text-lg">
                visibility
              </span>
              <span className="hidden sm:inline">View Records</span>
              <span className="sm:hidden">View</span>
            </button>
            <button
              className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-colors"
              style={{ backgroundColor: "#FFFFFF", color: "#484553" }}
              onClick={onRemove}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#e7deff";
                e.currentTarget.style.color = "#6C5CE7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FFFFFF";
                e.currentTarget.style.color = "#484553";
              }}
              title="Remove secretary from this subject"
            >
              <span className="material-symbols-outlined text-base lg:text-xl">
                person_remove
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              className="flex-1 py-2 lg:py-3 rounded-xl font-bold text-xs lg:text-sm flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: "#e7deff",
                color: "#1e0061",
              }}
              onClick={onRestore}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#6C5CE7";
                e.currentTarget.style.color = "#FFFFFF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#e7deff";
                e.currentTarget.style.color = "#1e0061";
              }}
              title="Restore this appointment"
            >
              <span className="material-symbols-outlined text-base lg:text-lg">
                power_settings_new
              </span>
              <span className="hidden sm:inline">Restore</span>
            </button>
            <button
              className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-colors"
              style={{ backgroundColor: "#FFFFFF", color: "#484553" }}
              onClick={onDelete}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ffdad6";
                e.currentTarget.style.color = "#93000a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FFFFFF";
                e.currentTarget.style.color = "#484553";
              }}
              title="Permanently delete this appointment"
            >
              <span className="material-symbols-outlined text-base lg:text-xl">
                delete
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
