'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'textarea';
  minLength?: number;
  required?: boolean;
  submitLabel?: string;
  loading?: boolean;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export default function PromptModal({
  open,
  title,
  label,
  placeholder = '',
  type = 'text',
  minLength,
  required = true,
  submitLabel = 'Submit',
  loading = false,
  onSubmit,
  onCancel,
}: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setError('');
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    if (required && !value.trim()) { setError('This field is required.'); return; }
    if (minLength && value.length < minLength) { setError(`Minimum ${minLength} characters required.`); return; }
    setError('');
    onSubmit(value);
  };

  const base =
    'w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm';

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
          {type === 'textarea' ? (
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className={`${base} resize-none`}
            />
          ) : (
            <input
              ref={inputRef}
              type={type}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className={base}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          )}
          {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? 'Processing…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
