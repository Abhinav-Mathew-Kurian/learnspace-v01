'use client';

import { useEffect, useState } from 'react';
import CreateUserModal from '@/components/admin/CreateUserModal';
import Pagination from '@/components/shared/Pagination';
import PromptModal from '@/components/ui/PromptModal';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

const PAGE_SIZE = 10;

interface Teacher {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  bio: string;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
}

function StatusBadge({ t }: { t: Teacher }) {
  if (t.isBanned) return <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">Banned</span>;
  if (t.isActive) return <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">Active</span>;
  return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">Inactive</span>;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null);
  const [pwTarget, setPwTarget] = useState<{ id: string; name: string } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/users?role=teacher');
    const data = await res.json();
    if (data.success) setTeachers(data.data);
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

  const filtered = teachers.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || (t.specialization || '').toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const displayed = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Teachers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} of {teachers.length} total</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, specialization…"
              className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          + Add Teacher
        </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No teachers found.
        </div>
      ) : (
        <>
          {/* ── Mobile cards (hidden on md+) ── */}
          <div className="md:hidden space-y-3">
            {displayed.map((t) => (
              <div key={t._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                    <p className="text-xs text-slate-500 truncate">{t.email}</p>
                  </div>
                  <StatusBadge t={t} />
                </div>

                {t.specialization && (
                  <p className="text-xs text-slate-500 mb-3">
                    <span className="text-slate-400">Specialization: </span>{t.specialization}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <a href={`/admin/teachers/${t._id}`} className="text-xs text-indigo-600 font-medium hover:underline">Detail</a>
                  <button onClick={() => toggleActive(t._id, t.isActive)} className="text-xs text-slate-500 hover:text-slate-800 font-medium">
                    {t.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => toggleBan(t._id, t.name, t.isBanned)} className={`text-xs font-medium ${t.isBanned ? 'text-green-600' : 'text-red-500'}`}>
                    {t.isBanned ? 'Unban' : 'Ban'}
                  </button>
                  <button onClick={() => setPwTarget({ id: t._id, name: t.name })} className="text-xs text-amber-600 font-medium">Reset PW</button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="md:hidden bg-white rounded-xl border border-slate-200 mt-2">
              <Pagination currentPage={page} totalPages={totalPages} totalItems={teachers.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          )}

          {/* ── Desktop table (hidden on mobile) ── */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Specialization</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                    <td className="px-4 py-3 text-slate-500">{t.email}</td>
                    <td className="px-4 py-3 text-slate-500">{t.specialization || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge t={t} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a href={`/admin/teachers/${t._id}`} className="text-xs text-indigo-600 hover:text-indigo-800 underline">Detail</a>
                        <button onClick={() => toggleActive(t._id, t.isActive)} className="text-xs text-slate-500 hover:text-slate-800 underline">
                          {t.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => toggleBan(t._id, t.name, t.isBanned)} className={`text-xs underline ${t.isBanned ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700'}`}>
                          {t.isBanned ? 'Unban' : 'Ban'}
                        </button>
                        <button onClick={() => setPwTarget({ id: t._id, name: t.name })} className="text-xs text-amber-600 hover:text-amber-800 underline">Reset PW</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={teachers.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        </>
      )}

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}

      <PromptModal
        open={!!banTarget}
        title={`Ban ${banTarget?.name ?? 'teacher'}`}
        label="Reason for banning"
        placeholder="Enter the reason…"
        type="textarea"
        submitLabel="Ban Teacher"
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
