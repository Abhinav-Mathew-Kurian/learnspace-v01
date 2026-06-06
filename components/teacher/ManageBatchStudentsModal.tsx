'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Search, UserPlus, UserMinus, Check } from 'lucide-react';

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface Props {
  batchId: string;
  batchName: string;
  currentStudentIds: string[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ManageBatchStudentsModal({ batchId, batchName, currentStudentIds, onClose, onSaved }: Props) {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentStudentIds));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/users?role=student')
      .then((r) => r.json())
      .then((d) => { if (d.success) setAllStudents(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = allStudents.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const res = await fetch(`/api/batches/${batchId}/students`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: [...selected], action: 'set' }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      onSaved();
    } else {
      setError(data.error ?? 'Failed to update students');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Manage Students</h2>
            <p className="text-sm text-slate-500 mt-0.5">{batchName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">{selected.size} student{selected.size !== 1 ? 's' : ''} selected</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loading && (
            <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No students found.</p>
          )}
          {!loading && filtered.map((s) => {
            const isSelected = selected.has(s._id);
            return (
              <button
                key={s._id}
                onClick={() => toggle(s._id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-700 text-xs font-bold">{s.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400 truncate">{s.email}</p>
                </div>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
                }`}>
                  {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100">
          {error && <p className="text-sm text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 size={15} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
