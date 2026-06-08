'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import CreateUserModal from '@/components/admin/CreateUserModal';
import Pagination from '@/components/shared/Pagination';
import PromptModal from '@/components/ui/PromptModal';
import { toast } from 'sonner';
import { istDate } from '@/lib/ist';

const PAGE_SIZE = 10;

type TabFilter = 'all' | 'active' | 'expired' | 'banned' | 'deactivated';

interface CourseInstallmentSummary {
  pendingCount: number;
  nextDue: string | null;
  nextAmount: number | null;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isBanned: boolean;
  banReason: string;
  subscriptionType: string | null;
  subscriptionExpiry: string | null;
  installmentPending: boolean;
  installmentAmount: number | null;
  installmentDueDate: string | null;
  courseInstallmentSummary: CourseInstallmentSummary | null;
  createdAt: string;
}

const TABS: { value: TabFilter; label: string }[] = [
  { value: 'all',         label: 'All'         },
  { value: 'active',      label: 'Active'      },
  { value: 'expired',     label: 'Expired'     },
  { value: 'banned',      label: 'Banned'      },
  { value: 'deactivated', label: 'Deactivated' },
];

function StatusBadge({ s }: { s: Student }) {
  if (s.isBanned) return <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">Banned</span>;
  if (s.isActive) return <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">Active</span>;
  return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">Inactive</span>;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');
  const [onlyInstallment, setOnlyInstallment] = useState(false);
  const [page, setPage] = useState(1);
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null);
  const [pwTarget, setPwTarget] = useState<{ id: string; name: string } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/users?role=student');
    const data = await res.json();
    if (data.success) setStudents(data.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleBan(id: string, name: string, isBanned: boolean) {
    if (isBanned) {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: false, banReason: '' }),
      });
      toast.success(`${name} has been unbanned.`);
      load();
    } else {
      setBanTarget({ id, name });
    }
  }

  async function handleBanSubmit(reason: string) {
    if (!banTarget) return;
    setModalLoading(true);
    await fetch(`/api/admin/users/${banTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBanned: true, banReason: reason }),
    });
    setModalLoading(false);
    setBanTarget(null);
    toast.success(`${banTarget.name} has been banned.`);
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  }

  async function handlePasswordSubmit(pw: string) {
    if (!pwTarget) return;
    setModalLoading(true);
    const res = await fetch(`/api/admin/users/${pwTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: pw }),
    });
    const data = await res.json();
    setModalLoading(false);
    setPwTarget(null);
    if (data.success) toast.success(`Password reset for ${pwTarget.name}.`);
    else toast.error(data.error || 'Password reset failed.');
  }

  const now = new Date();

  const filtered = students
    .filter((s) => {
      const isExpired = !!(s.subscriptionExpiry && new Date(s.subscriptionExpiry) < now);
      if (tab === 'active')      return s.isActive && !s.isBanned && !isExpired;
      if (tab === 'expired')     return isExpired;
      if (tab === 'banned')      return s.isBanned;
      if (tab === 'deactivated') return !s.isActive && !s.isBanned;
      return true;
    })
    .filter((s) => !onlyInstallment || s.installmentPending || (s.courseInstallmentSummary?.pendingCount ?? 0) > 0)
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phone && s.phone.includes(q));
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const displayed = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changeTab(t: TabFilter) { setTab(t); setPage(1); }
  function changeSearch(v: string) { setSearch(v); setPage(1); }

  // Per-tab counts
  const counts: Record<TabFilter, number> = {
    all:         students.length,
    active:      students.filter(s => s.isActive && !s.isBanned && !(s.subscriptionExpiry && new Date(s.subscriptionExpiry) < now)).length,
    expired:     students.filter(s => !!(s.subscriptionExpiry && new Date(s.subscriptionExpiry) < now)).length,
    banned:      students.filter(s => s.isBanned).length,
    deactivated: students.filter(s => !s.isActive && !s.isBanned).length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Students</h1>
          <p className="text-slate-500 text-sm mt-0.5">{students.length} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          + Add Student
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => changeTab(t.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
              tab === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {counts[t.value] > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.value ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {counts[t.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 cursor-pointer hover:bg-slate-50 whitespace-nowrap">
          <input
            type="checkbox"
            checked={onlyInstallment}
            onChange={(e) => { setOnlyInstallment(e.target.checked); setPage(1); }}
            className="accent-indigo-600"
          />
          Installment Pending
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No students found.
        </div>
      ) : (
        <>
          {/* ── Mobile cards (hidden on md+) ── */}
          <div className="md:hidden space-y-3 mb-2">
            {displayed.map((s) => (
              <div key={s._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 truncate">{s.email}</p>
                  </div>
                  <StatusBadge s={s} />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                  {s.subscriptionType && (
                    <div><span className="text-slate-400">Plan </span><span className="font-medium text-slate-700">{s.subscriptionType}</span></div>
                  )}
                  {s.subscriptionExpiry && (
                    <div>
                      <span className="text-slate-400">Expires </span>
                      <span className={`font-medium ${new Date(s.subscriptionExpiry) < now ? 'text-red-500' : 'text-slate-700'}`}>
                        {new Date(s.subscriptionExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                  )}
                  {(s.installmentPending || (s.courseInstallmentSummary?.pendingCount ?? 0) > 0) && (
                    <div className="col-span-2 space-y-1">
                      {s.installmentPending && (
                        <div>
                          <span className="text-slate-400">Manual </span>
                          <span className="font-medium text-orange-600">₹{s.installmentAmount} due {s.installmentDueDate ? new Date(s.installmentDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
                        </div>
                      )}
                      {(s.courseInstallmentSummary?.pendingCount ?? 0) > 0 && (
                        <div>
                          <span className="text-slate-400">Course </span>
                          <span className="font-medium text-violet-600">{s.courseInstallmentSummary!.pendingCount} pending · next due {s.courseInstallmentSummary!.nextDue ? new Date(s.courseInstallmentSummary!.nextDue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {s.isBanned && s.banReason && (
                    <div className="col-span-2">
                      <span className="text-red-400">Ban reason: </span>
                      <span className="text-red-600 text-xs">{s.banReason}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <a href={`/admin/students/${s._id}`} className="text-xs text-indigo-600 font-medium hover:underline">Detail</a>
                  <button onClick={() => toggleActive(s._id, s.isActive)} className="text-xs text-slate-500 hover:text-slate-800 font-medium">
                    {s.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => toggleBan(s._id, s.name, s.isBanned)} className={`text-xs font-medium ${s.isBanned ? 'text-green-600' : 'text-red-500'}`}>
                    {s.isBanned ? 'Unban' : 'Ban'}
                  </button>
                  <button onClick={() => setPwTarget({ id: s._id, name: s.name })} className="text-xs text-amber-600 font-medium">Reset PW</button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="md:hidden bg-white rounded-xl border border-slate-200 mt-2">
              <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          )}

          {/* ── Desktop table (hidden on mobile) ── */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Subscription</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Expiry</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Installment</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{s.name}</p>
                      {s.isBanned && s.banReason && (
                        <p className="text-xs text-red-500 mt-0.5 truncate max-w-[180px]" title={s.banReason}>Ban: {s.banReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.email}</td>
                    <td className="px-4 py-3">
                      {s.subscriptionType
                        ? <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{s.subscriptionType}</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {s.subscriptionExpiry
                        ? new Date(s.subscriptionExpiry) < now
                          ? <span className="text-red-500">{istDate(s.subscriptionExpiry)}</span>
                          : istDate(s.subscriptionExpiry)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {!s.installmentPending && !(s.courseInstallmentSummary?.pendingCount) ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {s.installmentPending && (
                            <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs whitespace-nowrap">
                              ₹{s.installmentAmount?.toLocaleString('en-IN')} due {s.installmentDueDate ? istDate(s.installmentDueDate) : ''}
                            </span>
                          )}
                          {(s.courseInstallmentSummary?.pendingCount ?? 0) > 0 && (
                            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-xs whitespace-nowrap">
                              {s.courseInstallmentSummary!.pendingCount} course instalment{s.courseInstallmentSummary!.pendingCount > 1 ? 's' : ''} pending
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge s={s} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <a href={`/admin/students/${s._id}`} className="text-xs text-indigo-600 hover:text-indigo-800 underline">Detail</a>
                        <button onClick={() => toggleActive(s._id, s.isActive)} className="text-xs text-slate-500 hover:text-slate-800 underline">
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => toggleBan(s._id, s.name, s.isBanned)} className={`text-xs underline ${s.isBanned ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700'}`}>
                          {s.isBanned ? 'Unban' : 'Ban'}
                        </button>
                        <button onClick={() => setPwTarget({ id: s._id, name: s.name })} className="text-xs text-amber-600 hover:text-amber-800 underline">Reset PW</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        </>
      )}

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}

      <PromptModal
        open={!!banTarget}
        title={`Ban ${banTarget?.name ?? 'student'}`}
        label="Reason for banning"
        placeholder="Enter the reason…"
        type="textarea"
        submitLabel="Ban Student"
        loading={modalLoading}
        onSubmit={handleBanSubmit}
        onCancel={() => setBanTarget(null)}
      />

      <PromptModal
        open={!!pwTarget}
        title={`Reset password — ${pwTarget?.name ?? ''}`}
        label="New password"
        placeholder="Min 6 characters"
        type="password"
        minLength={6}
        submitLabel="Reset Password"
        loading={modalLoading}
        onSubmit={handlePasswordSubmit}
        onCancel={() => setPwTarget(null)}
      />
    </div>
  );
}
