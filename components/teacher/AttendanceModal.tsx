'use client';

import { useState } from 'react';
import { X, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Student {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface ExistingRecord {
  student: { _id: string };
  status: 'present' | 'absent' | 'late';
}

type AttendanceStatus = 'present' | 'absent' | 'late';

interface Props {
  sessionId: string;
  sessionTitle: string;
  students: Student[];
  existing: ExistingRecord[];
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700 border-green-300',
  absent: 'bg-red-100 text-red-700 border-red-300',
  late: 'bg-amber-100 text-amber-700 border-amber-300',
};

const STATUS_ICONS: Record<AttendanceStatus, React.ReactNode> = {
  present: <CheckCircle2 size={14} />,
  absent: <XCircle size={14} />,
  late: <Clock size={14} />,
};

export default function AttendanceModal({ sessionId, sessionTitle, students, existing, onClose, onSaved }: Props) {
  const init = (): Record<string, AttendanceStatus> => {
    const map: Record<string, AttendanceStatus> = {};
    existing.forEach((r) => { if (r.student?._id) map[r.student._id] = r.status; });
    students.filter((s) => s?._id && s?.name).forEach((s) => { if (!map[s._id]) map[s._id] = 'present'; });
    return map;
  };

  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(init);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setAll = (status: AttendanceStatus) => {
    setStatuses(Object.fromEntries(students.map((s) => [s._id, status])));
  };

  const save = async () => {
    setLoading(true);
    setError('');
    const records = students.map((s) => ({ studentId: s._id, status: statuses[s._id] ?? 'absent' }));
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, records }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      onSaved();
    } else {
      setError(data.error ?? 'Failed to save attendance');
    }
  };

  const validStudents = students.filter((s) => s?._id && s?.name);
  const present = Object.values(statuses).filter((s) => s === 'present').length;
  const absent = Object.values(statuses).filter((s) => s === 'absent').length;
  const late = Object.values(statuses).filter((s) => s === 'late').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Mark Attendance</h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate max-w-xs">{sessionTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Summary bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium"><CheckCircle2 size={14} />{present} Present</span>
          <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium"><XCircle size={14} />{absent} Absent</span>
          <span className="flex items-center gap-1.5 text-sm text-amber-600 font-medium"><Clock size={14} />{late} Late</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setAll('present')} className="text-xs px-2.5 py-1 rounded-md bg-green-100 text-green-700 font-medium hover:bg-green-200 transition-colors">All Present</button>
            <button onClick={() => setAll('absent')} className="text-xs px-2.5 py-1 rounded-md bg-red-100 text-red-700 font-medium hover:bg-red-200 transition-colors">All Absent</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {validStudents.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No students in this batch.</p>
          )}
          {validStudents.map((s) => {
            const status = statuses[s._id] ?? 'absent';
            return (
              <div key={s._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-700 text-xs font-bold">{s.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400 truncate">{s.email}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {(['present', 'late', 'absent'] as AttendanceStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatuses((prev) => ({ ...prev, [s._id]: st }))}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        status === st ? STATUS_STYLES[st] : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {STATUS_ICONS[st]}
                      <span className="capitalize">{st}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100">
          {error && <p className="text-sm text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={save} disabled={loading || validStudents.length === 0} className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Save Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
