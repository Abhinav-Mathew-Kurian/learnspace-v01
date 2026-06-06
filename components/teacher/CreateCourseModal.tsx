'use client';

import { useState, useRef } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/shared/RichTextEditor'), { ssr: false });

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCourseModal({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.success) setBannerImage(data.data.url);
    else setError(data.error);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category, bannerImage }),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setError(data.error); return; }
    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Modal: flex column, capped at 90vh so it never overflows viewport */}
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">

        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-semibold text-slate-900">New Course</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Banner */}
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-full h-36 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer overflow-hidden transition-colors group"
          >
            {bannerImage ? (
              <img src={bannerImage} alt="banner" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-500">
                {uploading
                  ? <Loader2 size={24} className="animate-spin" />
                  : <><Upload size={24} /><span className="text-xs mt-1.5">Upload banner image</span></>
                }
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full Stack Web Development"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description *</label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Describe your course: what students will learn, requirements, who it's for…"
              minHeight={160}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Programming, Design, Business"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</p>
          )}
        </div>

        {/* Sticky footer — always visible */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || uploading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {saving ? 'Creating…' : 'Create Course'}
          </button>
        </div>
      </div>
    </div>
  );
}
