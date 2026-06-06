'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Batch {
  _id: string;
  name: string;
  course: { _id: string; title: string } | string;
}

interface Props {
  batches: Batch[];
  onClose: () => void;
  onCreated: (session: Record<string, unknown>) => void;
}

export default function ScheduleLiveModal({ batches, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    batchId: '',
    title: '',
    scheduledAt: '',
    duration: 60,
    meetLink: '',
    meetPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getCourseId = () => {
    const b = batches.find((b) => b._id === form.batchId);
    if (!b) return '';
    return typeof b.course === 'string' ? b.course : b.course._id;
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.batchId || !form.title || !form.scheduledAt || !form.meetLink) {
      setError('Batch, title, date/time, and Meet link are required.');
      return;
    }
    setLoading(true);
    setError('');

    const courseId = getCourseId();
    if (!courseId) { setError('Could not resolve course from selected batch.'); setLoading(false); return; }

    const res = await fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: form.batchId,
        courseId,
        title: form.title,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        duration: form.duration,
        meetLink: form.meetLink,
        meetPassword: form.meetPassword || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      onCreated(data.data);
    } else {
      setError(data.error ?? 'Failed to schedule session');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-900">Schedule Live Class</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handle} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Batch</label>
            <select
              value={form.batchId}
              onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select batch</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} — {typeof b.course === 'string' ? '' : b.course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Session Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Introduction to React Hooks"
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date & Time</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration (min)</label>
              <input
                type="number"
                min={15}
                max={480}
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: parseInt(e.target.value) || 60 }))}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Google Meet Link</label>
            <input
              value={form.meetLink}
              onChange={(e) => setForm((f) => ({ ...f, meetLink: e.target.value }))}
              placeholder="https://meet.google.com/abc-defg-hij"
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Meet Password <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              value={form.meetPassword}
              onChange={(e) => setForm((f) => ({ ...f, meetPassword: e.target.value }))}
              placeholder="Leave blank if no password"
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Schedule Class
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
