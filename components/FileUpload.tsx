import React, { useCallback, useState } from 'react';
import { Upload, FileText, FileSpreadsheet, FileImage, X, CheckCircle2, Camera } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const validateAndSelect = (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/heic'
    ];
    
    const validExtensions = ['.pdf', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.webp', '.heic'];
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (validTypes.includes(file.type) || hasValidExtension) {
      onFileSelect(file);
    } else {
      alert('Please upload a valid PDF, Excel, or Image file.');
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.pdf')) return <FileText size={20} />;
    if (fileName.match(/\.(xlsx|xls)$/)) return <FileSpreadsheet size={20} />;
    return <FileImage size={20} />;
  };

  if (selectedFile) {
    return (
      <div className="w-full p-4 bg-white rounded-xl border border-indigo-100 shadow-sm animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              {getFileIcon(selectedFile.name)}
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-sm text-slate-900 truncate max-w-[180px]">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button 
            onClick={onClear}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 flex items-center text-xs text-green-600 font-medium">
          <CheckCircle2 size={14} className="mr-1.5" />
          Ready to process
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        w-full p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200 group
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' 
          : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 bg-white'
        }
      `}
    >
      <input 
        type="file" 
        id="file-upload" 
        className="hidden" 
        accept=".pdf,.xlsx,.xls,image/*" 
        capture="environment"
        onChange={handleFileInput}
      />
      <label htmlFor="file-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
        <div className="flex space-x-3 mb-3">
            <div className="p-2.5 bg-indigo-50 group-hover:bg-indigo-100 rounded-full text-indigo-600 transition-colors">
              <Upload size={20} />
            </div>
            <div className="p-2.5 bg-indigo-50 group-hover:bg-indigo-100 rounded-full text-indigo-600 transition-colors">
              <Camera size={20} />
            </div>
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Upload file or Snap Photo
        </h3>
        <p className="text-slate-500 text-xs max-w-[200px] mx-auto leading-relaxed">
          Supports PDF, Excel, and Images
        </p>
      </label>
    </div>
  );
};
