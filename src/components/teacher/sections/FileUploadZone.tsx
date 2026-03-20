"use client";

import { forwardRef, useState } from "react";
import { StudentData } from "./ImportModal";

interface FileUploadZoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
}

const FileUploadZone = forwardRef<HTMLInputElement, FileUploadZoneProps>(
  ({ selectedFile, onFileSelect }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    };

    return (
      <div className="mb-6">
        <label
          htmlFor="csvFile"
          className="block text-sm font-bold mb-2"
          style={{ color: '#1F1F1F' }}
        >
          Select CSV/Excel File
        </label>
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragging ? 'border-[#6C5CE7] bg-[#F7F6FB]' : ''}`}
          style={{
            borderColor: isDragging ? '#6C5CE7' : (selectedFile ? '#6C5CE7' : '#E5E7EB'),
            backgroundColor: isDragging ? '#F7F6FB' : 'transparent',
          }}
          onClick={() => inputRef?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={setInputRef}
            id="csvFile"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleChange}
          />
          <span
            className="material-symbols-outlined text-5xl mb-4"
            style={{ color: selectedFile ? '#6C5CE7' : '#9CA3AF' }}
          >
            description
          </span>
          <p className="text-sm font-bold mb-2" style={{ color: '#1F1F1F' }}>
            {selectedFile ? selectedFile.name : 'Click to select or drag and drop'}
          </p>
          <p className="text-xs" style={{ color: '#6B6B6B' }}>
            Supports CSV and Excel files. Required: LRN, Last Name, First Name
          </p>
        </div>
      </div>
    );
  }
);

FileUploadZone.displayName = 'FileUploadZone';

export default FileUploadZone;
