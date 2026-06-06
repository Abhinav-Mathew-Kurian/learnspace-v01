'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Phone, CalendarDays, BookOpen, Users,
  UserX, UserCheck, ShieldAlert, CheckCircle2, KeyRound,
  Radio, FileText,
} from 'lucide-react';
import PromptModal from '@/components/ui/PromptModal';
import { toast } from 'sonner';
import { istDate, istDateTime } from '@/lib/ist';

interface UserData {
  _id: string; name: string; email: string; phone?: string;
  avatar?: string; bio?: string; specialization?: string;
  isActive: boolean; isBanned: boolean; banReason?: string;
  isGuestLecturer?: boolean; createdAt: string;
}

interface CourseItem {
  _id: string; title: string; category?: string;
  totalVideos: number; isPublished: boolean; bannerImage?: string;
}

interface BatchItem {
  _id: string; name: string; schedule: string; isActive: boolean;
  course: { title: string } | null;
  students: { _id: string }[];
}

interface SessionItem {
  _id: string; title: string; scheduledAt: string;
  status: 'scheduled' | 'live' | 'ended';
  course: { title: string } | null;
}

export default function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<UserData | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [uRes, cRes, bRes, sRes] = await Promise.all([
      fetch(`/api/admin/users/${id}`),
      fetch(`/api/courses?teacherId=${id}`),
      fetch(`/api/batches?teacherId=${id}`),
      fetch(`/api/live?teacherId=${id}`),
    ]);
    const [uData, cData, bData, sData] = await Promise.all([
      uRes.json(), cRes.json(), bRes.json(), sRes.json(),
    ]);
    if (!uData.success) { setError('Teacher not found'); setLoading(false); return; }
    setUser(uData.data);
    if (cData.success) setCourses(cData.data);
    if (bData.success) setBatches(bData.data);
    if (sData.success) setSessions(sData.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function toggleBan() {
    if (!user) return;
    if (user.isBanned) {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: false, banReason: '' }),
      });
      toast.success(`${user.name} has been unbanned.`);
      load();
    } else {
      setShowBanModal(true);
    }
  }

  async function handleBanSubmit(reason: string) {
    if (!user) return;
    setModalLoading(true);
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBanned: true, banReason: reason }),
    });
    setModalLoading(false);
    setShowBanModal(false);
    toast.success(`${user.name} has been banned.`);
    load();
  }

  async function toggleActive() {
    if (!user) return;
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    load();
  }

  async function handlePasswordSubmit(pw: string) {
    if (!user) return;
    setModalLoading(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: pw }),
    });
    const data = await res.json();
    setModalLoading(false);
    setShowPwModal(false);
    if (data.success) toast.success('Password reset successfully.');
    else toast.error(data.error || 'Password reset failed.');
  }

  if (loading) return (
    <div className="p-8 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );

  if (error || !user) return (
    <div className="p-8 text-center">
      <p className="text-red-500 mb-2">{error || 'Not found'}</p>
      <Link href="/admin/teachers" className="text-sm text-indigo-600 hover:underline">← Back to Teachers</Link>
    </div>
  );

  const totalStudents = batches.reduce((sum, b) => sum + b.students.length, 0);

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/teachers" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft size={15} /> Back to Teachers
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile + Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center text-2xl font-bold text-sky-600 mb-3 overflow-hidden">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-bold text-slate-800">{user.name}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
              {user.specialization && (
                <p className="text-xs text-sky-600 mt-1 font-medium">{user.specialization}</p>
              )}
            </div>

            {user.bio && (
              <p className="text-xs text-slate-500 leading-relaxed mb-4 border-t border-slate-100 pt-4">{user.bio}</p>
            )}

            <div className="space-y-2 text-sm mb-4">
              {user.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={13} className="text-slate-400" /> {user.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <CalendarDays size={13} className="text-slate-400" />
                Joined {istDate(user.createdAt)}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {user.isBanned
                ? <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-medium">Banned</span>
                : user.isActive
                  ? <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">Active</span>
                  : <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium">Inactive</span>}
              {user.isGuestLecturer && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs font-medium">Guest</span>
              )}
            </div>

            {user.isBanned && user.banReason && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600 font-semibold mb-0.5">Ban reason</p>
                <p className="text-xs text-red-500">{user.banReason}</p>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: BookOpen, value: courses.length, label: 'Courses', color: 'text-indigo-600' },
              { icon: Users, value: totalStudents, label: 'Students', color: 'text-sky-600' },
              { icon: Radio, value: sessions.length, label: 'Sessions', color: 'text-green-600' },
            ].map(({ icon: Icon, value, label, color }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <Icon size={14} className={`${color} mx-auto mb-1`} />
                <p className="text-lg font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Actions</h3>
            <div className="space-y-2">
              <button onClick={toggleActive}
                className={`w-full flex items-center gap-2 text-sm py-2 px-3 rounded-lg border text-left transition-colors
                  ${user.isActive ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
                {user.isActive ? <><UserX size={14} /> Deactivate account</> : <><UserCheck size={14} /> Activate account</>}
              </button>
              <button onClick={toggleBan}
                className={`w-full flex items-center gap-2 text-sm py-2 px-3 rounded-lg border text-left transition-colors
                  ${user.isBanned ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                {user.isBanned ? <><CheckCircle2 size={14} /> Unban teacher</> : <><ShieldAlert size={14} /> Ban teacher</>}
              </button>
              <button onClick={() => setShowPwModal(true)}
                className="w-full flex items-center gap-2 text-sm py-2 px-3 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 text-left transition-colors">
                <KeyRound size={14} /> Reset password
              </button>
            </div>
          </div>
        </div>

        {/* Right: Courses + Batches */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <BookOpen size={14} className="text-indigo-500" /> Courses ({courses.length})
              </h3>
            </div>
            {courses.length === 0 ? (
              <p className="p-6 text-center text-slate-400 text-sm">No courses yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {courses.map((c) => (
                  <div key={c._id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.category && <span className="mr-2">{c.category}</span>}
                        {c.totalVideos} video{c.totalVideos !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${c.isPublished ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                      {c.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {batches.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Users size={14} className="text-sky-500" /> Batches ({batches.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <div key={b._id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{b.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {b.course?.title && <span className="mr-2">{b.course.title}</span>}
                        {b.students.length} student{b.students.length !== 1 ? 's' : ''}
                        {b.schedule && <span className="ml-2">· {b.schedule}</span>}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${b.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sessions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Radio size={14} className="text-green-500" /> Recent Sessions ({sessions.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {sessions.slice(0, 10).map((s) => (
                  <div key={s._id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {s.course?.title && <span className="mr-2">{s.course.title}</span>}
                        {istDateTime(s.scheduledAt)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs capitalize
                      ${s.status === 'live' ? 'bg-red-100 text-red-600' :
                        s.status === 'ended' ? 'bg-slate-100 text-slate-500' :
                        'bg-indigo-50 text-indigo-600'}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <PromptModal
        open={showBanModal}
        title={`Ban ${user?.name ?? 'teacher'}`}
        label="Reason for banning"
        placeholder="Enter the reason…"
        type="textarea"
        submitLabel="Ban Teacher"
        loading={modalLoading}
        onSubmit={handleBanSubmit}
        onCancel={() => setShowBanModal(false)}
      />

      <PromptModal
        open={showPwModal}
        title={`Reset password — ${user?.name ?? ''}`}
        label="New password"
        placeholder="Min 6 characters"
        type="password"
        minLength={6}
        submitLabel="Reset Password"
        loading={modalLoading}
        onSubmit={handlePasswordSubmit}
        onCancel={() => setShowPwModal(false)}
      />
    </div>
  );
}
