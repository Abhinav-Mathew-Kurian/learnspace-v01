'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/shared/RichTextEditor'), { ssr: false });

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', category: '', bannerImage: '', previewVideoId: '', isPublished: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/courses/${id}`).then((r) => r.json()).then((d) => {
      if (d.success) {
        const c = d.data.course;
        setForm({
          title: c.title,
          description: c.description,
          category: c.category ?? '',
          bannerImage: c.bannerImage ?? '',
          previewVideoId: c.previewVideoId ?? '',
          isPublished: c.isPublished,
        });
      }
      setLoading(false);
    });
  }, [id]);

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.success) set('bannerImage', data.data.url);
    else setError(data.error);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!data.success) { setError(data.error); return; }
    router.push(`/teacher/courses/${id}`);
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <Link href={`/teacher/courses/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft size={15} /> Back
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Course</h1>

      <form onSubmit={submit} className="space-y-5">
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-full h-44 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer overflow-hidden transition-colors group"
        >
          {form.bannerImage ? (
            <img src={form.bannerImage} alt="banner" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-500">
              {uploading ? <Loader2 size={24} className="animate-spin" /> : <><Upload size={24} /><span className="text-xs mt-1.5">Upload banner image</span></>}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Title *</label>
          <input required value={form.title} onChange={(e) => set('title', e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description *</label>
          {!loading && (
            <RichTextEditor
              value={form.description}
              onChange={(html) => set('description', html)}
              placeholder="Describe your course — what students will learn, requirements, who it's for…"
              minHeight={300}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <input value={form.category} onChange={(e) => set('category', e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Preview Video ID</label>
            <input value={form.previewVideoId} onChange={(e) => set('previewVideoId', e.target.value)}
              placeholder="YouTube ID (optional)"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500" />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => set('isPublished', !form.isPublished)}
            className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.isPublished ? 'bg-indigo-600' : 'bg-slate-200'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isPublished ? 'translate-x-4' : ''}`} />
          </div>
          <span className="text-sm font-medium text-slate-700">Published (visible to students)</span>
        </label>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link href={`/teacher/courses/${id}`} className="flex-1 py-2.5 text-center border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </Link>
          <button type="submit" disabled={saving || uploading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
