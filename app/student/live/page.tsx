'use client';

import { useEffect, useState, useCallback } from 'react';
import { Radio, CalendarDays, Clock, ExternalLink, Loader2, Lock, ChevronDown, ChevronUp, CheckCircle2, BookOpen, RefreshCw, Search } from 'lucide-react';
import Pagination from '@/components/shared/Pagination';

const ENDED_PAGE_SIZE = 10;
import { toast } from 'sonner';
import LiveIndicator from '@/components/shared/LiveIndicator';
import { addMinutes, isPast, isWithinInterval, formatDistanceToNow, isFuture } from 'date-fns';
import { istDate, istTime } from '@/lib/ist';

interface LiveSession {
  _id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'live' | 'ended';
  recordingUrl?: string | null;
  batch: { _id: string; name: string };
  course: { _id: string; title: string; bannerImage?: string };
  teacher: { name: string; avatar?: string };
}

type DisplayStatus = 'live' | 'upcoming' | 'ended';

const getStatus = (s: LiveSession): DisplayStatus => {
  if (s.status === 'live') return 'live';
  if (s.status === 'ended') return 'ended';
  const start = new Date(s.scheduledAt);
  const end = addMinutes(start, s.duration);
  if (isWithinInterval(new Date(), { start, end })) return 'live';
  if (isPast(end)) return 'ended';
  return 'upcoming';
};

