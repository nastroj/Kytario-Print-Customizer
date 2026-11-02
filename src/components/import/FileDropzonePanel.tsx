import React, { useCallback, useRef, useState } from 'react';
import { Upload, Music, Archive, FileJson } from 'lucide-react';

/** Maximum accepted file size (25 MB) — larger files are rejected with a clear message. */
export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = ['.json', '.zip'];
const ACCEPTED_MIME_TYPES = [
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
];

export interface FileValidationError {
  fileName: string;
  reason: string;
}

/** Validate a list of uploaded files (type + size). Returns per-file errors. */
export function validateUploadFiles(files: File[]): FileValidationError[] {
  const errors: FileValidationError[] = [];
  for (const file of files) {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    const typeOk = ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_MIME_TYPES.includes(file.type);
    if (!typeOk) {
      errors.push({
        fileName: file.name,
        reason: 'Unsupported file type. Only .json and .zip files are accepted.',
      });
      continue;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      errors.push({
        fileName: file.name,
        reason: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB.`,
      });
    }
    if (file.size === 0) {
      errors.push({ fileName: file.name, reason: 'File is empty.' });
    }
  }
  return errors;
}

interface FileDropzonePanelProps {
  /** Called with the list of files that passed validation. */
  onFilesAccepted: (files: File[]) => void;
  /** Called when one or more files fail validation. */
  onValidationErrors?: (errors: FileValidationError[]) => void;
  isProcessing: boolean;
}

/**
 * Drag & drop / browse panel for Kytario JSON and ZIP exports.
 * Accessible: the dropzone is keyboard-operable via its labelled file input,
 * drag state is announced through an aria-live region, and per-file
 * validation errors are surfaced to the caller's error live region.
 */
export function FileDropzonePanel({ onFilesAccepted, onValidationErrors, isProcessing }: FileDropzonePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Guard against dragenter/dragleave child flicker by counting active drags.
  const dragCounterRef = useRef(0);

  const acceptFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const errors = validateUploadFiles(files);
    if (errors.length > 0) {
      onValidationErrors?.(errors);
    }
    const validFiles = files.filter((f) => !errors.some((e) => e.fileName === f.name));
    if (validFiles.length > 0) {
      onFilesAccepted(validFiles);
    }
  }, [onFilesAccepted, onValidationErrors]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    acceptFiles(e.dataTransfer.files);
  }, [acceptFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    acceptFiles(e.target.files);
    // Reset so selecting the same file again re-triggers change event
    e.target.value = '';
  }, [acceptFiles]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative overflow-hidden border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-300 ${
        isDragging ? 'border-zinc-800 bg-zinc-100/50 scale-[1.02] shadow-sm' : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/30'
      }`}
    >
      {/* Screen-reader announcement of drag state */}
      <div aria-live="polite" className="sr-only">
        {isDragging ? 'Release files to upload them' : ''}
      </div>

      {/* Decorative background pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden flex items-center justify-center" aria-hidden="true">
        <svg className="w-full h-full" width="100%" height="100%">
          <pattern id="pattern-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" className="fill-zinc-900" />
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-dots)" />
        </svg>
      </div>

      {/* Floating decorative elements */}
      <div aria-hidden="true" className={`absolute top-6 left-8 text-zinc-400/20 transition-transform duration-500 ${isDragging ? 'scale-110 -translate-y-2 -rotate-12' : 'scale-100 rotate-0'}`}>
        <Music className="w-12 h-12" />
      </div>
      <div aria-hidden="true" className={`absolute bottom-8 right-8 text-zinc-400/20 transition-transform duration-500 ${isDragging ? 'scale-110 translate-y-2 rotate-12' : 'scale-100 rotate-0'}`}>
        <Archive className="w-16 h-16" />
      </div>
      <div aria-hidden="true" className={`absolute top-1/2 right-12 text-zinc-400/10 transition-transform duration-500 ${isDragging ? 'scale-125 -translate-y-4 translate-x-2 rotate-45' : 'scale-100 rotate-12'}`}>
        <FileJson className="w-10 h-10" />
      </div>
      <div aria-hidden="true" className={`absolute bottom-12 left-12 text-zinc-400/10 transition-transform duration-500 ${isDragging ? 'scale-125 translate-y-4 -translate-x-2 -rotate-45' : 'scale-100 -rotate-12'}`}>
        <Music className="w-8 h-8" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className={`w-16 h-16 bg-white rounded-full shadow-sm border border-zinc-100 flex items-center justify-center mb-4 transition-transform duration-300 ${isDragging ? 'scale-110 shadow-md' : 'scale-100'}`}>
          <Upload className={`w-7 h-7 transition-colors duration-300 ${isDragging ? 'text-zinc-900' : 'text-zinc-400'}`} />
        </div>
        <p className={`text-base sm:text-lg font-semibold transition-colors duration-300 mb-1 ${isDragging ? 'text-zinc-900' : 'text-zinc-700'}`}>
          Drag and drop your Kytario .json or export .zip here
        </p>
        <p id="dropzone-help" className="text-[12px] sm:text-sm text-zinc-500 mb-6 font-medium">
          Supports single JSON, multiple song files, or full Kytario export ZIP archives (max {MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB each)
        </p>

        <label className={`inline-flex items-center gap-2 text-white text-xs sm:text-sm font-bold px-5 sm:px-6 py-2.5 rounded-full transition-all shadow-sm active:scale-95 ${
          isProcessing
            ? 'bg-zinc-800 pointer-events-none'
            : 'bg-zinc-900 hover:bg-zinc-800 hover:shadow-md cursor-pointer'
        }`}>
          {isProcessing ? (
            <Upload className="w-4 h-4 animate-pulse text-white" aria-hidden="true" />
          ) : (
            <Upload className="w-4 h-4" aria-hidden="true" />
          )}
          <span>{isProcessing ? 'Reading & Processing...' : 'Browse File(s)'}</span>
          <input
            ref={inputRef}
            type="file"
            accept=".json,.zip,application/json,application/zip,application/x-zip-compressed,text/plain"
            multiple
            disabled={isProcessing}
            onChange={handleChange}
            aria-describedby="dropzone-help"
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
