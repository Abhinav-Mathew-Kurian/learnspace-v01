'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Megaphone, ToggleLeft, ToggleRight, X, Upload, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

interface Promotion {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string;
  badge?: string;
  bgColor?: string;
  validUntil?: string;
  isActive: boolean;
}

// Predefined color options — keys stored in DB, rendered with inline CSS (avoids Tailwind purge)
export const PROMO_COLORS: { key: string; label: string; bg: string; preview: string }[] = [
  { key: 'indigo',   label: 'Indigo',   bg: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)', preview: '#4f46e5' },
  { key: 'sky',      label: 'Sky Blue', bg: 'linear-gradient(135deg,#0ea5e9 0%,#3b82f6 100%)', preview: '#0ea5e9' },
  { key: 'emerald',  label: 'Emerald',  bg: 'linear-gradient(135deg,#059669 0%,#0d9488 100%)', preview: '#059669' },
  { key: 'fire',     label: 'Fire',     bg: 'linear-gradient(135deg,#f97316 0%,#ef4444 100%)', preview: '#f97316' },
  { key: 'pink',     label: 'Pink',     bg: 'linear-gradient(135deg,#ec4899 0%,#f43f5e 100%)', preview: '#ec4899' },
  { key: 'gold',     label: 'Gold',     bg: 'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)', preview: '#f59e0b' },
  { key: 'purple',   label: 'Purple',   bg: 'linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)', preview: '#7c3aed' },
  { key: 'dark',     label: 'Dark',     bg: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)', preview: '#1e293b' },
];

const emptyForm = {
  title: '', description: '', imageUrl: '', linkUrl: '',
  badge: '', bgColor: 'indigo', validUntil: '', isActive: true,
};

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
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
    const res = await fetch('/api/admin/promotions');
    const data = await res.json();
    if (data.success) setPromotions(data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setError(''); setShowModal(true); };
  const openEdit = (p: Promotion) => {
    setForm({
      title: p.title, description: p.description, imageUrl: p.imageUrl,
      linkUrl: p.linkUrl || '', badge: p.badge || '',
      bgColor: p.bgColor || 'indigo',
      validUntil: p.validUntil ? new Date(p.validUntil).toISOString().split('T')[0] : '',
      isActive: p.isActive,
    });
    setEditId(p._id); setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    const payload = {
      title: form.title, description: form.description,
      imageUrl: form.imageUrl || undefined, bgColor: form.bgColor,
      linkUrl: form.linkUrl || undefined, badge: form.badge || undefined,
      validUntil: form.validUntil || undefined, isActive: form.isActive,
    };
    const res = await fetch(
      editId ? `/api/admin/promotions/${editId}` : '/api/admin/promotions',
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
    await fetch(`/api/admin/promotions/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    toast.success('Promotion deleted.');
    load();
  };

  const toggleActive = async (p: Promotion) => {
    await fetch(`/api/admin/promotions/${p._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    load();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) setForm(f => ({ ...f, imageUrl: data.data.url }));
    else setError('Image upload failed. Try again.');
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const colorOf = (key?: string) => PROMO_COLORS.find(c => c.key === key) ?? PROMO_COLORS[0];

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <Megaphone size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Promotions</h1>
            <p className="text-xs text-slate-400">Manage special offer banners on homepage</p>
          </div>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={15} /> New Promotion
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200">
          <Megaphone size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No promotions yet</p>
          <p className="text-slate-400 text-sm mt-1">Create banners to display on the homepage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {promotions.map((p) => {
            const col = colorOf(p.bgColor);
            return (
              <div key={p._id} className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                {/* Preview card */}
                <div className="relative h-28 flex items-end p-4" style={{ background: col.bg }}>
                  {p.imageUrl && (
                    <Image src={p.imageUrl} alt={p.title} fill className="object-cover opacity-20" sizes="50vw" />
                  )}
                  <div className="relative z-10">
                    {p.badge && <span className="block text-[10px] font-black uppercase tracking-widest text-white/80 mb-0.5">{p.badge}</span>}
                    <h3 className="text-white font-bold text-sm leading-tight">{p.title}</h3>
                  </div>
                  {!p.isActive && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-bold bg-black/40 px-3 py-1 rounded-full">INACTIVE</span>
                    </div>
                  )}
                </div>
                {/* Controls */}
                <div className="bg-white px-4 py-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 truncate">{p.description}</p>
                    {p.validUntil && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Valid until {new Date(p.validUntil).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleActive(p)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                      {p.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} className="text-slate-400" />}
                    </button>
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(p._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-900">{editId ? 'Edit Promotion' : 'New Promotion'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              {/* ── 1. Banner image upload — FIRST so it's immediately visible ── */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Banner Image (optional)</label>
                {form.imageUrl ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-100 mb-2">
                    <Image src={form.imageUrl} alt="Promo image" fill className="object-cover" />
                    <button
                      onClick={() => set('imageUrl', '')}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
                  >
                    {uploading ? (
                      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors">
                          <ImageIcon size={20} className="text-indigo-500" />
                        </div>
                        <p className="text-xs text-slate-500 group-hover:text-indigo-600 transition-colors font-semibold">Click to upload banner image</p>
                        <p className="text-[10px] text-slate-400">JPEG, PNG or WebP · max 5MB</p>
                      </>
                    )}
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {!form.imageUrl && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  >
                    <Upload size={12} /> {uploading ? 'Uploading…' : 'Upload from device'}
                  </button>
                )}
              </div>

              {/* ── 2. Live preview ── */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Live Preview</label>
                <div className="relative h-24 rounded-xl overflow-hidden flex items-end p-3" style={{ background: colorOf(form.bgColor).bg }}>
                  {form.imageUrl && (
                    <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${form.imageUrl})` }} />
                  )}
                  <div className="relative z-10">
                    {form.badge && <span className="block text-[10px] font-black uppercase tracking-widest text-white/70 mb-0.5">{form.badge}</span>}
                    <p className="text-white font-bold text-sm">{form.title || 'Your promotion title'}</p>
                  </div>
                </div>
              </div>

              {/* ── 3. Color picker ── */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Banner Color *</label>
                <div className="grid grid-cols-4 gap-2">
                  {PROMO_COLORS.map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => set('bgColor', c.key)}
                      className={`relative h-10 rounded-xl overflow-hidden border-2 transition-all ${form.bgColor === c.key ? 'border-slate-900 scale-95' : 'border-transparent hover:border-slate-300'}`}
                      style={{ background: c.bg }}
                      title={c.label}
                    >
                      {form.bgColor === c.key && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-white/30 border-2 border-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Selected: <span className="font-medium text-slate-600">{colorOf(form.bgColor).label}</span></p>
              </div>

              {/* ── 4. Text fields ── */}
              {[
                { l:'Title *', k:'title', type:'text', ph:'e.g. Free Trial This Week' },
                { l:'Badge Text', k:'badge', type:'text', ph:'e.g. LIMITED OFFER' },
                { l:'Link URL', k:'linkUrl', type:'url', ph:'https://...' },
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
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Valid Until (optional)</label>
                <input type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Active — visible on homepage</span>
              </label>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete promotion?"
        message="This promotion banner will be removed from the homepage permanently."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
