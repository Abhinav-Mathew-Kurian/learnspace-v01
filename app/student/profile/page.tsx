'use client';

import { useEffect, useRef, useState } from 'react';
import { differenceInDays } from 'date-fns';
import { istDate, istDateTime } from '@/lib/ist';
import {
  Mail, Phone, CalendarDays, ShieldCheck, BookOpen,
  CheckCircle2, Clock, Camera, Loader2, XCircle,
  Pencil, Save, X, TrendingUp, Award,
  IndianRupee, CalendarClock,
} from 'lucide-react';
import Link from 'next/link';

interface UserData {
  _id: string; name: string; email: string; phone?: string; avatar?: string;
  role: string; createdAt: string; subscriptionExpiry?: string | null;
  subscriptionType?: string | null; installmentPending?: boolean;
  installmentAmount?: number | null; installmentDueDate?: string | null;
  installmentCourseId?: { _id: string; title: string } | string | null;
}
interface Enrollment { _id: string; course: { _id: string; title: string; bannerImage?: string }; enrolledAt: string }
interface AttendanceRecord { _id: string; session: { title: string; scheduledAt: string } | null; status: 'present' | 'absent' | 'late' }
interface CourseInstallment { _id: string; course: { _id: string; title: string }; installmentNumber: number; amount: number; currency: string; dueDate: string; status: 'pending' | 'paid' | 'overdue'; paidAt: string | null }

const STATUS_STYLE: Record<string, string> = { present: 'bg-green-100 text-green-700', absent: 'bg-red-100 text-red-700', late: 'bg-amber-100 text-amber-700' };

