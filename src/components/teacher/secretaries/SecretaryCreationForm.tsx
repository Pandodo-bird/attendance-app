"use client";

import { useState, useEffect, useRef } from "react";
import {
  getTeacherSections,
  getSectionStudents,
  checkSecretaryAccountExists,
  createAppointment,
  Student,
} from "@/lib/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AvailableStudent {
  sectionId: string;
  sectionName: string;
  gradeLevel: string;
  student: Student;
}

interface SecretaryCreationFormProps {
  teacherId: string;
  onSuccess: (credentials: { email: string; password: string }) => void;
  onCancel: () => void;
  createSecretaryAccount: (displayName: string, email: string, password: string) => Promise<{ email: string; password: string }>;
  refreshTrigger?: number; // Increment this to force reload sections
}

// Combobox/Dropdown component for searchable selects
function SearchableDropdown<T extends { id?: string; sectionId?: string; lrn?: string; sectionName?: string; gradeLevel?: string; firstName?: string; lastName?: string }>({
  value,
  onChange,
  options,
  placeholder,
  displayFormatter,
  disabled = false,
  loading = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: T[];
  placeholder: string;
  displayFormatter: (option: T) => string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((opt) =>
    displayFormatter(opt).toLowerCase().includes(search.toLowerCase())
  );

  // Helper to extract the value key from an option
  const getOptionValue = (opt: T): string => {
    // Check if it's an AvailableStudent (has nested student with lrn)
    const anyOpt = opt as unknown as { student?: { lrn?: string } };
    if (anyOpt.student?.lrn) {
      return anyOpt.student.lrn;
    }
    // Otherwise use id or lrn directly
    return (opt.id || opt.lrn || '') as string;
  };

  const selectedOption = options.find((opt) => getOptionValue(opt) === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="w-full px-4 py-3 rounded-xl border-2 outline-none transition-colors cursor-pointer flex items-center justify-between"
        style={{
          borderColor: value ? "#6C5CE7" : "#e6e0ec",
          backgroundColor: "#ffffff",
          color: "#1c1a22",
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
      >
        <span className={selectedOption ? "text-sm" : "text-sm"} style={{ color: selectedOption ? "#1c1a22" : "#9CA3AF" }}>
          {selectedOption ? displayFormatter(selectedOption) : placeholder}
        </span>
        <span className="material-symbols-outlined text-sm" style={{ color: "#6C5CE7" }}>
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: "#e6e0ec" }}>
          <div className="sticky top-0 p-2 border-b" style={{ borderColor: "#e6e0ec", backgroundColor: "#faf8fc" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                e.stopPropagation();
              }}
              placeholder="Search..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: "#ffffff", border: "1px solid #e6e0ec", color: "#1c1a22" }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {loading ? (
            <div className="p-4 text-center">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "#6C5CE7", borderTopColor: "transparent" }}></div>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-sm" style={{ color: "#484553" }}>
              No options found
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const optValue = getOptionValue(opt) || String(idx);
              return (
                <div
                  key={optValue}
                  className="px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: optValue === value ? "#f1ecf7" : "transparent",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(optValue);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f1ecf7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = optValue === value ? "#f1ecf7" : "transparent";
                  }}
                >
                  <span className="text-sm" style={{ color: "#1c1a22" }}>
                    {displayFormatter(opt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function SecretaryCreationForm({
  teacherId,
  onSuccess,
  onCancel,
  createSecretaryAccount,
  refreshTrigger = 0,
}: SecretaryCreationFormProps) {
  // Form state
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedStudentLrn, setSelectedStudentLrn] = useState("");
  const [secretaryName, setSecretaryName] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [subject, setSubject] = useState("");

  // Password state
  const [useLrnAsPassword, setUseLrnAsPassword] = useState(true);
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Data state
  const [availableSections, setAvailableSections] = useState<{ id: string; sectionName: string; gradeLevel: string }[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);

  // Validation state
  const [touched, setTouched] = useState<{
    section: boolean;
    student: boolean;
    subject: boolean;
    password: boolean;
  }>({
    section: false,
    student: false,
    subject: false,
    password: false,
  });

  // Load sections on mount or when refreshTrigger changes
  useEffect(() => {
    const loadSections = async () => {
      if (!teacherId) return;

      try {
        setIsLoadingSections(true);
        // Use cache by default (faster, reduces Firestore reads)
        const sections = await getTeacherSections(teacherId);
        setAvailableSections(sections.map(s => ({ id: s.id, sectionName: s.sectionName, gradeLevel: s.gradeLevel })));
      } catch (err) {
        console.error("Error loading sections:", err);
        setError("Failed to load sections");
      } finally {
        setIsLoadingSections(false);
      }
    };
    loadSections();
  }, [teacherId, refreshTrigger]);

  // Auto-generate email when LRN changes
  useEffect(() => {
    if (selectedStudentLrn) {
      setGeneratedEmail(`${selectedStudentLrn}@app.local`);
    } else {
      setGeneratedEmail("");
    }
  }, [selectedStudentLrn]);

  // Get current password based on toggle state
  const getCurrentPassword = (): string => {
    if (useLrnAsPassword) {
      return selectedStudentLrn;
    }
    return customPassword;
  };

  // Validation functions
  const validateSection = () => !!selectedSectionId;
  const validateStudent = () => !!selectedStudentLrn;
  const validateSubject = () => !!subject.trim();
  const validatePassword = () => {
    const pwd = getCurrentPassword();
    return pwd.length >= 6;
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      validateSection() &&
      validateStudent() &&
      validateSubject() &&
      validatePassword()
    );
  };

  // Handle section selection
  const handleSectionChange = async (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setSelectedStudentLrn("");
    setSecretaryName("");
    setGeneratedEmail("");
    setSubject("");
    setTouched((prev) => ({ ...prev, section: true, student: false, subject: false }));
    setError(null);

    if (!sectionId) {
      setAvailableStudents([]);
      return;
    }

    setIsLoadingStudents(true);
    try {
      const students = await getSectionStudents(sectionId);
      const section = availableSections.find((s) => s.id === sectionId);

      setAvailableStudents(
        students
          .filter((s) => s.studentStatus === "active")
          .map((student) => ({
            sectionId: sectionId,
            sectionName: section?.sectionName || "",
            gradeLevel: section?.gradeLevel || "",
            student,
          }))
      );
    } catch (err) {
      console.error("Error loading students:", err);
      setError("Failed to load students. Please try again.");
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Handle student selection
  const handleStudentChange = (lrn: string) => {
    setSelectedStudentLrn(lrn);
    setTouched((prev) => ({ ...prev, student: true }));
    setError(null);

    // Auto-fill name from student data
    const studentData = availableStudents.find((s) => s.student.lrn === lrn);
    if (studentData) {
      setSecretaryName(
        `${studentData.student.firstName} ${studentData.student.lastName}`
      );
    }
  };

  // Handle password toggle
  const handleToggleLrnPassword = (checked: boolean) => {
    setUseLrnAsPassword(checked);
    setTouched((prev) => ({ ...prev, password: true }));
    setError(null);
  };

  // Handle custom password change
  const handleCustomPasswordChange = (password: string) => {
    setCustomPassword(password);
    setTouched((prev) => ({ ...prev, password: true }));
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate all fields
    setTouched({ section: true, student: true, subject: true, password: true });

    if (!isFormValid()) {
      setError("Please fill in all required fields correctly.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if student already has secretary account
      const exists = await checkSecretaryAccountExists(selectedStudentLrn);
      if (exists) {
        setError("This student already has a secretary account");
        setIsSubmitting(false);
        return;
      }

      // Create the account
      const password = getCurrentPassword();
      const credentials = await createSecretaryAccount(
        secretaryName.trim(),
        generatedEmail,
        password
      );

      // Get the secretary's UID from the created account
      // We need to query Firestore to get the UID by LRN
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("lrn", "==", selectedStudentLrn));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error("Failed to find created secretary account");
      }

      const secretaryDoc = snapshot.docs[0];
      const secretaryUid = secretaryDoc.id;

      // Get the school year from the section
      const section = availableSections.find(s => s.id === selectedSectionId);
      const schoolYear = section?.gradeLevel ? "2025-2026" : "2025-2026";

      // Create the appointment linking secretary to section and subject
      await createAppointment(
        teacherId,
        secretaryUid,
        selectedStudentLrn,
        selectedSectionId,
        subject.trim(),
        schoolYear
      );

      setGeneratedCredentials(credentials);
      setSuccess(true);
      onSuccess(credentials);
    } catch (err: unknown) {
      console.error("Error creating secretary:", err);
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/email-already-in-use") {
        setError("This email is already registered");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else if (error.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError("Failed to create secretary account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading state
  if (isLoadingSections) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#6C5CE7", borderTopColor: "transparent" }}></div>
        <span className="ml-2 text-sm" style={{ color: "#484553" }}>Loading...</span>
      </div>
    );
  }

  // Render success state
  if (success && generatedCredentials) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#c5fff7" }}>
          <span className="material-symbols-outlined text-4xl" style={{ color: "#00201d" }}>check_circle</span>
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: "#1c1a22" }}>
          Secretary Registered!
        </h3>
        <p className="text-sm mb-4" style={{ color: "#484553" }}>
          The secretary account has been created successfully.
        </p>

        {/* Generated Credentials Display */}
        <div className="text-left p-4 rounded-xl space-y-3" style={{ backgroundColor: "#e8e0f0" }}>
          <p className="text-sm font-bold" style={{ color: "#1c1a22" }}>
            Credentials (share with secretary):
          </p>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "#484553" }}>
              Email:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={generatedCredentials.email}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#1c1a22",
                  border: "1px solid #e6e0ec",
                }}
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(generatedCredentials.email)}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: "#e7deff", color: "#6C5CE7" }}
                title="Copy email"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "#484553" }}>
              Password:
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={generatedCredentials.password}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#1c1a22",
                  border: "1px solid #e6e0ec",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: "#e7deff", color: "#6C5CE7" }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-sm">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(generatedCredentials.password)}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: "#e7deff", color: "#6C5CE7" }}
                title="Copy password"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </button>
            </div>
          </div>

          <p className="text-xs mt-2" style={{ color: "#93000a" }}>
            ⚠️ Please copy and securely share these credentials with the secretary.
          </p>
        </div>

        <button
          onClick={onCancel}
          className="mt-4 w-full py-3 rounded-xl font-bold text-sm transition-colors"
          style={{
            backgroundColor: "#6C5CE7",
            color: "#FFFFFF",
          }}
        >
          Done
        </button>
      </div>
    );
  }

  // Render form
  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 space-y-4">
        {/* Section Selection - Step 1 */}
        <div>
          <label className="block text-sm font-bold mb-2" style={{ color: "#1c1a22" }}>
            Select Section <span style={{ color: "#EF4444" }}>*</span>
          </label>
          {isLoadingSections ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#6C5CE7", borderTopColor: "transparent" }}></div>
              <span className="ml-2 text-sm" style={{ color: "#5b5568" }}>Loading sections...</span>
            </div>
          ) : availableSections.length === 0 ? (
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#fff5f5" }}>
              <span className="material-symbols-outlined text-3xl mb-2" style={{ color: "#EF4444" }}>info</span>
              <p className="text-sm" style={{ color: "#93000a" }}>
                No sections found. Please create a section first.
              </p>
            </div>
          ) : (
            <>
              <SearchableDropdown
                value={selectedSectionId}
                onChange={handleSectionChange}
                options={availableSections}
                placeholder="-- Select a section --"
                displayFormatter={(s) => `Section ${s.sectionName} - Grade ${s.gradeLevel}`}
              />
              {touched.section && !validateSection() && (
                <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
                  Please select a section
                </p>
              )}
            </>
          )}
        </div>

        {/* Student Selection - Step 2 */}
        <div>
          <label className="block text-sm font-bold mb-2" style={{ color: "#1c1a22" }}>
            Select Student <span style={{ color: "#EF4444" }}>*</span>
          </label>
          {!selectedSectionId ? (
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#e8e0f0" }}>
              <span className="material-symbols-outlined text-3xl mb-2" style={{ color: "#6C5CE7" }}>school</span>
              <p className="text-sm" style={{ color: "#484553" }}>
                Please select a section first
              </p>
            </div>
          ) : isLoadingStudents ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#6C5CE7", borderTopColor: "transparent" }}></div>
              <span className="ml-2 text-sm" style={{ color: "#5b5568" }}>Loading students...</span>
            </div>
          ) : availableStudents.length === 0 ? (
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#fff5f5" }}>
              <span className="material-symbols-outlined text-3xl mb-2" style={{ color: "#EF4444" }}>person_off</span>
              <p className="text-sm" style={{ color: "#93000a" }}>
                No students found in this section.
              </p>
            </div>
          ) : (
            <>
              <SearchableDropdown
                value={selectedStudentLrn}
                onChange={handleStudentChange}
                options={availableStudents}
                placeholder="-- Select a student --"
                displayFormatter={(s) => `${s.student.firstName} ${s.student.lastName} (LRN: ${s.student.lrn})`}
              />
              {touched.student && !validateStudent() && (
                <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
                  Please select a student
                </p>
              )}
            </>
          )}
        </div>

        {/* Subject Input - Step 3 (appears after student selection) */}
        {selectedStudentLrn && (
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "#1c1a22" }}>
              Subject <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setTouched((prev) => ({ ...prev, subject: true }));
              }}
              className="w-full px-4 py-3 rounded-xl border-2 outline-none transition-colors text-sm"
              style={{
                backgroundColor: "#ffffff",
                borderColor: subject ? "#6C5CE7" : "#e6e0ec",
                color: "#1c1a22",
              }}
              placeholder="e.g. Mathematics, Science, English"
            />
            {touched.subject && !validateSubject() && (
              <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
                Please enter a subject
              </p>
            )}
          </div>
        )}

        {/* Generated Credentials Summary Card - appears after student selection */}
        {selectedStudentLrn && secretaryName && (
          <div className="p-4 rounded-xl" style={{ backgroundColor: "#e8e0f0", border: "1px solid #d4c8e8" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-lg" style={{ color: "#6C5CE7" }}>key</span>
              <p className="text-sm font-bold" style={{ color: "#1c1a22" }}>
                Generated Credentials
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Secretary Name */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#5b5568" }}>
                  Secretary Name
                </label>
                <p className="text-sm font-medium" style={{ color: "#1c1a22" }}>
                  {secretaryName}
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#5b5568" }}>
                  Email Address
                </label>
                <p className="text-sm font-mono" style={{ color: "#1c1a22" }}>
                  {generatedEmail}
                </p>
              </div>
            </div>

            {/* Password Section */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "#d4c8e8" }}>
              <label className="block text-xs font-bold mb-2" style={{ color: "#1c1a22" }}>
                Password <span style={{ color: "#EF4444" }}>*</span>
              </label>

              {/* LRN as Password Toggle */}
              <div className="mb-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className="relative w-12 h-6 rounded-full transition-colors"
                    style={{
                      backgroundColor: useLrnAsPassword ? "#6C5CE7" : "#d4c8e8",
                    }}
                    onClick={() => handleToggleLrnPassword(!useLrnAsPassword)}
                  >
                    <div
                      className="absolute top-1 w-4 h-4 rounded-full transition-transform"
                      style={{
                        left: useLrnAsPassword ? "28px" : "4px",
                        transition: "left 0.2s ease",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        border: useLrnAsPassword ? "none" : "1px solid #b8aec6",
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium" style={{ color: "#1c1a22" }}>
                    Use LRN as default password
                  </span>
                </label>
              </div>

              {/* Password Display/Input */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: "#ffffff", border: "1px solid #e6e0ec" }}>
                {useLrnAsPassword ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold" style={{ color: "#6C5CE7" }}>
                      {selectedStudentLrn}
                    </span>
                  </div>
                ) : (
                  <div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={customPassword}
                      onChange={(e) => handleCustomPasswordChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                      style={{
                        backgroundColor: "#faf8fc",
                        color: "#1c1a22",
                        border: "1px solid #e6e0ec",
                      }}
                      placeholder="Enter custom password (min 6 characters)"
                    />
                    {touched.password && !validatePassword() && customPassword && (
                      <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
                        Password must be at least 6 characters
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs flex items-center gap-1"
                        style={{ color: "#6C5CE7" }}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                        {showPassword ? "Hide" : "Show"} password
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: "#fff5f5" }}>
            <span className="material-symbols-outlined" style={{ color: "#EF4444" }}>error</span>
            <p className="text-sm" style={{ color: "#93000a" }}>{error}</p>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="flex-shrink-0 pt-4 mt-4 border-t" style={{ borderColor: "#e6e0ec", backgroundColor: "#faf8fc" }}>
        {/* Warning Banner */}
        {selectedStudentLrn && (
          <div className="mb-4 p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: "#fff8e6" }}>
            <span className="material-symbols-outlined text-sm flex-shrink-0" style={{ color: "#b45309" }}>info</span>
            <p className="text-xs" style={{ color: "#92400e" }}>
              Share the email and password below with the secretary before closing.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
            style={{
              backgroundColor: "#f1ecf7",
              color: "#484553",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingStudents}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "#6C5CE7",
              color: "#FFFFFF",
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                Creating...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
