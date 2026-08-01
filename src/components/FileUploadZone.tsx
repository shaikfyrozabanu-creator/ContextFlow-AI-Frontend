import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, CheckCircle2, Loader2,
  XCircle, AlertTriangle, X, Files, Sparkles, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { mockStorage, type Document } from '../services/mockStorage';
import { API_BASE_URL } from '../services/apiConfig';
import { toast } from './Toast';

interface FileUploadZoneProps {
  onUploadSuccess: (docs: Document[]) => void;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const SUGGESTED_QUESTIONS = [
  'What is the summary of the uploaded document?',
  'What are the key points mentioned in the PDF?',
  'Explain the main concepts described in the file.',
  'What features or pricing details are outlined?'
];

const STEP_LABELS = [
  'Uploading file...',
  'Extracting Text...',
  'Chunking into ~500 char blocks...',
  'Creating Embeddings...',
  'Storing in Pinecone...',
  'Completed ✓'
];

type FileStatus = 'pending' | 'processing' | 'success' | 'failed';

interface FileEntry {
  file: File;
  status: FileStatus;
  error?: string;
  doc?: Document;
  progress: number;
  activeStep: number;
}

// ─── File Validation ──────────────────────────────────────────────────────────
function validateFile(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  const isPdf = ext === '.pdf' || file.type === 'application/pdf';

  if (!isPdf) {
    return `"${file.name}" is not a PDF. Only .pdf files are supported.`;
  }
  if (file.size === 0) {
    return `"${file.name}" appears to be empty (0 bytes). Please check the file.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}" is ${sizeMB} MB — exceeds the 10 MB limit.`;
  }
  return null;
}

// ─── Upload single file to backend ───────────────────────────────────────────
async function uploadFile(
  file: File,
  onProgress: (step: number, pct: number) => void
): Promise<Document> {
  onProgress(0, 15);

  // Step animation cycling through 6 steps
  let step = 0;
  const stepTimer = setInterval(() => {
    step = step < 4 ? step + 1 : step;
    onProgress(step, Math.min(90, (step + 1) * 18));
    if (step >= 4) clearInterval(stepTimer);
  }, 350);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    clearInterval(stepTimer);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const detail: string = errData.detail ?? `Server responded with ${response.status}`;
      throw new Error(detail);
    }

    const data = await response.json();

    const chunks = (data.chunks || []).map((c: any) => ({
      id: `${data.filename}-c${c.chunk_id}`,
      text: c.text,
      vector: c.embedding
        ? c.embedding.slice(0, 3)
        : [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1],
      charCount: c.text.length,
    }));

