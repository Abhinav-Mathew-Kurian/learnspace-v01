'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Radio, Clock, Users, CalendarDays, ChevronRight, CheckCircle2, Settings2, Loader2, Play, Square } from 'lucide-react';
import LiveIndicator from '@/components/shared/LiveIndicator';
import CreateBatchModal from '@/components/teacher/CreateBatchModal';
import ScheduleLiveModal from '@/components/teacher/ScheduleLiveModal';
import AttendanceModal from '@/components/teacher/AttendanceModal';
import ManageBatchStudentsModal from '@/components/teacher/ManageBatchStudentsModal';
import { isPast, isFuture, isWithinInterval, addMinutes } from 'date-fns';
import { istDate, istTime } from '@/lib/ist';

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface Batch {
  _id: string;
  name: string;
  schedule: string;
  isActive: boolean;
  course: { _id: string; title: string; bannerImage?: string };
  students: Student[];
}

interface LiveSession {
  _id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'live' | 'ended';
  meetLink?: string;
  meetPassword?: string | null;
  recordingUrl?: string | null;
  batch: { _id: string; name: string; students: Student[] };
  course: { _id: string; title: string };
}

interface AttendanceRecord {
  student: { _id: string };
  status: 'present' | 'absent' | 'late';
}

const statusLabel = (s: LiveSession) => {
  if (s.status === 'live') return 'live';
  if (s.status === 'ended') return 'ended';
  const start = new Date(s.scheduledAt);
  const end = addMinutes(start, s.duration);
  if (isWithinInterval(new Date(), { start, end })) return 'live';
  if (isPast(end)) return 'ended';
  return 'scheduled';
};

