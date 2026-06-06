'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Phone, CalendarDays, BookOpen, CheckCircle2,
  AlertTriangle, UserX, UserCheck, KeyRound, ShieldAlert,
  IndianRupee, CheckCheck, Pencil, Zap, Clock,
} from 'lucide-react';
import PromptModal from '@/components/ui/PromptModal';
import { toast } from 'sonner';
import { istDate } from '@/lib/ist';
import { format, addMonths } from 'date-fns';

interface UserData {
  _id: string; name: string; email: string; phone?: string; avatar?: string;
  isActive: boolean; isBanned: boolean; banReason?: string;
  subscriptionType?: string | null; subscriptionExpiry?: string | null;
  installmentPending?: boolean; installmentAmount?: number | null;
  installmentDueDate?: string | null;
  installmentCourseId?: { _id: string; title: string } | string | null;
  createdAt: string;
}

interface Enrollment {
  _id: string;
  course: { _id: string; title: string; bannerImage?: string; category?: string; pricingType?: string; price?: number; installmentMonths?: number; currency?: string };
  enrolledAt: string; isActive: boolean;
}

interface CourseInstallment {
  _id: string;
  course: { _id: string; title: string; currency?: string };
  installmentNumber: number;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paidAt: string | null;
}

interface AttendanceRecord {
  _id: string; status: 'present' | 'absent' | 'late'; markedAt: string;
  session: { title: string; scheduledAt: string } | null;
  batch: { name: string } | null;
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<UserData | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseInstallments, setCourseInstallments] = useState<CourseInstallment[]>([]);
  const [ciLoading, setCiLoading] = useState<string | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);
  const [subType, setSubType] = useState('');
  const [subExpiry, setSubExpiry] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [installAmount, setInstallAmount] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [installCourseId, setInstallCourseId] = useState('');
  const [installLoading, setInstallLoading] = useState(false);
  const [editingInstall, setEditingInstall] = useState(false);

  async function fetchData(showSkeleton = false) {
    if (showSkeleton) setLoading(true);
    const [uRes, eRes, aRes, ciRes] = await Promise.all([
      fetch(`/api/admin/users/${id}`, { cache: 'no-store' }),
      fetch(`/api/admin/enrollments?studentId=${id}`, { cache: 'no-store' }),
      fetch(`/api/attendance?studentId=${id}`, { cache: 'no-store' }),
      fetch(`/api/admin/course-installments?studentId=${id}`, { cache: 'no-store' }),
    ]);
    const [uData, eData, aData, ciData] = await Promise.all([uRes.json(), eRes.json(), aRes.json(), ciRes.json()]);
    if (!uData.success) { setError('Student not found'); setLoading(false); return; }
    setUser(uData.data);
    const cid = uData.data.installmentCourseId;
    setInstallCourseId(cid ? (typeof cid === 'object' ? cid._id : cid) : '');
    if (eData.success) setEnrollments(eData.data);
    if (aData.success) setAttendance(aData.data);
    if (ciData.success) setCourseInstallments(ciData.data);
    if (showSkeleton) setLoading(false);
  }

  const load = () => fetchData(true);
  const refresh = () => fetchData(false);

  async function generateSchedule(courseId: string) {
    setCiLoading(courseId);
    const res = await fetch('/api/admin/course-installments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: id, courseId }),
    });
    const data = await res.json();
    setCiLoading(null);
    if (data.success) { toast.success('Payment schedule generated!'); refresh(); }
    else toast.error(data.error || 'Failed to generate');
  }

  async function markInstallmentPaid(installmentId: string) {
    setCiLoading(installmentId);
    const res = await fetch(`/api/admin/course-installments/${installmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markPaid: true }),
    });
    const data = await res.json();
    setCiLoading(null);
    if (data.success) { toast.success('Marked as paid!'); refresh(); }
    else toast.error(data.error || 'Failed');
  }

  async function markInstallmentPending(installmentId: string) {
    setCiLoading(installmentId);
    const res = await fetch(`/api/admin/course-installments/${installmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markPending: true }),
    });
    const data = await res.json();
    setCiLoading(null);
    if (data.success) { toast.success('Marked as pending'); refresh(); }
    else toast.error(data.error || 'Failed');
  }

  function openSubEdit() {
    if (!user) return;
    setSubType(user.subscriptionType || '');
    setSubExpiry(user.subscriptionExpiry ? user.subscriptionExpiry.split('T')[0] : '');
    setEditingSubscription(true);
  }

  async function saveSubscription() {
    setSubLoading(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionType: subType || null,
        subscriptionExpiry: subExpiry || null,
      }),
    });
    const data = await res.json();
    setSubLoading(false);
    if (data.success) {
      toast.success('Subscription updated.');
      setEditingSubscription(false);
      refresh();
    } else toast.error(data.error || 'Failed to save.');
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
      refresh();
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
    refresh();
  }

  async function toggleActive() {
    if (!user) return;
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    refresh();
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

  async function saveInstallment() {
    if (!installAmount || !installDate) { toast.error('Enter both amount and due date.'); return; }
    setInstallLoading(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installmentPending: true, installmentAmount: Number(installAmount), installmentDueDate: installDate, installmentCourseId: installCourseId || null }),
    });
    const data = await res.json();
    setInstallLoading(false);
    if (data.success) {
      toast.success('Installment saved.');
      setEditingInstall(false);
      refresh();
    } else toast.error(data.error || 'Failed to save.');
  }

  async function markPaid() {
    setInstallLoading(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installmentPending: false, installmentAmount: null, installmentDueDate: null, installmentCourseId: null }),
    });
    const data = await res.json();
    setInstallLoading(false);
    if (data.success) { toast.success('Marked as paid!'); refresh(); }
    else toast.error(data.error || 'Failed.');
  }

  if (loading) return (
    <div className="p-8 space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );

  if (error || !user) return (
    <div className="p-8 text-center">
      <p className="text-red-500 mb-2">{error || 'Not found'}</p>
      <Link href="/admin/students" className="text-sm text-indigo-600 hover:underline">← Back to Students</Link>
    </div>
  );

  const isExpired = !!(user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date());
  const present = attendance.filter((a) => a.status === 'present').length;
  const late = attendance.filter((a) => a.status === 'late').length;
  const absent = attendance.filter((a) => a.status === 'absent').length;
  const attendanceRate = attendance.length > 0 ? Math.round((present + late) * 100 / attendance.length) : null;

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft size={15} /> Back to Students
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile + Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 mb-3 overflow-hidden">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-bold text-slate-800">{user.name}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>

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
              {isExpired && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-xs font-medium">Expired</span>}
            </div>

            {user.isBanned && user.banReason && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600 font-semibold mb-0.5">Ban reason</p>
                <p className="text-xs text-red-500">{user.banReason}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Subscription</h3>
              <button
                onClick={openSubEdit}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                title="Edit subscription"
              >
                <Pencil size={13} />
              </button>
            </div>
            {editingSubscription ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Plan</label>
                  <select
                    value={subType}
                    onChange={e => setSubType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    <option value="">— No plan —</option>
                    <option value="1month">1 Month</option>
                    <option value="3month">3 Months</option>
                    <option value="6month">6 Months</option>
                    <option value="1year">1 Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={subExpiry}
                    onChange={e => setSubExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveSubscription} disabled={subLoading}
                    className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                  >
                    {subLoading ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingSubscription(false)}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Plan</dt>
                  <dd className="font-medium text-slate-800">{user.subscriptionType || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Expires</dt>
                  <dd className={`font-medium ${isExpired ? 'text-red-500' : 'text-slate-800'}`}>
                    {user.subscriptionExpiry ? istDate(user.subscriptionExpiry) : '—'}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {/* ── Installment / Payment ── */}
          <div className={`rounded-xl border p-5 ${user.installmentPending ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IndianRupee size={14} className={user.installmentPending ? 'text-orange-500' : 'text-slate-400'} />
                <h3 className="text-sm font-semibold text-slate-700">Installment</h3>
              </div>
              <button
                onClick={() => { setEditingInstall(e => !e); setInstallAmount(String(user.installmentAmount ?? '')); setInstallDate(user.installmentDueDate ? user.installmentDueDate.split('T')[0] : ''); const cid = user.installmentCourseId; setInstallCourseId(cid ? (typeof cid === 'object' ? cid._id : cid) : ''); }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <Pencil size={13} />
              </button>
            </div>

            {/* Current status */}
            {user.installmentPending ? (
              <div className="mb-3">
                <p className="text-2xl font-black text-orange-700">₹{(user.installmentAmount ?? 0).toLocaleString('en-IN')}</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  Due {user.installmentDueDate ? istDate(user.installmentDueDate) : '—'}
                </p>
                {user.installmentCourseId && (() => {
                  const courseTitle = typeof user.installmentCourseId === 'object'
                    ? user.installmentCourseId.title
                    : null;
                  return courseTitle ? (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <BookOpen size={11} /> {courseTitle}
                    </p>
                  ) : null;
                })()}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mb-3">No pending installment.</p>
            )}

            {/* Edit form */}
            {editingInstall && (
              <div className="space-y-2 pt-3 border-t border-orange-200">
                {/* Course dropdown — one-time courses only */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Linked Course <span className="font-normal text-slate-400">(one-time)</span></label>
                  <select
                    value={installCourseId}
                    onChange={e => {
                      setInstallCourseId(e.target.value);
                      const enr = enrollments.find(en => en.course._id === e.target.value);
                      if (enr?.course.price && !installAmount) setInstallAmount(String(enr.course.price));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  >
                    <option value="">— Select course (optional) —</option>
                    {enrollments
                      .filter(e => e.course.pricingType === 'lifetime' && e.isActive)
                      .map(e => (
                        <option key={e.course._id} value={e.course._id}>
                          {e.course.title}{e.course.price ? ` · ₹${e.course.price.toLocaleString('en-IN')}` : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹)</label>
                  <input
                    type="number" min="1" value={installAmount} onChange={e => setInstallAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
                  <input
                    type="date" value={installDate} onChange={e => setInstallDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <button
                  onClick={saveInstallment} disabled={installLoading}
                  className="w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                >
                  {installLoading ? 'Saving…' : 'Save Installment'}
                </button>
              </div>
            )}

            {/* Mark paid */}
            {user.installmentPending && !editingInstall && (
              <button
                onClick={markPaid} disabled={installLoading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-green-200 text-green-700 text-sm font-semibold hover:bg-green-50 disabled:opacity-60 transition-colors"
              >
                <CheckCheck size={14} /> Mark as Paid
              </button>
            )}
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
                {user.isBanned ? <><CheckCircle2 size={14} /> Unban student</> : <><ShieldAlert size={14} /> Ban student</>}
              </button>
              <button onClick={() => setShowPwModal(true)}
                className="w-full flex items-center gap-2 text-sm py-2 px-3 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 text-left transition-colors">
                <KeyRound size={14} /> Reset password
              </button>
            </div>
          </div>
        </div>

        {/* Right: Enrollments + Attendance */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <BookOpen size={14} className="text-indigo-500" />
                Enrolled Courses ({enrollments.filter((e) => e.isActive).length} active)
              </h3>
            </div>
            {enrollments.length === 0 ? (
              <p className="p-6 text-center text-slate-400 text-sm">Not enrolled in any courses.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {enrollments.map((e) => (
                  <div key={e._id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{e.course.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {e.course.category && <span className="mr-2">{e.course.category}</span>}
                        Enrolled {istDate(e.enrolledAt)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${e.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                      {e.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Course-based Installment Schedules ── */}
          {(() => {
            const installmentEnrollments = enrollments.filter(e => e.course.pricingType === 'installment');
            if (installmentEnrollments.length === 0) return null;
            return (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <IndianRupee size={14} className="text-violet-500" />
                    Course Payment Schedules
                    <span className="text-xs font-normal text-slate-400">(auto-generated)</span>
                  </h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {installmentEnrollments.map(enr => {
                    const courseInstalls = courseInstallments.filter(ci => ci.course._id === enr.course._id);
                    const hasSchedule = courseInstalls.length > 0;
                    const paidCount = courseInstalls.filter(ci => ci.status === 'paid').length;
                    const sym = enr.course.currency === 'USD' ? '$' : enr.course.currency === 'EUR' ? '€' : '₹';
                    return (
                      <div key={enr._id} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{enr.course.title}</p>
                            {hasSchedule && (
                              <p className="text-xs text-slate-400 mt-0.5">{paidCount}/{courseInstalls.length} payments done</p>
                            )}
                          </div>
                          {!hasSchedule && (
                            <button
                              onClick={() => generateSchedule(enr.course._id)}
                              disabled={ciLoading === enr.course._id}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60 transition-colors"
                            >
                              <Zap size={11} />
                              {ciLoading === enr.course._id ? 'Generating…' : 'Generate Schedule'}
                            </button>
                          )}
                          {hasSchedule && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">{paidCount === courseInstalls.length ? '✅ All paid' : `${courseInstalls.length - paidCount} pending`}</span>
                            </div>
                          )}
                        </div>
                        {hasSchedule && (
                          <div className="space-y-1.5">
                            {courseInstalls.map(ci => {
                              const isOverdue = ci.status !== 'paid' && new Date(ci.dueDate) < new Date();
                              return (
                                <div key={ci._id} className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${
                                  ci.status === 'paid' ? 'bg-green-50 border border-green-100' :
                                  isOverdue ? 'bg-red-50 border border-red-100' :
                                  'bg-slate-50 border border-slate-100'
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 ${
                                      ci.status === 'paid' ? 'bg-green-200 text-green-700' :
                                      isOverdue ? 'bg-red-200 text-red-700' :
                                      'bg-slate-200 text-slate-600'
                                    }`}>
                                      {ci.installmentNumber}
                                    </span>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-700">{sym}{ci.amount.toLocaleString('en-IN')}</p>
                                      <p className="text-[10px] text-slate-400">
                                        {ci.status === 'paid'
                                          ? `Paid ${ci.paidAt ? istDate(ci.paidAt) : ''}`
                                          : `Due ${istDate(ci.dueDate)}${isOverdue ? ' · OVERDUE' : ''}`}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => ci.status === 'paid' ? markInstallmentPending(ci._id) : markInstallmentPaid(ci._id)}
                                    disabled={ciLoading === ci._id}
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60 ${
                                      ci.status === 'paid'
                                        ? 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                                  >
                                    {ciLoading === ci._id ? '…' : ci.status === 'paid' ? 'Undo' : 'Mark Paid'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {attendance.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" />
                  Attendance
                  {attendanceRate !== null && (
                    <span className="ml-auto text-sm font-medium text-slate-500">{attendanceRate}% present</span>
                  )}
                </h3>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{present}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Present</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-500">{late}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Late</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">{absent}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Absent</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {attendance.slice(0, 30).map((a) => (
                  <div key={a._id} className="px-5 py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-700">{a.session?.title ?? '—'}</p>
                      <p className="text-xs text-slate-400">
                        {a.batch?.name && <span className="mr-2">{a.batch.name}</span>}
                        {a.session?.scheduledAt ? istDate(a.session.scheduledAt) : ''}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs capitalize
                      ${a.status === 'present' ? 'bg-green-100 text-green-700' :
                        a.status === 'late' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'}`}>
                      {a.status}
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
        title={`Ban ${user?.name ?? 'student'}`}
        label="Reason for banning"
        placeholder="Enter the reason…"
        type="textarea"
        submitLabel="Ban Student"
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
