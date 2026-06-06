'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { addMinutes, addHours } from 'date-fns';
import type { CalendarEvent } from '@/components/shared/CalendarView';

const CalendarView = dynamic(() => import('@/components/shared/CalendarView'), {
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

export default function StudentCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [lRes, eRes] = await Promise.all([
        fetch('/api/live'),
        fetch('/api/events'),
      ]);
      const [ld, ed] = await Promise.all([lRes.json(), eRes.json()]);

      const calEvents: CalendarEvent[] = [];

      if (ld.success) {
        (ld.data as LiveSession[]).forEach((s) => {
          const start = new Date(s.scheduledAt);
          calEvents.push({
            id: s._id,
            title: `${s.batch?.name ?? ''}: ${s.title}`,
            start,
            end: addMinutes(start, s.duration),
            type: 'live_session',
            resource: { status: s.status, course: s.course?.title },
          });
        });
      }

      if (ed.success) {
        (ed.data as EventDoc[]).forEach((ev) => {
          const start = new Date(ev.date);
          const end = ev.endDate ? new Date(ev.endDate) : addHours(start, 1);
          calEvents.push({
            id: ev._id,
            title: ev.title,
            start,
            end,
            type: ev.type,
            resource: {
              description: ev.description,
              location: ev.location,
              meetLink: ev.meetLink,
            },
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
        <h1 className="text-2xl font-bold text-slate-900">My Calendar</h1>
        <p className="text-sm text-slate-500 mt-0.5">Live classes and upcoming events</p>
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
              <span className={`w-3 h-3 rounded-full ${
                selected.type === 'live_session' ? 'bg-indigo-500' :
                selected.type === 'webinar' ? 'bg-green-500' :
                selected.type === 'offline_class' ? 'bg-amber-500' : 'bg-sky-500'
              }`} />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {selected.type.replace(/_/g, ' ')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{selected.title}</h3>
            <p className="text-sm text-slate-500 mb-3">
              {selected.start.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}
              {selected.start.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
            </p>
            {selected.resource && Object.entries(selected.resource).filter(([, v]) => v).map(([k, v]) => (
              <p key={k} className="text-xs text-slate-500 mb-1">
                <span className="font-medium text-slate-600 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>{' '}{String(v)}
              </p>
            ))}
            <button onClick={() => setSelected(null)} className="mt-4 w-full py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
