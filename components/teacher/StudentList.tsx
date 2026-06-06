'use client';

import { useState } from 'react';
import { Search, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Pagination from '@/components/shared/Pagination';

interface StudentRow {
  id: string;
  name: string;
  email: string;
  batches: string[];
  present: number;
  late: number;
  absent: number;
  total: number;
  pct: number | null;
}

const PAGE_SIZE = 15;

export default function StudentList({ students }: { students: StudentRow[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const displayed = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (students.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header + search */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">All Students</h2>
          <p className="text-xs text-slate-400 mt-0.5">{students.length} total</p>
        </div>
        <div className="sm:ml-auto relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">No students match your search.</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {displayed.map((s) => (
              <div key={s.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400 truncate">{s.email}</p>
                  </div>
                  {s.pct !== null && (
                    <span className={`text-sm font-bold flex-shrink-0 ${s.pct >= 75 ? 'text-green-600' : s.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {s.pct}%
                    </span>
                  )}
                </div>
                {/* Attendance progress */}
                {s.total > 0 && (
                  <div className="mb-2">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${(s.pct ?? 0) >= 75 ? 'bg-green-500' : (s.pct ?? 0) >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${s.pct ?? 0}%` }}
                      />
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs">
                      <span className="text-green-700 font-medium">{s.present} present</span>
                      <span className="text-amber-600 font-medium">{s.late} late</span>
                      <span className="text-red-600 font-medium">{s.absent} absent</span>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {s.batches.map((b) => (
                    <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">{b}</span>
                  ))}
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Batches</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[160px]">Attendance</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Present</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Late</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 text-xs font-bold">{s.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{s.name}</p>
                          <p className="text-xs text-slate-400 truncate">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.batches.map((b) => (
                          <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">{b}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${s.pct >= 75 ? 'bg-green-500' : s.pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                              style={{ width: `${s.pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-9 text-right ${s.pct >= 75 ? 'text-green-600' : s.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {s.pct}%
                          </span>
                        </div>
                      ) : <span className="text-slate-400 text-xs">No sessions</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-green-700 font-semibold text-sm">
                        <CheckCircle2 size={13} />{s.present}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-amber-600 font-semibold text-sm">
                        <Clock size={13} />{s.late}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-red-600 font-semibold text-sm">
                        <XCircle size={13} />{s.absent}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