export default function StudentLivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [meetInfo, setMeetInfo] = useState<Record<string, { meetLink: string; meetPassword: string | null }>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [endedSearch, setEndedSearch] = useState('');
  const [endedPage, setEndedPage] = useState(1);

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/live');
    const data = await res.json();
    if (data.success) setSessions(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
    // Re-fetch every 60s to pick up status changes
    const refetch = setInterval(fetchSessions, 60_000);
    // Tick every 30s to update countdowns
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => { clearInterval(refetch); clearInterval(tick); };
  }, [fetchSessions]);

  const join = async (sessionId: string) => {
    if (meetInfo[sessionId]) {
      setExpanded((e) => e === sessionId ? null : sessionId);
      return;
    }
    setJoining(sessionId);
    const res = await fetch(`/api/live/${sessionId}/join`);
    const data = await res.json();
    setJoining(null);
    if (data.success) {
      setMeetInfo((prev) => ({ ...prev, [sessionId]: data.data }));
      setExpanded(sessionId);
    } else {
      toast.error(data.error ?? 'Could not retrieve join link.');
    }
  };

  const live = sessions.filter((s) => getStatus(s) === 'live');
  const upcoming = sessions.filter((s) => getStatus(s) === 'upcoming').sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  const ended = sessions.filter((s) => getStatus(s) === 'ended');
  const filteredEnded = ended.filter((s) => {
    if (!endedSearch.trim()) return true;
    const q = endedSearch.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.course?.title.toLowerCase().includes(q) || s.batch?.name.toLowerCase().includes(q);
  });
  const endedTotalPages = Math.ceil(filteredEnded.length / ENDED_PAGE_SIZE);
  const pagedEnded = filteredEnded.slice((endedPage - 1) * ENDED_PAGE_SIZE, endedPage * ENDED_PAGE_SIZE);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Classes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your scheduled and active live sessions</p>
        </div>
        <button onClick={fetchSessions} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {sessions.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-16 flex flex-col items-center text-center">
          <Radio size={40} className="text-slate-300 mb-4" />
          <p className="font-semibold text-slate-700 mb-1">No live classes yet</p>
          <p className="text-sm text-slate-400">Your teacher hasn&apos;t scheduled any live sessions for your batch.</p>
        </div>
      )}

      {/* Live Now */}
      {live.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <LiveIndicator size="md" />
            <span className="font-semibold text-slate-800">Happening Now</span>
          </div>
          <div className="space-y-3">
            {live.map((s) => (
              <SessionCard key={s._id} session={s} status="live" onJoin={join}
                joining={joining === s._id} meetInfo={meetInfo[s._id]} expanded={expanded === s._id} now={now} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-indigo-500" /> Upcoming Sessions
            <span className="text-sm font-normal text-slate-400 ml-1">({upcoming.length})</span>
          </h2>
          <div className="space-y-3">
            {upcoming.map((s) => (
              <SessionCard key={s._id} session={s} status="upcoming" onJoin={join}
                joining={joining === s._id} meetInfo={meetInfo[s._id]} expanded={expanded === s._id} now={now} />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {ended.length > 0 && (
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-slate-400" /> Past Sessions
              <span className="text-sm font-normal text-slate-400">
                ({filteredEnded.length}{filteredEnded.length !== ended.length ? ` of ${ended.length}` : ''})
              </span>
            </h2>
            <div className="relative self-start sm:self-auto">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={endedSearch}
                onChange={(e) => { setEndedSearch(e.target.value); setEndedPage(1); }}
                placeholder="Search past sessions…"
                className="pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
              />
            </div>
          </div>
          <div className="space-y-2">
            {pagedEnded.map((s) => (
              <SessionCard key={s._id} session={s} status="ended" onJoin={join}
                joining={false} meetInfo={undefined} expanded={false} now={now} />
            ))}
          </div>
          {endedTotalPages > 1 && (
            <div className="mt-3 bg-white rounded-xl border border-slate-200">
              <Pagination currentPage={endedPage} totalPages={endedTotalPages} totalItems={filteredEnded.length} pageSize={ENDED_PAGE_SIZE} onPageChange={setEndedPage} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

interface CardProps {
  session: LiveSession;
  status: DisplayStatus;
  onJoin: (id: string) => void;
  joining: boolean;
  meetInfo?: { meetLink: string; meetPassword: string | null };
  expanded: boolean;
  now: Date;
}

function SessionCard({ session, status, onJoin, joining, meetInfo, expanded, now }: CardProps) {
  const start = new Date(session.scheduledAt);
  const isLive = status === 'live';
  const isEnded = status === 'ended';
  const isUpcoming = status === 'upcoming';
  const startsSoon = isUpcoming && (start.getTime() - now.getTime()) < 30 * 60 * 1000; // < 30 min

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
      isLive ? 'border-red-200 ring-2 ring-red-100' :
      startsSoon ? 'border-amber-200 ring-1 ring-amber-100' :
      'border-slate-200'
    }`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isLive && <LiveIndicator size="sm" />}
              {isUpcoming && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  startsSoon ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                }`}>
                  <Clock size={10} />
                  {startsSoon ? 'Starting soon' : 'Scheduled'}
                </span>
              )}
              {isEnded && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} /> Ended
                </span>
              )}
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{session.batch?.name}</span>
            </div>

            <h3 className="font-semibold text-slate-900 mb-1">{session.title}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <BookOpen size={12} className="text-slate-400" />
              {session.course?.title}
              {session.teacher?.name && <span className="text-slate-300 mx-1">·</span>}
              {session.teacher?.name && <span>{session.teacher.name}</span>}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-slate-800">{istDate(start)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{istTime(start)}</p>
            <p className="text-xs text-slate-400">{session.duration} min</p>
            {isUpcoming && isFuture(start) && (
              <p className={`text-xs font-semibold mt-1 ${startsSoon ? 'text-amber-600' : 'text-slate-400'}`}>
                {formatDistanceToNow(start, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>

        {/* Join / recording actions */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {(isLive || isUpcoming) && (
            <button
              onClick={() => onJoin(session._id)}
              disabled={joining}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 shadow-sm ${
                isLive
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse hover:animate-none'
                  : startsSoon
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {joining ? (
                <><Loader2 size={14} className="animate-spin" /> Loading…</>
              ) : meetInfo ? (
                <>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expanded ? 'Hide Link' : 'Show Join Link'}</>
              ) : (
                <><Lock size={14} /> {isLive ? 'Join Now' : 'Get Join Link'}</>
              )}
            </button>
          )}

          {isEnded && session.recordingUrl && (
            <a href={session.recordingUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
              <ExternalLink size={14} /> Watch Recording
            </a>
          )}
        </div>

        {/* Meet link reveal */}
        {expanded && meetInfo && (
          <div className={`mt-4 p-4 rounded-xl border ${isLive ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100'}`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${isLive ? 'text-red-600' : 'text-indigo-600'}`}>
              Join Information
            </p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600 font-medium">Meeting Link</span>
              <a href={meetInfo.meetLink} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors ${
                  isLive ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}>
                <ExternalLink size={13} /> Open Meet
              </a>
            </div>
            {meetInfo.meetPassword && (
              <div className="flex items-center justify-between gap-4 mt-2.5 pt-2.5 border-t border-white/50">
                <span className="text-sm text-slate-600 font-medium">Password</span>
                <code className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-mono font-bold text-slate-800 tracking-widest">
                  {meetInfo.meetPassword}
                </code>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