export default function TeacherLivePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'sessions' | 'batches'>('sessions');

  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [attendanceState, setAttendanceState] = useState<{ session: LiveSession; existing: AttendanceRecord[] } | null>(null);
  const [managingBatch, setManagingBatch] = useState<Batch | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ _id: string; title: string }[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [bRes, sRes, cRes] = await Promise.all([
      fetch('/api/batches'),
      fetch('/api/live'),
      fetch('/api/courses'),
    ]);
    const [bd, sd, cd] = await Promise.all([bRes.json(), sRes.json(), cRes.json()]);
    if (bd.success) setBatches(bd.data);
    if (sd.success) setSessions(sd.data);
    if (cd.success) setCourses(cd.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAttendance = async (session: LiveSession) => {
    // Fetch attendance records + batch with populated students in parallel
    const [aRes, bRes] = await Promise.all([
      fetch(`/api/attendance?sessionId=${session._id}`),
      fetch(`/api/batches/${session.batch._id}`),
    ]);
    const [aData, bData] = await Promise.all([aRes.json(), bRes.json()]);

    // Merge populated students from the batch response into the session
    const populatedStudents: Student[] = bData.success ? bData.data.students : [];
    const enrichedSession: LiveSession = {
      ...session,
      batch: { ...session.batch, students: populatedStudents },
    };

    setAttendanceState({ session: enrichedSession, existing: aData.success ? aData.data : [] });
  };

  const updateStatus = async (sessionId: string, status: 'scheduled' | 'live' | 'ended') => {
    setUpdatingStatus(sessionId);
    await fetch(`/api/live/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSessions((prev) => prev.map((s) => s._id === sessionId ? { ...s, status } : s));
    setUpdatingStatus(null);
  };

  const live = sessions.filter((s) => statusLabel(s) === 'live');
  const upcoming = sessions.filter((s) => statusLabel(s) === 'scheduled');
  const ended = sessions.filter((s) => statusLabel(s) === 'ended');

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Classes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your live sessions and student batches</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateBatch(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Users size={15} /> New Batch
          </button>
          <button
            onClick={() => setShowSchedule(true)}
            disabled={batches.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus size={15} /> Schedule Class
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-indigo-600">{batches.length}</p>
          <p className="text-sm text-slate-500 mt-0.5">Active Batches</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-red-500">{live.length}</p>
          <p className="text-sm text-slate-500 mt-0.5">Live Now</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-sky-600">{upcoming.length}</p>
          <p className="text-sm text-slate-500 mt-0.5">Upcoming</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-600">{ended.length}</p>
          <p className="text-sm text-slate-500 mt-0.5">Completed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
        {(['sessions', 'batches'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'sessions' ? 'Sessions' : 'Batches'}
            <span className="ml-2 text-xs font-bold text-indigo-600">
              {t === 'sessions' ? sessions.length : batches.length}
            </span>
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        <div className="space-y-6">
          {/* Live now */}
          {live.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-3">
                <LiveIndicator size="sm" />
                <span className="text-sm font-semibold text-slate-700">Happening Now</span>
              </div>
              <div className="space-y-3">
                {live.map((s) => <SessionCard key={s._id} session={s} status="live" onAttendance={openAttendance} onStatusChange={updateStatus} updating={updatingStatus === s._id} />)}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <CalendarDays size={15} className="text-indigo-500" /> Upcoming Sessions
              </h3>
              <div className="space-y-3">
                {upcoming.map((s) => <SessionCard key={s._id} session={s} status="scheduled" onAttendance={openAttendance} onStatusChange={updateStatus} updating={updatingStatus === s._id} />)}
              </div>
            </section>
          )}

          {/* Ended */}
          {ended.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-slate-400" /> Past Sessions
              </h3>
              <div className="space-y-3">
                {ended.slice(0, 10).map((s) => <SessionCard key={s._id} session={s} status="ended" onAttendance={openAttendance} onStatusChange={updateStatus} updating={updatingStatus === s._id} />)}
              </div>
            </section>
          )}

          {sessions.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 flex flex-col items-center text-center">
              <Radio size={36} className="text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700 mb-1">No sessions yet</p>
              <p className="text-sm text-slate-400 mb-4">Create a batch first, then schedule your first live class.</p>
              <button
                onClick={() => setShowSchedule(true)}
                disabled={batches.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Plus size={15} /> Schedule First Class
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'batches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {batches.map((b) => (
            <div key={b._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{b.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{b.course?.title}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ml-2 flex-shrink-0 ${
                    b.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {b.schedule && (
                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" /> {b.schedule}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users size={13} className="text-slate-400" />
                  <span>{b.students.length} student{b.students.length !== 1 ? 's' : ''}</span>
                </div>

                {b.students.length > 0 && (
                  <div className="flex -space-x-1.5 mt-3">
                    {b.students.slice(0, 5).map((s) => (
                      <div key={s._id} title={s.name} className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center">
                        <span className="text-[11px] font-bold text-indigo-700">{s.name.charAt(0).toUpperCase()}</span>
                      </div>
                    ))}
                    {b.students.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                        <span className="text-[10px] font-bold text-slate-500">+{b.students.length - 5}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex gap-2">
                <button
                  onClick={() => setManagingBatch(b)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <Settings2 size={13} /> Manage Students
                </button>
              </div>
            </div>
          ))}

          {batches.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-12 flex flex-col items-center text-center">
              <Users size={36} className="text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700 mb-1">No batches yet</p>
              <p className="text-sm text-slate-400 mb-4">Create a batch to group students for live classes.</p>
              <button
                onClick={() => setShowCreateBatch(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Plus size={15} /> Create First Batch
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateBatch && (
        <CreateBatchModal
          courses={courses}
          onClose={() => setShowCreateBatch(false)}
          onCreated={() => { setShowCreateBatch(false); fetchAll(); }}
        />
      )}
      {showSchedule && (
        <ScheduleLiveModal
          batches={batches}
          onClose={() => setShowSchedule(false)}
          onCreated={() => { setShowSchedule(false); fetchAll(); }}
        />
      )}
      {attendanceState && (
        <AttendanceModal
          sessionId={attendanceState.session._id}
          sessionTitle={attendanceState.session.title}
          students={attendanceState.session.batch?.students ?? []}
          existing={attendanceState.existing}
          onClose={() => setAttendanceState(null)}
          onSaved={() => { setAttendanceState(null); }}
        />
      )}
      {managingBatch && (
        <ManageBatchStudentsModal
          batchId={managingBatch._id}
          batchName={managingBatch.name}
          currentStudentIds={managingBatch.students.map((s) => s._id)}
          onClose={() => setManagingBatch(null)}
          onSaved={() => { setManagingBatch(null); fetchAll(); }}
        />
      )}
    </div>
  );
}

interface SessionCardProps {
  session: LiveSession;
  status: 'live' | 'scheduled' | 'ended';
  onAttendance: (s: LiveSession) => void;
  onStatusChange: (id: string, status: 'scheduled' | 'live' | 'ended') => void;
  updating: boolean;
}

function SessionCard({ session, status, onAttendance, onStatusChange, updating }: SessionCardProps) {
  const start = new Date(session.scheduledAt);

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
      status === 'live' ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {status === 'live' && <LiveIndicator size="sm" />}
              {status === 'scheduled' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  <CalendarDays size={10} /> Scheduled
                </span>
              )}
              {status === 'ended' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} /> Ended
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 truncate">{session.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{session.course?.title} · {session.batch?.name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-slate-800">{istDate(start)}</p>
            <p className="text-xs text-slate-400">{istTime(start)} · {session.duration} min</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users size={13} className="text-slate-400" />
            {session.batch?.students?.length ?? 0} students
          </span>
          {session.meetLink && status !== 'ended' && (
            <a
              href={session.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <ChevronRight size={13} /> Open Meet
            </a>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2 flex-wrap">
        {status === 'scheduled' && (
          <button
            onClick={() => onStatusChange(session._id, 'live')}
            disabled={updating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {updating ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Go Live
          </button>
        )}
        {status === 'live' && (
          <button
            onClick={() => onStatusChange(session._id, 'ended')}
            disabled={updating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {updating ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />} End Session
          </button>
        )}
        {(status === 'live' || status === 'ended') && (
          <button
            onClick={() => onAttendance(session)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            <CheckCircle2 size={12} /> Mark Attendance
          </button>
        )}
      </div>
    </div>
  );
}
