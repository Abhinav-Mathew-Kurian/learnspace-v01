'use client';

import { Calendar, dateFnsLocalizer, Views, Event as RBCEvent, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { useState } from 'react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
});

export type CalendarEvent = RBCEvent & {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'live_session' | 'video_release' | 'offline_class' | 'webinar' | 'general';
  resource?: Record<string, unknown>;
};

const TYPE_COLORS: Record<CalendarEvent['type'], string> = {
  live_session: '#6366f1',
  video_release: '#0ea5e9',
  offline_class: '#f59e0b',
  webinar: '#22c55e',
  general: '#64748b',
};

interface Props {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
}

export default function CalendarView({ events, onSelectEvent }: Props) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());

  const eventStyleGetter = (event: CalendarEvent) => {
    const bg = TYPE_COLORS[event.type] ?? '#6366f1';
    return {
      style: {
        backgroundColor: bg,
        borderColor: bg,
        color: '#fff',
        borderRadius: '6px',
        border: 'none',
        fontSize: '12px',
        fontWeight: 600,
        padding: '2px 6px',
      },
    };
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        ))}
      </div>

      <div style={{ height: 580 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onView={(v) => setView(v)}
          onNavigate={(d) => setDate(d)}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={onSelectEvent}
          popup
          style={{ fontFamily: 'inherit' }}
        />
      </div>
    </div>
  );
}
