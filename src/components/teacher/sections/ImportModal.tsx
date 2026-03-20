"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import FileUploadZone from "./FileUploadZone";
import StudentPreviewTable from "./StudentPreviewTable";
import { PopupAlert } from "@/components/ui";

export interface StudentData {
  // Basic Info (required minimum)
  lrn: string;
  lastName: string;
  firstName: string;
  middleName: string;

  // Personal Info
  sex: string;
  birthDate: string;
  religion: string;

  // Address
  barangay: string;
  city: string;
  province: string;

  // Parent/Guardian Info
  fatherName: string;
  motherMaidenName: string;
  guardianName: string;
  guardianRelationship: string;
  guardianContactNumber: string;

  // Academic Info
  learningModality: string;

  // Status
  studentStatus: string;
  createdAt: string;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sectionName: string, gradeLevel: string, students: StudentData[]) => void;
}

export default function ImportModal({ isOpen, onClose, onSave }: ImportModalProps) {
  const [sectionName, setSectionName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('7');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [showEmptyColumns, setShowEmptyColumns] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'error' | 'success' | 'info'>('info');

  if (!isOpen) return null;

  const findColumnIndex = (headers: string[], possibleNames: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].trim().toLowerCase();
      // Check for exact match or if header contains the possible name
      if (possibleNames.some(name => {
        const normalizedName = name.toLowerCase();
        return header === normalizedName || header.includes(normalizedName);
      })) {
        return i;
      }
    }
    return -1;
  };

  const parseExcelData = (data: any[][]): StudentData[] => {
    if (data.length === 0) return [];

    const headers = data[0].map(h => String(h).trim());

    const lrnIndex = findColumnIndex(headers, ['lrn', 'student id', 'studentid', 'id']);
    const lastNameIndex = findColumnIndex(headers, ['last name', 'lastname', 'surname']);
    const firstNameIndex = findColumnIndex(headers, ['first name', 'firstname', 'given name']);
    const middleNameIndex = findColumnIndex(headers, ['middle name', 'middlename', 'mi']);
    const sexIndex = findColumnIndex(headers, ['sex', 'gender']);
    const birthDateIndex = findColumnIndex(headers, ['birth date', 'birthdate', 'date of birth', 'dob']);
    const religionIndex = findColumnIndex(headers, ['religion']);
    const barangayIndex = findColumnIndex(headers, ['barangay']);
    const cityIndex = findColumnIndex(headers, ['city']);
    const provinceIndex = findColumnIndex(headers, ['province']);
    const fatherNameIndex = findColumnIndex(headers, ['father name', 'fathername', 'father\'s name']);
    const motherMaidenNameIndex = findColumnIndex(headers, ['mother maiden name', 'mothermaidenname', 'mother\'s maiden name']);
    const guardianNameIndex = findColumnIndex(headers, ['guardian name', 'guardianname']);
    const guardianRelationshipIndex = findColumnIndex(headers, ['guardian relationship', 'guardianrelationship', 'relationship']);
    const guardianContactIndex = findColumnIndex(headers, ['guardian contact', 'guardiancontact', 'contact number', 'phone']);
    const learningModalityIndex = findColumnIndex(headers, ['learning modality', 'learningmodality', 'modality']);
    const studentStatusIndex = findColumnIndex(headers, ['student status', 'studentstatus', 'status']);

    const parsedStudents: StudentData[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      if (lrnIndex === -1 || lastNameIndex === -1 || firstNameIndex === -1) continue;

      const lrn = String(row[lrnIndex] || '').trim();
      const lastName = String(row[lastNameIndex] || '').trim();
      const firstName = String(row[firstNameIndex] || '').trim();

      if (!lrn || !lastName || !firstName) continue;

      // Normalize sex value from M/F to male/female, empty if not provided
      const rawSex = sexIndex !== -1 ? String(row[sexIndex] || '') : '';
      const normalizedSex = rawSex.toLowerCase() === 'f' || rawSex.toLowerCase() === 'female'
        ? 'female'
        : rawSex.toLowerCase() === 'm' || rawSex.toLowerCase() === 'male'
          ? 'male'
          : '';

      parsedStudents.push({
        lrn,
        lastName,
        firstName,
        middleName: middleNameIndex !== -1 ? String(row[middleNameIndex] || '') : '',
        sex: normalizedSex,
        birthDate: birthDateIndex !== -1 ? String(row[birthDateIndex] || '') : '',
        religion: religionIndex !== -1 ? String(row[religionIndex] || '') : '',
        barangay: barangayIndex !== -1 ? String(row[barangayIndex] || '') : '',
        city: cityIndex !== -1 ? String(row[cityIndex] || '') : '',
        province: provinceIndex !== -1 ? String(row[provinceIndex] || '') : '',
        fatherName: fatherNameIndex !== -1 ? String(row[fatherNameIndex] || '') : '',
        motherMaidenName: motherMaidenNameIndex !== -1 ? String(row[motherMaidenNameIndex] || '') : '',
        guardianName: guardianNameIndex !== -1 ? String(row[guardianNameIndex] || '') : '',
        guardianRelationship: guardianRelationshipIndex !== -1 ? String(row[guardianRelationshipIndex] || '') : '',
        guardianContactNumber: guardianContactIndex !== -1 ? String(row[guardianContactIndex] || '') : '',
        learningModality: learningModalityIndex !== -1 ? String(row[learningModalityIndex] || '') : '',
        studentStatus: studentStatusIndex !== -1 ? String(row[studentStatusIndex] || '') : 'active',
        createdAt: new Date().toISOString(),
      });
    }

    return parsedStudents;
  };

  const parseCSV = (content: string): StudentData[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());

    const lrnIndex = findColumnIndex(headers, ['lrn', 'student id', 'studentid', 'id']);
    const lastNameIndex = findColumnIndex(headers, ['last name', 'lastname', 'surname']);
    const firstNameIndex = findColumnIndex(headers, ['first name', 'firstname', 'given name']);
    const middleNameIndex = findColumnIndex(headers, ['middle name', 'middlename', 'mi']);
    const sexIndex = findColumnIndex(headers, ['sex', 'gender']);
    const birthDateIndex = findColumnIndex(headers, ['birth date', 'birthdate', 'date of birth', 'dob']);
    const religionIndex = findColumnIndex(headers, ['religion']);
    const barangayIndex = findColumnIndex(headers, ['barangay']);
    const cityIndex = findColumnIndex(headers, ['city']);
    const provinceIndex = findColumnIndex(headers, ['province']);
    const fatherNameIndex = findColumnIndex(headers, ['father name', 'fathername', 'father\'s name']);
    const motherMaidenNameIndex = findColumnIndex(headers, ['mother maiden name', 'mothermaidenname', 'mother\'s maiden name']);
    const guardianNameIndex = findColumnIndex(headers, ['guardian name', 'guardianname']);
    const guardianRelationshipIndex = findColumnIndex(headers, ['guardian relationship', 'guardianrelationship', 'relationship']);
    const guardianContactIndex = findColumnIndex(headers, ['guardian contact', 'guardiancontact', 'contact number', 'phone']);
    const learningModalityIndex = findColumnIndex(headers, ['learning modality', 'learningmodality', 'modality']);
    const studentStatusIndex = findColumnIndex(headers, ['student status', 'studentstatus', 'status']);

    const parsedStudents: StudentData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());

      if (lrnIndex === -1 || lastNameIndex === -1 || firstNameIndex === -1) continue;

      const lrn = String(values[lrnIndex] || '').trim();
      const lastName = String(values[lastNameIndex] || '').trim();
      const firstName = String(values[firstNameIndex] || '').trim();

      if (!lrn || !lastName || !firstName) continue;

      // Normalize sex value from M/F to male/female, empty if not provided
      const rawSex = sexIndex !== -1 ? String(values[sexIndex] || '') : '';
      const normalizedSex = rawSex.toLowerCase() === 'f' || rawSex.toLowerCase() === 'female'
        ? 'female'
        : rawSex.toLowerCase() === 'm' || rawSex.toLowerCase() === 'male'
          ? 'male'
          : '';

      parsedStudents.push({
        lrn,
        lastName,
        firstName,
        middleName: middleNameIndex !== -1 ? String(values[middleNameIndex] || '') : '',
        sex: normalizedSex,
        birthDate: birthDateIndex !== -1 ? String(values[birthDateIndex] || '') : '',
        religion: religionIndex !== -1 ? String(values[religionIndex] || '') : '',
        barangay: barangayIndex !== -1 ? String(values[barangayIndex] || '') : '',
        city: cityIndex !== -1 ? String(values[cityIndex] || '') : '',
        province: provinceIndex !== -1 ? String(values[provinceIndex] || '') : '',
        fatherName: fatherNameIndex !== -1 ? String(values[fatherNameIndex] || '') : '',
        motherMaidenName: motherMaidenNameIndex !== -1 ? String(values[motherMaidenNameIndex] || '') : '',
        guardianName: guardianNameIndex !== -1 ? String(values[guardianNameIndex] || '') : '',
        guardianRelationship: guardianRelationshipIndex !== -1 ? String(values[guardianRelationshipIndex] || '') : '',
        guardianContactNumber: guardianContactIndex !== -1 ? String(values[guardianContactIndex] || '') : '',
        learningModality: learningModalityIndex !== -1 ? String(values[learningModalityIndex] || '') : '',
        studentStatus: studentStatusIndex !== -1 ? String(values[studentStatusIndex] || '') : 'active',
        createdAt: new Date().toISOString(),
      });
    }

    return parsedStudents;
  };

  const showError = (message: string) => {
    setAlertMessage(message);
    setAlertType('error');
    setShowAlert(true);
  };

  const showSuccess = (message: string) => {
    setAlertMessage(message);
    setAlertType('success');
    setShowAlert(true);
  };

  const processFile = (file: File) => {
    const isCSV = file.name.endsWith('.csv');
    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCSV && !isXLSX) {
      showError('Please select a valid CSV or Excel file');
      return;
    }

    setSelectedFile(file);
    setImportError(null);
    setImportSuccess(false);
    setStudents([]);

    if (isCSV) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsedStudents = parseCSV(content);

          if (parsedStudents.length === 0) {
            showError('No student data found. Please check if the file has LRN, Last Name, and First Name columns.');
            return;
          }

          setStudents(parsedStudents);
          setImportSuccess(true);
          showSuccess(`Successfully loaded ${parsedStudents.length} student(s)!`);
        } catch (err) {
          showError('Error parsing file. Please check the file format.');
        }
      };
      reader.onerror = () => {
        showError('Error reading file');
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });

          const parsedStudents = parseExcelData(jsonData);

          if (parsedStudents.length === 0) {
            showError('No student data found. Please check if the file has LRN, Last Name, and First Name columns.');
            return;
          }

          setStudents(parsedStudents);
          setImportSuccess(true);
          showSuccess(`Successfully loaded ${parsedStudents.length} student(s)!`);
        } catch (err) {
          showError('Error parsing Excel file. Please check the file format.');
        }
      };
      reader.onerror = () => {
        showError('Error reading file');
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSave = () => {
    if (!sectionName.trim()) {
      showError('Please enter a section name');
      return;
    }

    if (!importSuccess || students.length === 0) {
      showError('Please upload a CSV or Excel file with student data');
      return;
    }

    onSave(sectionName, gradeLevel, students);
  };

  const handleClose = () => {
    setSectionName('');
    setGradeLevel('7');
    setSelectedFile(null);
    setStudents([]);
    setImportError(null);
    setImportSuccess(false);
    setShowEmptyColumns(true);
    setShowAlert(false);
    onClose();
  };

  return (
    <>
      {/* Popup Alert */}
      {showAlert && (
        <PopupAlert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}

      {/* Modal Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={handleClose}
      >
        {/* Modal Content */}
        <div
          className="rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{ backgroundColor: '#FFFFFF' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            className="px-8 py-6 flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#F0EDF7' }}
          >
            <h3 className="text-2xl font-bold" style={{ color: '#1F1F1F' }}>
              Import Students from CSV
            </h3>
          </div>

          {/* Modal Body */}
          <div className="p-8 overflow-y-auto flex-1">
            {/* Grade Level and Section Name */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Grade Level */}
              <div>
                <label
                  htmlFor="gradeLevel"
                  className="block text-sm font-bold mb-2"
                  style={{ color: '#1F1F1F' }}
                >
                  Grade Level <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  id="gradeLevel"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] transition-all"
                  style={{
                    borderColor: '#E5E7EB',
                    backgroundColor: '#FFFFFF',
                    color: '#1F1F1F',
                  }}
                >
                  <option value="7">Grade 7</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>

              {/* Section Name */}
              <div>
                <label
                  htmlFor="sectionName"
                  className="block text-sm font-bold mb-2"
                  style={{ color: '#1F1F1F' }}
                >
                  Section Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="sectionName"
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g., St. Peter"
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] transition-all"
                  style={{
                    borderColor: '#E5E7EB',
                    backgroundColor: '#FFFFFF',
                    color: '#1F1F1F',
                  }}
                />
              </div>
            </div>

            {/* File Upload Section */}
            <FileUploadZone
              selectedFile={selectedFile}
              onFileSelect={processFile}
            />

            {/* Student List Preview */}
            {students.length > 0 && (
              <StudentPreviewTable
                students={students}
                showEmptyColumns={showEmptyColumns}
                onToggleEmptyColumns={() => setShowEmptyColumns(!showEmptyColumns)}
              />
            )}
          </div>

          {/* Modal Footer */}
          <div
            className="px-8 py-4 flex items-center justify-end gap-4 shrink-0"
            style={{ backgroundColor: '#F0EDF7' }}
          >
            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-xl font-bold transition-all hover:bg-[#F7F6FB]"
              style={{ backgroundColor: '#FFFFFF', color: '#6B6B6B' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 rounded-xl font-bold transition-all hover:bg-[#5A4BD6]"
              style={{ backgroundColor: '#6C5CE7', color: '#FFFFFF' }}
            >
              Save Section & Students
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
