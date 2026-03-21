"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";

interface FileUploadZoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
}

export default function FileUploadZone({ selectedFile, onFileSelect }: FileUploadZoneProps) {
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
          className="block text-xs uppercase mb-2"
          style={{ color: '#6B6B6B' }}
        >
          Select CSV/Excel File
        </label>
        <motion.div
          className="border border-dashed rounded-md p-8 text-center cursor-pointer transition-colors"
          style={{
            borderColor: '#E5E7EB',
            borderWidth: '0.5px',
            backgroundColor: isDragging ? '#F9FAFB' : 'transparent',
          }}
          onClick={() => inputRef?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={{
            backgroundColor: '#F9FAFB',
          }}
        >
          <input
            ref={setInputRef}
            id="csvFile"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleChange}
          />
          <div className="flex flex-col items-center">
            <Upload 
              size={20} 
              style={{ color: '#6B7280', marginBottom: '16px' }}
            />
            <p 
              className="text-sm mb-2" 
              style={{ 
                color: '#1F1F1F',
                fontWeight: 500,
              }}
            >
              {selectedFile ? selectedFile.name : 'Click to select or drag and drop'}
            </p>
            <p 
              className="text-xs" 
              style={{ color: '#6B7280' }}
            >
              Supports CSV and Excel files. Required: LRN, Last Name, First Name
            </p>
          </div>
        </motion.div>
      </div>
    );
}
