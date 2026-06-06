'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Radio, ToggleLeft, ToggleRight, X, Upload, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

interface Webinar {
  _id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  meetingUrl: string;
  thumbnail?: string;
  instructor: string;
  topic: string;
  isActive: boolean;
}

const emptyForm = {
  title: '', description: '', date: '', time: '10:00',
  duration: 60, meetingUrl: '', instructor: '', topic: '',
  thumbnail: '', isActive: true,
};

export default function AdminWebinarsPage() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/webinars');
    const data = await res.json();
    if (data.success) setWebinars(data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setError(''); setShowModal(true); };
  const openEdit = (w: Webinar) => {
    const d = new Date(w.date);
    setForm({
      title: w.title, description: w.description,
      date: d.toISOString().split('T')[0],
      time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
      duration: w.duration, meetingUrl: w.meetingUrl,
      instructor: w.instructor, topic: w.topic,
      thumbnail: w.thumbnail || '', isActive: w.isActive,
    });
    setEditId(w._id); setError(''); setShowModal(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) setForm(f => ({ ...f, thumbnail: data.data.url }));
    else setError('Image upload failed. Try again.');
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    const dateTime = new Date(`${form.date}T${form.time}`).toISOString();
    const payload = {
      title: form.title, description: form.description, date: dateTime,
      duration: Number(form.duration), meetingUrl: form.meetingUrl,
      instructor: form.instructor, topic: form.topic,
      thumbnail: form.thumbnail || undefined, isActive: form.isActive,
    };
    const res = await fetch(
      editId ? `/api/admin/webinars/${editId}` : '/api/admin/webinars',
      { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const data = await res.json();
    if (data.success) { setShowModal(false); load(); }
    else setError(data.error || 'Save failed');
    setSaving(false);
  };

  const handleDelete = (id: string) => setDeleteId(id);
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/admin/webinars/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    toast.success('Webinar deleted.');
    load();
  };

  const toggleActive = async (w: Webinar) => {
    await fetch(`/api/admin/webinars/${w._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !w.isActive }),
    });
    load();
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Radio size={18} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Webinars</h1>
            <p className="text-xs text-slate-400">Manage public free webinars</p>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={15} /> New Webinar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : webinars.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200">
          <Radio size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No webinars yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first public webinar to show on the homepage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webinars.map((w) => (
            <div key={w._id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:border-slate-300 transition-colors">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                {w.thumbnail
                  ? <Image src={w.thumbnail} alt={w.title} width={64} height={64} className="w-full h-full object-cover" />
                  : <Radio size={22} className="text-white/60" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-slate-800 truncate">{w.title}</h3>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{w.topic}</span>
                  {!w.isActive && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactive</span>}
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(w.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} · {w.duration} mins · {w.instructor}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => toggleActive(w)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Toggle active">
                  {w.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} className="text-slate-400" />}
                </button>
                <button onClick={() => openEdit(w)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => handleDelete(w._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-900">{editId ? 'Edit Webinar' : 'New Webinar'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              {/* Thumbnail upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Thumbnail Image</label>
                {form.thumbnail ? (
                  <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-100 mb-2">
                    <Image src={form.thumbnail} alt="Thumbnail" fill className="object-cover" />
                    <button
                      onClick={() => set('thumbnail', '')}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-36 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all group"
                  >
                    {uploading ? (
                      <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors">
                          <ImageIcon size={22} className="text-indigo-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-700 group-hover:text-indigo-700 transition-colors font-semibold">Click to upload thumbnail</p>
                          <p className="text-xs text-slate-400 mt-0.5">JPEG, PNG or WebP · max 5MB</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                {!form.thumbnail && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  >
                    <Upload size={12} /> {uploading ? 'Uploading…' : 'Upload from device'}
                  </button>
                )}
              </div>

              {/* Fields */}
              {[
                { l:'Title *', k:'title', type:'text', ph:'Webinar title' },
                { l:'Instructor *', k:'instructor', type:'text', ph:'Instructor name' },
                { l:'Topic *', k:'topic', type:'text', ph:'e.g. Web Development' },
                { l:'Meeting URL *', k:'meetingUrl', type:'url', ph:'https://meet.google.com/...' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{f.l}</label>
                  <input type={f.type} value={form[f.k as keyof typeof form] as string}
                    onChange={e => set(f.k, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    placeholder={f.ph} />
                </div>
              ))}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description *</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time *</label>
                  <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (minutes) *</label>
                <input type="number" value={form.duration} min={1} onChange={e => set('duration', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Active — visible on homepage</span>
              </label>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || uploading} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? 'Saving...' : editId ? 'Update Webinar' : 'Create Webinar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete webinar?"
        message="This webinar will be removed from the homepage permanently."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
