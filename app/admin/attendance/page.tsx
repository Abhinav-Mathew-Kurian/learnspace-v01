'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, Filter, CheckCircle2, XCircle, Clock, BarChart3, Users, CalendarDays } from 'lucide-react';
import { istDate, istDateShort } from '@/lib/ist';
import Pagination from '@/components/shared/Pagination';

interface AttendanceRecord {
  _id: string;
  status: 'present' | 'absent' | 'late';
  markedAt: string;
  student: { _id: string; name: string; email: string };
  session: { _id: string; title: string; scheduledAt: string } | null;
  batch: { _id: string; name: string } | null;
  markedBy: { name: string } | null;
}

interface Batch { _id: string; name: string }

const STATUS_STYLE: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent:  'bg-red-100 text-red-700',
  late:    'bg-amber-100 text-amber-700',
};

const STATUS_ICON = {
  present: <CheckCircle2 size={11} />,
  absent:  <XCircle size={11} />,
  late:    <Clock size={11} />,
};

const PAGE_SIZE = 25;

type ViewMode = 'session' | 'records';

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('session');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ batchId: '', studentName: '', status: '', sessionId: '', dateFrom: '', dateTo: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.batchId) params.set('batchId', filters.batchId);
    const [aRes, bRes] = await Promise.all([fetch(`/api/attendance?${params}`), fetch('/api/batches')]);
    const [ad, bd] = await Promise.all([aRes.json(), bRes.json()]);
    if (ad.success) setRecords(ad.data);
    if (bd.success) setBatches(bd.data);
    setLoading(false);
    setPage(1);
  }, [filters.batchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setFilter = (key: string, val: string) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };
  const clearFilters = () => { setFilters({ batchId: '', studentName: '', status: '', sessionId: '', dateFrom: '', dateTo: '' }); setPage(1); };

  // Client-side filtering
  const filtered = records.filter((r) => {
    if (filters.studentName && !r.student?.name.toLowerCase().includes(filters.studentName.toLowerCase())) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.sessionId && r.session?._id !== filters.sessionId) return false;
    if (filters.dateFrom && r.session?.scheduledAt && new Date(r.session.scheduledAt) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && r.session?.scheduledAt && new Date(r.session.scheduledAt) > new Date(filters.dateTo + 'T23:59:59')) return false;
    return true;
  });

  const present = filtered.filter((r) => r.status === 'present').length;
  const absent = filtered.filter((r) => r.status === 'absent').length;
  const late = filtered.filter((r) => r.status === 'late').length;
  const pct = filtered.length > 0 ? Math.round(((present + late) / filtered.length) * 100) : null;

  // Unique sessions for the session filter dropdown
  const sessionMap = new Map<string, { id: string; title: string; date: string }>();
  records.forEach((r) => {
    if (r.session && !sessionMap.has(r.session._id)) {
      sessionMap.set(r.session._id, { id: r.session._id, title: r.session.title, date: r.session.scheduledAt });
    }
  });
  const sessions = [...sessionMap.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Session view: group filtered records by session
  const bySession = new Map<string, { session: AttendanceRecord['session']; batch: AttendanceRecord['batch']; rows: AttendanceRecord[] }>();
  if (viewMode === 'session') {
    filtered.forEach((r) => {
      const key = r.session?._id ?? 'no-session';
      if (!bySession.has(key)) bySession.set(key, { session: r.session, batch: r.batch, rows: [] });
      bySession.get(key)!.rows.push(r);
    });
  }

  // Records view pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedRecords = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500 mt-0.5">Full attendance record across all batches and sessions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total Records', value: filtered.length, icon: <Users size={15} className="text-indigo-500" />, color: 'text-indigo-600' },
          { label: 'Present', value: present, icon: <CheckCircle2 size={15} className="text-green-500" />, color: 'text-green-600' },
          { label: 'Late', value: late, icon: <Clock size={15} className="text-amber-500" />, color: 'text-amber-600' },
          { label: 'Rate', value: pct !== null ? `${pct}%` : '—', icon: <BarChart3 size={15} className="text-violet-500" />, color: pct !== null && pct >= 75 ? 'text-green-600' : pct !== null && pct >= 50 ? 'text-amber-600' : 'text-red-600' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
            <div className="mt-0.5">{icon}</div>
            <div><p className={`text-xl font-bold ${color}`}>{value}</p><p className="text-xs text-slate-500 mt-0.5">{label}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Filters</span>
          </div>
          <button onClick={clearFilters} className="text-xs text-indigo-600 hover:underline">Clear all</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Student search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.studentName}
              onChange={(e) => setFilter('studentName', e.target.value)}
              placeholder="Student name"
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {/* Batch */}
          <select value={filters.batchId} onChange={(e) => setFilter('batchId', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All Batches</option>
            {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          {/* Session */}
          <select value={filters.sessionId} onChange={(e) => setFilter('sessionId', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.title} — {istDateShort(s.date)}</option>
            ))}
          </select>
          {/* Status */}
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
          {/* Date range */}
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {([
            { key: 'session', label: 'By Session', Icon: CalendarDays },
            { key: 'records', label: 'All Records', Icon: Users },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setViewMode(key); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 bg-white rounded-xl border border-slate-200"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center py-16 text-center">
          <CheckCircle2 size={32} className="text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600">No records found</p>
          <p className="text-sm text-slate-400 mt-1">Adjust filters or mark attendance from live sessions.</p>
        </div>

      ) : viewMode === 'session' ? (
        /* ── Session view: grouped by session ── */
        <div className="space-y-4">
          {[...bySession.values()].map(({ session, batch, rows }) => {
            const sp = rows.filter((r) => r.status === 'present').length;
            const sl = rows.filter((r) => r.status === 'late').length;
            const sa = rows.filter((r) => r.status === 'absent').length;
            const rate = rows.length > 0 ? Math.round(((sp + sl) / rows.length) * 100) : null;
            return (
              <div key={session?._id ?? 'none'} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Session header */}
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{session?.title ?? 'Unknown Session'}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {batch && <span className="text-xs text-slate-400">{batch.name}</span>}
                      {session?.scheduledAt && <span className="text-xs text-slate-400">· {istDate(session.scheduledAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    <span className="flex items-center gap-1 text-green-700 font-semibold"><CheckCircle2 size={12} />{sp}</span>
                    <span className="flex items-center gap-1 text-amber-600 font-semibold"><Clock size={12} />{sl}</span>
                    <span className="flex items-center gap-1 text-red-600 font-semibold"><XCircle size={12} />{sa}</span>
                    {rate !== null && (
                      <span className={`font-bold px-2 py-0.5 rounded-full ${rate >= 75 ? 'bg-green-100 text-green-700' : rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {rate}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Student rows — mobile cards + desktop rows */}
                <div className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <div key={r._id} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-700 text-xs font-bold">{r.student?.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{r.student?.name}</p>
                        <p className="text-xs text-slate-400 truncate hidden sm:block">{r.student?.email}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_STYLE[r.status]}`}>
                        {STATUS_ICON[r.status]}{r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      ) : (
        /* ── Records view: flat list with pagination ── */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedRecords.map((r) => (
              <div key={r._id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-indigo-700 text-xs font-bold">{r.student?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{r.student?.name}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${STATUS_STYLE[r.status]}`}>
                      {STATUS_ICON[r.status]}{r.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{r.session?.title ?? '—'}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {r.batch && <span className="text-xs text-slate-400">{r.batch.name}</span>}
                    {r.session?.scheduledAt && <span className="text-xs text-slate-400">· {istDate(r.session.scheduledAt)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Session</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Batch</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Marked By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 text-xs font-bold">{r.student?.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{r.student?.name}</p>
                          <p className="text-xs text-slate-400 truncate">{r.student?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><p className="text-slate-700 truncate max-w-[180px]">{r.session?.title ?? '—'}</p></td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{r.batch?.name ?? '—'}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.session?.scheduledAt ? istDate(r.session.scheduledAt) : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[r.status]}`}>
                        {STATUS_ICON[r.status]}{r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.markedBy?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
