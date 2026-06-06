'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Batch { _id: string; name: string }
interface GuestLecturer { _id: string; name: string; specialization?: string }

interface Props {
  onClose: () => void;
  onCreated: (event: Record<string, unknown>) => void;
}

const TYPE_OPTIONS = [
  { value: 'offline_class', label: 'Offline Class' },
  { value: 'webinar',       label: 'Webinar' },
  { value: 'live_session',  label: 'Live Session' },
  { value: 'video_release', label: 'Video Release' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all',      label: 'Everyone' },
  { value: 'teachers', label: 'Teachers only' },
  { value: 'students', label: 'Students only' },
  { value: 'batch',    label: 'Specific Batch' },
];

export default function CreateEventModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'offline_class',
    date: '',
    endDate: '',
    audience: 'all',
    batchId: '',
    location: '',
    meetLink: '',
    guestLecturerId: '',
  });
  const [batches, setBatches] = useState<Batch[]>([]);
  const [guests, setGuests] = useState<GuestLecturer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/batches').then((r) => r.json()),
      fetch('/api/admin/guest-lecturers').then((r) => r.json()),
    ]).then(([bd, gd]) => {
      if (bd.success) setBatches(bd.data);
      if (gd.success) setGuests(gd.data);
    });
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.date) { setError('Title and date are required.'); return; }
    setLoading(true);
    setError('');

    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      type: form.type,
      date: new Date(form.date).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      audience: form.audience,
      batchId: form.audience === 'batch' ? form.batchId || null : null,
      location: form.location || null,
      meetLink: form.meetLink || null,
      guestLecturerId: form.guestLecturerId || null,
    };

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onCreated(data.data);
    else setError(data.error ?? 'Failed to create event');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900">Create Event</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Introduction to React Webinar"
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              rows={3} placeholder="What is this event about?"
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Type *</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Audience *</label>
              <select value={form.audience} onChange={(e) => set('audience', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {AUDIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Date & Time *</label>
              <input type="datetime-local" value={form.date} onChange={(e) => set('date', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">End Date & Time</label>
              <input type="datetime-local" value={form.endDate} onChange={(e) => set('endDate', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {form.audience === 'batch' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Batch</label>
              <select value={form.batchId} onChange={(e) => set('batchId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Select batch</option>
                {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}

          {(form.type === 'offline_class') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
              <input value={form.location} onChange={(e) => set('location', e.target.value)}
                placeholder="e.g. Room 204, Main Building"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}

          {(form.type === 'webinar' || form.type === 'live_session') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Meet Link</label>
              <input value={form.meetLink} onChange={(e) => set('meetLink', e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}

          {form.type === 'webinar' && guests.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Guest Lecturer</label>
              <select value={form.guestLecturerId} onChange={(e) => set('guestLecturerId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">None</option>
                {guests.map((g) => (
                  <option key={g._id} value={g._id}>{g.name}{g.specialization ? ` — ${g.specialization}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
}
