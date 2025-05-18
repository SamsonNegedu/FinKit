import React, { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { detectFileType, parseCSV, parseExcel } from '../utils/parser';
import { Transaction } from '../types';

interface FileUploadProps {
  onTransactionsLoaded: (transactions: Transaction[]) => void;
  onError: (message: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onTransactionsLoaded, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    try {
      setIsLoading(true);
      setFileName(file.name);

      const fileType = detectFileType(file);
      let transactions: Transaction[] = [];

      if (fileType === 'csv') {
        const text = await file.text();
        transactions = await parseCSV(text);
      } else if (fileType === 'excel') {
        transactions = await parseExcel(file);
      } else {
        throw new Error('Unsupported file format. Please upload a CSV or Excel file.');
      }

      if (transactions.length === 0) {
        throw new Error('No transactions found in the file.');
      }

      onTransactionsLoaded(transactions);
    } catch (error) {
      onError((error as Error).message);
      setFileName(null);
    } finally {
      setIsLoading(false);
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all h-[200px] flex items-center justify-center ${isDragging
          ? 'border-blue-500 bg-blue-50'
          : fileName
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-blue-400'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileChange}
        />

        {fileName ? (
          <div className="flex flex-col items-center">
            <FileText className="h-12 w-12 text-green-500 mb-2" />
            <p className="text-green-600 font-medium">{fileName}</p>
            <p className="text-sm text-gray-500 mt-2">File loaded successfully</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
            <p className="text-blue-600 font-medium">Processing file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-blue-500 mb-2" />
            <p className="text-lg font-medium">Drag and drop your transaction file</p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
            <p className="text-xs text-gray-400 mt-4">Supports CSV and Excel formats</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
