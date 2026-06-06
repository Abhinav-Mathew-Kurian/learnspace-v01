'use client';

import { useEffect, useState } from 'react';
import dynamic_import from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { addMinutes } from 'date-fns';
import type { CalendarEvent } from '@/components/shared/CalendarView';

const CalendarView = dynamic_import(() => import('@/components/shared/CalendarView'), {
  ssr: false,
  loading: () => (
    <div className="h-[640px] bg-white rounded-xl border border-slate-200 flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
    </div>
  ),
});

interface LiveSession {
  _id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  status: string;
  course: { title: string };
  batch: { name: string };
}

interface VideoRelease {
  _id: string;
  title: string;
  releaseDate: string;
  course: { title: string };
}

interface EventDoc {
  _id: string;
  title: string;
  type: 'offline_class' | 'webinar' | 'live_session' | 'video_release';
  date: string;
  endDate: string | null;
  description: string;
  location: string | null;
  meetLink: string | null;
}

export default function TeacherCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [lRes, vRes, eRes] = await Promise.all([
        fetch('/api/live'),
        fetch('/api/courses'),
        fetch('/api/events'),
      ]);
      const [ld, cd, ed] = await Promise.all([lRes.json(), vRes.json(), eRes.json()]);

      const calEvents: CalendarEvent[] = [];

      if (ld.success) {
        (ld.data as LiveSession[]).forEach((s) => {
          const start = new Date(s.scheduledAt);
          calEvents.push({
            id: s._id,
            title: `${s.batch?.name ?? 'Batch'}: ${s.title}`,
            start,
            end: addMinutes(start, s.duration),
            type: 'live_session',
            resource: { status: s.status, course: s.course?.title },
          });
        });
      }

      if (cd.success) {
        for (const course of cd.data) {
          const vRes2 = await fetch(`/api/courses/${course._id}/videos`);
          const vd = await vRes2.json();
          if (vd.success) {
            (vd.data as VideoRelease[]).forEach((v) => {
              if (v.releaseDate) {
                const d = new Date(v.releaseDate);
                calEvents.push({
                  id: v._id,
                  title: `📹 ${v.title}`,
                  start: d,
                  end: new Date(d.getTime() + 30 * 60000),
                  type: 'video_release',
                  resource: { course: course.title },
                });
              }
            });
          }
        }
      }

      if (ed.success) {
        (ed.data as EventDoc[]).forEach((ev) => {
          const start = new Date(ev.date);
          const end = ev.endDate ? new Date(ev.endDate) : new Date(start.getTime() + 60 * 60000);
          calEvents.push({
            id: ev._id,
            title: ev.title,
            start,
            end,
            type: ev.type,
            resource: { description: ev.description, location: ev.location, meetLink: ev.meetLink },
          });
        });
      }

      setEvents(calEvents);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Teaching Calendar</h1>
        <p className="text-sm text-slate-500 mt-0.5">All your live sessions and video releases in one view</p>
      </div>

      {loading ? (
        <div className="h-[640px] bg-white rounded-xl border border-slate-200 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <CalendarView events={events} onSelectEvent={setSelected} />
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-3 h-3 rounded-full ${selected.type === 'live_session' ? 'bg-indigo-500' : selected.type === 'video_release' ? 'bg-sky-500' : 'bg-amber-500'}`} />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{selected.type.replace('_', ' ')}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{selected.title}</h3>
            <p className="text-sm text-slate-500 mb-4">
              {selected.start.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}
              {selected.start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {selected.resource && (
              <div className="text-xs text-slate-400 space-y-1">
                {Object.entries(selected.resource).map(([k, v]) => (
                  <p key={k}><span className="font-medium capitalize text-slate-500">{k}:</span> {String(v)}</p>
                ))}
              </div>
            )}
            <button onClick={() => setSelected(null)} className="mt-4 w-full py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
