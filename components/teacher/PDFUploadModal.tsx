'use client';

import { useState, useRef } from 'react';
import { X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  courseId: string;
  onClose: () => void;
  onUploaded: () => void;
}

interface ProgressState {
  percent: number;
  message: string;
  stage?: 'done' | 'error';
}

export default function PDFUploadModal({ courseId, onClose, onUploaded }: Props) {
  const [title, setTitle]       = useState('');
  const [file, setFile]         = useState<File | null>(null);
  const [error, setError]       = useState('');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const xhrRef  = useRef<XMLHttpRequest | null>(null);

  const isUploading = !!progress && progress.stage !== 'done' && progress.stage !== 'error';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select a PDF file'); return; }
    if (!title.trim()) { setError('Please enter a title'); return; }
    setError('');
    setProgress({ percent: 0, message: 'Preparing…' });

    const fd = new FormData();
    fd.append('file', file);
    fd.append('courseId', courseId);
    fd.append('title', title.trim());

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', '/api/upload/pdf');

    // ── 0-40%: real bytes-sent progress ───────────────────────────────
    xhr.upload.addEventListener('progress', (ev) => {
      if (!ev.lengthComputable) return;
      const pct = Math.round((ev.loaded / ev.total) * 40);
      setProgress({ percent: pct, message: 'Uploading file…' });
    });

    // ── 40-100%: read SSE events from the response body progressively ──
    let cursor = 0;
    xhr.addEventListener('progress', () => {
      const chunk = xhr.responseText.slice(cursor);
      cursor = xhr.responseText.length;
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const ev = JSON.parse(line.slice(6)) as {
            percent?: number;
            message?: string;
            stage?: string;
            data?: unknown;
          };
          if (ev.stage === 'error') {
            setProgress({ percent: 0, message: '', stage: 'error' });
            setError(ev.message ?? 'Upload failed');
            return;
          }
          setProgress({
            percent: ev.percent ?? 0,
            message: ev.message ?? '',
            stage: ev.stage as 'done' | undefined,
          });
          if (ev.stage === 'done') {
            setTimeout(onUploaded, 600); // brief pause so user sees 100%
          }
        } catch { /* malformed SSE line — skip */ }
      }
    });

    xhr.addEventListener('error', () => {
      setProgress(null);
      setError('Network error — please try again.');
    });

    xhr.send(fd);
  }

  function cancel() {
    xhrRef.current?.abort();
    onClose();
  }

  const done = progress?.stage === 'done';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Upload Course Resource</h2>
          <button onClick={cancel} disabled={isUploading}>
            <X size={18} className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
            <input
              required
              disabled={isUploading || done}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 1 Notes"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* File picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">PDF File *</label>
            <div
              onClick={() => !isUploading && !done && fileRef.current?.click()}
              className={`w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
                isUploading || done
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'border-slate-300 hover:border-indigo-400 text-slate-400 hover:text-indigo-500 cursor-pointer'
              }`}
            >
              {file
                ? <><FileText size={20} /><span className="text-xs mt-1 font-medium text-slate-600">{file.name}</span><span className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span></>
                : <><FileText size={20} /><span className="text-xs mt-1">Click to select PDF (max 20 MB)</span></>
              }
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); }}
            />
          </div>

          <p className="text-xs text-slate-400">
            Text will be extracted automatically and used by the AI course assistant.
          </p>

          {/* ── Progress bar ──────────────────────────────────────────── */}
          {progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${done ? 'text-green-600' : 'text-slate-600'}`}>
                  {done
                    ? <span className="flex items-center gap-1"><CheckCircle2 size={13} /> {progress.message}</span>
                    : progress.message}
                </span>
                <span className={`text-xs font-bold tabular-nums ${done ? 'text-green-600' : 'text-indigo-600'}`}>
                  {progress.percent}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              {/* Stage labels */}
              {!done && (
                <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                  <span className={progress.percent >= 1  ? 'text-indigo-500' : ''}>Uploading</span>
                  <span className={progress.percent >= 45 ? 'text-indigo-500' : ''}>Extracting</span>
                  <span className={progress.percent >= 80 ? 'text-indigo-500' : ''}>CDN</span>
                  <span className={progress.percent >= 88 ? 'text-indigo-500' : ''}>Saving</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={cancel}
              disabled={isUploading}
              className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              {done ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isUploading || done}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {isUploading ? 'Uploading…' : done ? 'Done!' : 'Upload'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
