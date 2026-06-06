'use client';

import { useEffect, useRef, useState } from 'react';
import { istDate, istDateShort } from '@/lib/ist';
import {
  Mail, Phone, CalendarDays, Camera, Loader2, BookOpen,
  Users, Pencil, Save, X, Radio, Video, CheckCircle2, FileText,
} from 'lucide-react';

interface TeacherData {
  _id: string; name: string; email: string; phone?: string;
  avatar?: string; bio?: string; specialization?: string;
  role: string; createdAt: string;
}
interface CourseItem {
  _id: string; title: string; isPublished: boolean;
  totalVideos: number; bannerImage?: string;
}
interface SessionItem {
  _id: string; title: string; scheduledAt: string; status: string;
  batch: { name: string } | null; course: { title: string } | null;
}
interface PDFItem { _id: string; title: string; createdAt: string; course: { title: string } | null }

export default function TeacherProfilePage() {
  const [user, setUser] = useState<TeacherData | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [pdfs, setPdfs] = useState<PDFItem[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', bio: '', specialization: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const [uRes, cRes, sRes, bRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/courses'),
        fetch('/api/live?limit=5'),
        fetch('/api/batches'),
      ]);
      const [ud, cd, sd, bd] = await Promise.all([uRes.json(), cRes.json(), sRes.json(), bRes.json()]);

      if (ud.success) {
        setUser(ud.data);
        setEditForm({ name: ud.data.name, phone: ud.data.phone ?? '', bio: ud.data.bio ?? '', specialization: ud.data.specialization ?? '' });
      }
      if (cd.success) setCourses(cd.data);
      if (sd.success) setSessions(sd.data.slice(0, 5));
      if (bd.success) {
        const all = new Set<string>();
        (bd.data as Array<{ students: Array<{ _id: string }> }>).forEach(b => b.students.forEach(s => all.add(s._id)));
        setStudentCount(all.size);
      }
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
    setSaving(true); setSaveError('');
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    const data = await res.json();
    setSaving(false);
    if (data.success) { setUser(u => u ? { ...u, ...editForm } : u); setEditing(false); }
    else setSaveError(data.error ?? 'Failed to save');
  };

  if (loading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>;
  if (!user) return null;

  const published = courses.filter(c => c.isPublished).length;
  const totalVideos = courses.reduce((s, c) => s + (c.totalVideos ?? 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your teaching portfolio and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left column — identity + stats */}
        <div className="lg:col-span-1 space-y-4">
          {/* Avatar + name */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-indigo-100 flex items-center justify-center border-4 border-white shadow-md">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : <span className="text-4xl font-bold text-indigo-600">{user.name.charAt(0).toUpperCase()}</span>}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-60">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
            </div>
            {editing ? (
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="text-center text-lg font-bold text-slate-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent w-full" autoFocus />
            ) : (
              <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
            )}
            <span className="mt-1 inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 capitalize">{user.role}</span>
            {user.specialization && !editing && <p className="text-xs text-slate-500 mt-1.5">{user.specialization}</p>}
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <BookOpen size={16} className="text-indigo-500" />, val: courses.length, label: 'Courses' },
              { icon: <Video size={16} className="text-green-500" />, val: totalVideos, label: 'Videos' },
              { icon: <Users size={16} className="text-violet-500" />, val: studentCount, label: 'Students' },
              { icon: <Radio size={16} className="text-red-500" />, val: sessions.length, label: 'Sessions' },
            ].map(({ icon, val, label }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 text-center">
                <div className="flex justify-center mb-1">{icon}</div>
                <p className="text-xl font-bold text-slate-800">{val}</p>
                <p className="text-[11px] text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-slate-600"><Mail size={14} className="text-slate-400" /><span className="truncate">{user.email}</span></div>
            {(editing ? editForm.phone : user.phone) && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600"><Phone size={14} className="text-slate-400" />
                {editing ? <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone" className="border-b border-slate-200 focus:outline-none text-sm flex-1" />
                : <span>{user.phone}</span>}
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-slate-600"><CalendarDays size={14} className="text-slate-400" /><span>Joined {istDate(user.createdAt)}</span></div>
          </div>
        </div>

        {/* Right — bio, courses, sessions */}
        <div className="lg:col-span-3 space-y-5">

          {/* Bio / edit form */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">About</h3>
              {!editing
                ? <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"><Pencil size={13} /> Edit</button>
                : <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"><X size={13} /> Cancel</button>
                    <button onClick={saveProfile} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                    </button>
                  </div>
              }
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Specialization</label>
                  <input value={editForm.specialization} onChange={e => setEditForm(f => ({ ...f, specialization: e.target.value }))}
                    placeholder="e.g. Python, Web Development" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Bio</label>
                  <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    rows={4} placeholder="Tell students about yourself…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                {!user.phone && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                    <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
                {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              </div>
            ) : (
              <div>
                {user.specialization && <p className="text-sm font-semibold text-indigo-700 mb-2">{user.specialization}</p>}
                {user.bio
                  ? <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{user.bio}</p>
                  : <p className="text-sm text-slate-400 italic">No bio yet. Click Edit to add one.</p>}
              </div>
            )}
          </div>

          {/* My Courses */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><BookOpen size={15} className="text-indigo-500" /> My Courses</h3>
              <span className="text-xs text-slate-400">{published}/{courses.length} published</span>
            </div>
            {courses.length === 0
              ? <div className="p-8 text-center text-sm text-slate-400">No courses yet.</div>
              : (
                <div className="divide-y divide-slate-100">
                  {courses.map(c => (
                    <div key={c._id} className="px-5 py-3 flex items-center gap-3">
                      {c.bannerImage
                        ? <img src={c.bannerImage} alt={c.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        : <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"><BookOpen size={16} className="text-indigo-400" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                        <p className="text-xs text-slate-400">{c.totalVideos} video{c.totalVideos !== 1 ? 's' : ''}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${c.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {c.isPublished ? 'Live' : 'Draft'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Recent Live Sessions */}
          {sessions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Radio size={15} className="text-red-500" /> Recent Live Sessions</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {(sessions as Array<{ _id: string; title: string; scheduledAt: string; status: string; batch: { name: string } | null; course: { title: string } | null }>).map(s => (
                  <div key={s._id} className="px-5 py-3 flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === 'live' ? 'bg-red-500 animate-pulse' : s.status === 'ended' ? 'bg-slate-300' : 'bg-sky-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.title}</p>
                      <p className="text-xs text-slate-400">{s.batch?.name} · {s.course?.title}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">{istDateShort(s.scheduledAt)}</p>
                      <span className={`text-[11px] font-semibold ${s.status === 'live' ? 'text-red-600' : s.status === 'ended' ? 'text-slate-400' : 'text-sky-600'}`}>
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </span>
                    </div>
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