    const doc: Document = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: data.filename,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'indexed' as const,
      chunkCount: chunks.length,
      chunks,
    };

    onProgress(5, 100);
    return doc;
  } catch (err) {
    clearInterval(stepTimer);
    throw err;
  }
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// ─── Status Icon helper ───────────────────────────────────────────────────────
const StatusIcon: React.FC<{ status: FileStatus }> = ({ status }) => {
  if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  if (status === 'processing') return <Loader2 className="w-4 h-4 text-brand-400 animate-spin flex-shrink-0" />;
  return <div className="w-4 h-4 rounded-full border border-gray-600 bg-gray-900 flex-shrink-0" />;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onUploadSuccess }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileQueue, setFileQueue] = useState<FileEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Process queue sequentially ──────────────────────────────────────────
  const processQueue = useCallback(async (entries: FileEntry[]) => {
    setIsRunning(true);
    setIsDone(false);
    const successDocs: Document[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.status !== 'pending') continue;

      setFileQueue(prev =>
        prev.map((e, idx) => idx === i ? { ...e, status: 'processing' } : e)
      );

      try {
        const doc = await uploadFile(entry.file, (step, pct) => {
          setFileQueue(prev =>
            prev.map((e, idx) =>
              idx === i ? { ...e, activeStep: step, progress: pct } : e
            )
          );
        });

        // Persist to local storage
        const docs = mockStorage.getDocuments();
        mockStorage.setDocuments([doc, ...docs]);
        successDocs.push(doc);

        setFileQueue(prev =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: 'success', doc, progress: 100, activeStep: 3 } : e
          )
        );
      } catch (err: any) {
        const errMsg: string =
          err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')
            ? `Cannot reach backend. Ensure the Render server is running at ${API_BASE_URL}.`
            : err?.message ?? 'Unknown upload error.';

        setFileQueue(prev =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: 'failed', error: errMsg } : e
          )
        );
      }
    }

    setIsRunning(false);
    setIsDone(true);

    const finalQueue = await new Promise<FileEntry[]>(resolve => {
      setFileQueue(prev => { resolve(prev); return prev; });
    });

    const failedCount = finalQueue.filter(e => e.status === 'failed').length;
    const successCount = finalQueue.filter(e => e.status === 'success').length;
    const total = finalQueue.length;

    if (successCount > 0) {
      confetti({ particleCount: successCount > 1 ? 160 : 100, spread: 70, origin: { y: 0.6 }, colors: ['#7c4dff', '#6366f1', '#a855f7', '#10b981'] });
      toast.success(
        successCount === total
          ? `${successCount} PDF${successCount > 1 ? 's' : ''} indexed successfully!`
          : `${successCount} of ${total} PDFs indexed successfully.`,
        failedCount > 0 ? `${failedCount} file${failedCount > 1 ? 's' : ''} failed — see details below.` : undefined
      );
      onUploadSuccess(successDocs);
    } else {
      toast.error('All uploads failed', `${failedCount} file${failedCount > 1 ? 's' : ''} could not be processed.`);
    }
  }, [onUploadSuccess]);

  // ─── File ingestion ───────────────────────────────────────────────────────
  const ingestFiles = useCallback((rawFiles: File[]) => {
    setInlineError(null);
    const validEntries: FileEntry[] = [];
    const errors: string[] = [];

    for (const file of rawFiles) {
      const err = validateFile(file);
      if (err) {
        errors.push(err);
      } else {
        validEntries.push({ file, status: 'pending', progress: 0, activeStep: 0 });
      }
    }

    if (errors.length > 0) {
      if (errors.length === 1) {
        setInlineError(errors[0]);
        toast.error('Invalid file', errors[0]);
      } else {
        setInlineError(`${errors.length} files rejected. Only PDF files under 10 MB are accepted.`);
        errors.forEach(e => toast.error('Invalid file', e));
      }
    }

    if (validEntries.length === 0) return;

    setFileQueue(validEntries);
    setIsDone(false);
    processQueue(validEntries);
  }, [processQueue]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (isRunning) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) ingestFiles(files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) ingestFiles(files);
    e.target.value = '';
  };

  const handleReset = () => {
    setFileQueue([]);
    setIsDone(false);
    setInlineError(null);
  };

  const isIdle = fileQueue.length === 0;

  const navigate = useNavigate();

  const handleSuggestedQuestion = (q: string) => {
    navigate('/chat', { state: { question: q } });
  };

  return (
    <div className="w-full space-y-4">

      {/* ── Drop Zone (shown when idle) ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isIdle && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative w-full py-12 px-6 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all duration-300 backdrop-blur-2xl
              ${isDragActive
                ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_40px_0_rgba(6,182,212,0.25)] scale-[1.01]'
                : 'border-white/15 hover:border-cyan-500/40 hover:bg-gray-950/40 glass-21st'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
              <div className="relative w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <UploadCloud className="w-8 h-8 text-cyan-400" />
                {/* Multi-file badge */}
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-cyan-500 border border-cyan-300 flex items-center justify-center shadow-sm">
                  <Files className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white tracking-wide font-display">
                  Drag & Drop PDF Knowledge Base Files
                </h3>
                <p className="text-xs text-gray-400">
                  or <span className="text-cyan-400 font-semibold underline">browse files</span> — multi-PDF parsing supported
                </p>
              </div>
              <div className="pt-2 border-t border-white/10 w-3/4 max-w-xs mx-auto">
                <p className="text-[10px] text-cyan-300/80 font-mono tracking-widest uppercase font-bold">
                  PDF format only · Max 10 MB per file
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inline validation error ────────────────────────────────────────── */}
      <AnimatePresence>
        {inlineError && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-950/60 border border-red-500/40 text-xs text-red-300 shadow-lg"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="flex-grow leading-relaxed font-sans">{inlineError}</span>
            <button
              onClick={() => setInlineError(null)}
              className="flex-shrink-0 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── File Queue & Upload Progress ───────────────────────────────────── */}
      {fileQueue.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full rounded-3xl glass-21st border border-white/10 overflow-hidden shadow-2xl"
        >
          {/* Queue header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold text-white font-mono">
              <Files className="w-4 h-4 text-cyan-400" />
              <span>{fileQueue.length} File{fileQueue.length > 1 ? 's' : ''} Selected</span>
            </div>
            {isDone && (
              <button
                onClick={handleReset}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload More
              </button>
            )}
          </div>

          {/* File rows */}
          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
            {fileQueue.map((entry, idx) => (
              <div key={idx} className="px-5 py-3.5 space-y-2">
                {/* File name row */}
                <div className="flex items-center gap-2.5">
                  <StatusIcon status={entry.status} />
                  <div className="flex-grow min-w-0 text-left">
                    <p className="text-xs font-bold text-white truncate">{entry.file.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{formatSize(entry.file.size)}</p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    entry.status === 'success'    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    entry.status === 'failed'     ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                    entry.status === 'processing' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                                                    'bg-gray-800/40 text-gray-400 border-white/10'
                  }`}>
                    {entry.status === 'processing' ? `Step ${entry.activeStep + 1}/6` :
                     entry.status === 'success'    ? 'Indexed ✓' :
                     entry.status === 'failed'     ? 'Failed' : 'Pending'}
                  </span>
                </div>

                {/* Progress bar for processing files */}
                {entry.status === 'processing' && (
                  <div className="space-y-1 ml-6 text-left">
                    <p className="text-[10px] text-cyan-300 font-mono font-semibold">{STEP_LABELS[entry.activeStep]}</p>
                    <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-white/10">
                      <motion.div
                        className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 h-1.5 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${entry.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* Error message for failed files */}
                {entry.status === 'failed' && entry.error && (
                  <div className="ml-6 flex items-start gap-1.5 p-2.5 rounded-xl bg-red-950/50 border border-red-500/30 text-left">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-300 leading-relaxed font-sans">{entry.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary footer when done */}
          {isDone && (() => {
            const successfulFiles = fileQueue.filter(e => e.status === 'success');
            const successCount = successfulFiles.length;
            const failCount    = fileQueue.filter(e => e.status === 'failed').length;
            return (
              <div className={`px-5 py-3.5 border-t border-white/10 flex flex-col space-y-1.5 text-xs font-mono text-left ${
                failCount === 0 ? 'bg-emerald-950/40' : failCount === fileQueue.length ? 'bg-red-950/40' : 'bg-amber-950/40'
              }`}>
                {successCount > 0 && (
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      {successfulFiles.length === 1 
                        ? `File "${successfulFiles[0].file.name}" uploaded and indexed into Pinecone!` 
                        : `${successfulFiles.length} files uploaded and indexed successfully!`}
                    </span>
                  </div>
                )}
                {failCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-300 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{failCount} file{failCount > 1 ? 's' : ''} failed — see details above</span>
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* ── 4 Suggested Questions Cards below Upload Section ────────────────── */}
      {isDone && fileQueue.some(e => e.status === 'success') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl glass-21st border border-white/10 space-y-3 text-left shadow-2xl"
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Suggested RAG Queries for your PDF
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestedQuestion(q)}
                className="flex items-center space-x-2.5 p-3.5 rounded-2xl bg-gray-950/60 hover:bg-gray-900 border border-white/10 hover:border-cyan-500/40 text-xs text-gray-200 hover:text-white transition-all text-left group cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                <span className="truncate">{q}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
};