export default function StudentProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [courseInstallments, setCourseInstallments] = useState<CourseInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const [uRes, eRes, aRes, ciRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/student/enrollments'),
        fetch('/api/attendance'),
        fetch('/api/student/course-installments'),
      ]);
      const [ud, ed, ad, ciD] = await Promise.all([uRes.json(), eRes.json(), aRes.json(), ciRes.json()]);

      if (ud.success) { setUser(ud.data); setEditForm({ name: ud.data.name, phone: ud.data.phone ?? '' }); }
      if (ed.success) setEnrollments(ed.data);
      if (ad.success) setAttendance(ad.data.slice(0, 20));
      if (ciD.success) setCourseInstallments(ciD.data);
      setLoading(false);
    };
    load();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar: data.data.url }) });
      setUser(u => u ? { ...u, avatar: data.data.url } : u);
    }
    setUploading(false); e.target.value = '';
  };

  const saveProfile = async () => {
    setSaving(true);
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    const data = await res.json();
    setSaving(false);
    if (data.success) { setUser(u => u ? { ...u, ...editForm } : u); setEditing(false); }
  };

  if (loading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>;
  if (!user) return null;

  const isExpired = user.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry);
  const daysLeft = user.subscriptionExpiry ? differenceInDays(new Date(user.subscriptionExpiry), new Date()) : null;
  const isOverdue = user.installmentPending && user.installmentDueDate && new Date() > new Date(user.installmentDueDate);
  const daysUntilDue = user.installmentDueDate ? differenceInDays(new Date(user.installmentDueDate), new Date()) : null;
  const present = attendance.filter(a => a.status === 'present').length;
  const late = attendance.filter(a => a.status === 'late').length;
  const absent = attendance.filter(a => a.status === 'absent').length;
  const total = attendance.length;
  const attendancePct = total > 0 ? Math.round(((present + late) / total) * 100) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your learning journey and account details</p>
      </div>

      {/* ── Payment / Installment card ── */}
      {user.installmentPending && user.installmentAmount && (() => {
        const linkedCourseTitle = user.installmentCourseId
          ? (typeof user.installmentCourseId === 'object' ? user.installmentCourseId.title : null)
          : null;
        return (
          <div className={`mb-6 rounded-2xl border overflow-hidden shadow-sm ${isOverdue ? 'border-red-300' : 'border-amber-200'}`}>
            {/* Coloured header */}
            <div className={`px-5 py-4 flex items-center justify-between ${isOverdue ? 'bg-red-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <IndianRupee size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    {isOverdue ? 'Payment Overdue' : 'Payment Due'}
                  </p>
                  <p className="text-xs text-white/75">
                    {isOverdue ? 'Past due — contact admin immediately' : 'Installment payment pending'}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${isOverdue ? 'bg-white/20 text-white' : 'bg-white/30 text-white'}`}>
                {isOverdue ? 'OVERDUE' : 'PENDING'}
              </span>
            </div>

            {/* Body */}
            <div className={`${isOverdue ? 'bg-red-50' : 'bg-amber-50'} px-5 py-4`}>
              <div className="flex items-start justify-between gap-4">
                {/* Amount + due */}
                <div>
                  <p className={`text-4xl font-black tracking-tight ${isOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                    ₹{user.installmentAmount.toLocaleString('en-IN')}
                  </p>
                  {user.installmentDueDate && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CalendarClock size={13} className={isOverdue ? 'text-red-400' : 'text-amber-400'} />
                      <span className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-amber-700'}`}>
                        {isOverdue
                          ? `Was due ${istDate(user.installmentDueDate)}`
                          : daysUntilDue === 0 ? 'Due today!'
                          : daysUntilDue === 1 ? 'Due tomorrow'
                          : `Due in ${daysUntilDue} days · ${istDate(user.installmentDueDate)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider + course + contact */}
              <div className={`mt-4 pt-4 border-t ${isOverdue ? 'border-red-200' : 'border-amber-200'} space-y-2`}>
                {linkedCourseTitle && (
                  <div className="flex items-center gap-2">
                    <BookOpen size={13} className={isOverdue ? 'text-red-400' : 'text-amber-400'} />
                    <span className={`text-xs font-semibold ${isOverdue ? 'text-red-700' : 'text-amber-800'}`}>
                      {linkedCourseTitle}
                    </span>
                  </div>
                )}
                <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>
                  Contact your admin to process this payment and clear your dues.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Course Payment Schedules ── */}
      {courseInstallments.length > 0 && (() => {
        const byCourse = courseInstallments.reduce((acc, ci) => {
          const key = ci.course._id;
          if (!acc[key]) acc[key] = { title: ci.course.title, items: [] };
          acc[key].items.push(ci);
          return acc;
        }, {} as Record<string, { title: string; items: CourseInstallment[] }>);

        return (
          <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <IndianRupee size={15} className="text-violet-500" />
              <h2 className="font-bold text-slate-800">Course Payment Schedule</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {Object.values(byCourse).map(({ title, items }) => {
                const paid = items.filter(i => i.status === 'paid').length;
                const sym = items[0]?.currency === 'USD' ? '$' : items[0]?.currency === 'EUR' ? '€' : '₹';
                return (
                  <div key={title} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-800">{title}</p>
                      <span className="text-xs text-slate-400">{paid}/{items.length} paid</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {items.map(ci => {
                        const overdue = ci.status !== 'paid' && new Date(ci.dueDate) < new Date();
                        return (
                          <div key={ci._id} className={`rounded-xl p-3 border text-center ${
                            ci.status === 'paid' ? 'bg-green-50 border-green-200' :
                            overdue ? 'bg-red-50 border-red-200' :
                            'bg-slate-50 border-slate-200'
                          }`}>
                            <p className="text-[10px] font-black text-slate-400 mb-1">Month {ci.installmentNumber}</p>
                            <p className={`text-sm font-black ${ci.status === 'paid' ? 'text-green-700' : overdue ? 'text-red-700' : 'text-slate-700'}`}>
                              {sym}{ci.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {ci.status === 'paid' ? `Paid ${ci.paidAt ? istDate(ci.paidAt) : ''}` : istDate(ci.dueDate)}
                            </p>
                            <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                              ci.status === 'paid' ? 'bg-green-200 text-green-700' :
                              overdue ? 'bg-red-200 text-red-700' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                              {ci.status === 'paid' ? 'Paid' : overdue ? 'Overdue' : 'Pending'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Avatar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-indigo-100 flex items-center justify-center border-4 border-white shadow-md">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : <span className="text-4xl font-bold text-indigo-600">{user.name.charAt(0).toUpperCase()}</span>}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 disabled:opacity-60">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
            </div>
            {editing
              ? <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="text-center text-lg font-bold text-slate-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent w-full" autoFocus />
              : <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
            }
            <span className="mt-1 inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 capitalize">{user.role}</span>

            <div className="mt-4 space-y-2">
              {editing ? (
                <>
                  <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setEditing(false)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs text-slate-600 hover:bg-slate-50"><X size={11} /> Cancel</button>
                    <button onClick={saveProfile} disabled={saving} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60">
                      {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-slate-600 hover:text-indigo-600 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <Pencil size={11} /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-slate-600"><Mail size={14} className="text-slate-400 flex-shrink-0" /><span className="truncate text-xs">{user.email}</span></div>
            {user.phone && <div className="flex items-center gap-2.5 text-sm text-slate-600"><Phone size={14} className="text-slate-400 flex-shrink-0" /><span className="text-xs">{user.phone}</span></div>}
            <div className="flex items-center gap-2.5 text-sm text-slate-600"><CalendarDays size={14} className="text-slate-400 flex-shrink-0" /><span className="text-xs">Joined {istDate(user.createdAt)}</span></div>
          </div>

          {/* Subscription */}
          <div className={`rounded-xl border shadow-sm p-4 ${isExpired ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={15} className={isExpired ? 'text-red-500' : 'text-green-500'} />
              <span className="text-sm font-semibold text-slate-700">Subscription</span>
            </div>
            {user.subscriptionExpiry ? (
              <>
                <p className={`text-sm font-bold ${isExpired ? 'text-red-700' : 'text-slate-800'}`}>{isExpired ? 'Expired' : 'Active'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{isExpired ? 'Expired' : 'Until'} {istDate(user.subscriptionExpiry)}</p>
                {!isExpired && daysLeft !== null && (
                  <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-lg w-fit ${daysLeft <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {daysLeft}d remaining
                  </div>
                )}
              </>
            ) : <p className="text-sm text-slate-500">No expiry set</p>}
            {user.subscriptionType && (
              <span className="inline-block mt-1.5 text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium capitalize">
                {user.subscriptionType.replace('month', ' month').replace('year', ' year')} plan
              </span>
            )}
          </div>
        </div>

        {/* Right 3 columns */}
        <div className="lg:col-span-3 space-y-5">

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: <BookOpen size={18} className="text-indigo-500" />, val: enrollments.length, label: 'Courses', color: 'text-indigo-600' },
              { icon: <Award size={18} className="text-amber-500" />, val: attendancePct !== null ? `${attendancePct}%` : '—', label: 'Attendance', color: attendancePct !== null && attendancePct >= 75 ? 'text-green-600' : attendancePct !== null && attendancePct >= 50 ? 'text-amber-600' : 'text-red-600' },
              { icon: <TrendingUp size={18} className="text-sky-500" />, val: total, label: 'Sessions Tracked', color: 'text-sky-600' },
            ].map(({ icon, val, label, color }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
                <div className="flex justify-center mb-2">{icon}</div>
                <p className={`text-xl font-bold ${color}`}>{val}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Enrolled courses */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <BookOpen size={15} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-800">Enrolled Courses</h3>
            </div>
            {enrollments.length === 0
              ? <div className="p-8 text-center text-sm text-slate-400">No courses yet.</div>
              : (
                <div className="divide-y divide-slate-100">
                  {enrollments.map(e => (
                    <Link key={e._id} href={`/student/courses/${e.course._id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                      {e.course.bannerImage
                        ? <img src={e.course.bannerImage} alt={e.course.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        : <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"><BookOpen size={16} className="text-indigo-400" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700 truncate">{e.course.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            }
          </div>

          {/* Attendance log */}
          {attendance.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Clock size={15} className="text-amber-500" /> Attendance History
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-700"><CheckCircle2 size={11} />{present}</span>
                  <span className="flex items-center gap-1 text-amber-600"><Clock size={11} />{late}</span>
                  <span className="flex items-center gap-1 text-red-600"><XCircle size={11} />{absent}</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {attendance.map(a => (
                  <div key={a._id} className="px-5 py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{a.session?.title ?? 'Session'}</p>
                      <p className="text-xs text-slate-400">{a.session?.scheduledAt ? istDateTime(a.session.scheduledAt) : '—'}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
