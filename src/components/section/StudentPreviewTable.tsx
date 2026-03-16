"use client";

import { StudentData } from "./ImportModal";

interface StudentPreviewTableProps {
  students: StudentData[];
  showEmptyColumns: boolean;
  onToggleEmptyColumns: () => void;
}

interface ColumnDef {
  key: keyof StudentData;
  label: string;
}

const allColumns: ColumnDef[] = [
  { key: 'lrn', label: 'LRN' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'sex', label: 'Sex' },
  { key: 'birthDate', label: 'Birth Date' },
  { key: 'religion', label: 'Religion' },
  { key: 'barangay', label: 'Barangay' },
  { key: 'city', label: 'City' },
  { key: 'province', label: 'Province' },
  { key: 'fatherName', label: 'Father\'s Name' },
  { key: 'motherMaidenName', label: 'Mother\'s Maiden Name' },
  { key: 'guardianName', label: 'Guardian Name' },
  { key: 'guardianRelationship', label: 'Relationship' },
  { key: 'guardianContactNumber', label: 'Contact Number' },
  { key: 'learningModality', label: 'Learning Modality' },
  { key: 'studentStatus', label: 'Status' },
];

export default function StudentPreviewTable({
  students,
  showEmptyColumns,
  onToggleEmptyColumns,
}: StudentPreviewTableProps) {
  // Determine which columns have data
  const columnsWithData = allColumns.filter((col) => {
    if (['lrn', 'lastName', 'firstName'].includes(col.key)) return true; // Always show required fields
    return students.some((student) => student[col.key] && student[col.key].trim() !== '');
  });

  const displayColumns = showEmptyColumns ? allColumns : columnsWithData;

  return (
    <div>
      {/* Table Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold" style={{ color: '#1F1F1F' }}>
          Student List Preview ({students.length} students)
        </h4>
        <button
          onClick={onToggleEmptyColumns}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
          style={{
            backgroundColor: showEmptyColumns ? '#F0EDF7' : '#6C5CE7',
            color: showEmptyColumns ? '#6B6B6B' : '#FFFFFF',
          }}
        >
          <span className="material-symbols-outlined text-base">
            {showEmptyColumns ? 'visibility_off' : 'visibility'}
          </span>
          {showEmptyColumns ? 'Hide Empty Columns' : 'Show All Columns'}
        </button>
      </div>

      {/* Table with Sticky Header Scroll */}
      <div
        className="rounded-xl overflow-hidden border"
        style={{ borderColor: '#E5E7EB' }}
      >
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr style={{ backgroundColor: '#F0EDF7' }}>
                {displayColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-bold uppercase whitespace-nowrap border-b"
                    style={{ color: '#6B6B6B', borderColor: '#E5E7EB' }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr
                  key={index}
                  className="border-b last:border-b-0"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  {displayColumns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-sm whitespace-nowrap"
                      style={{ color: '#1F1F1F' }}
                    >
                      {student[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column Summary */}
      {!showEmptyColumns && columnsWithData.length < allColumns.length && (
        <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
          {allColumns.length - columnsWithData.length} empty column(s) hidden
        </p>
      )}
    </div>
  );
}
