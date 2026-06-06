'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarDays, MapPin, Link2, Users, Loader2, Filter } from 'lucide-react';
import CreateEventModal from '@/components/admin/CreateEventModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { istDateTime, istTime } from '@/lib/ist';
import Pagination from '@/components/shared/Pagination';

const PAGE_SIZE = 12;

interface GuestLecturer { name: string }
interface Batch { name: string }

interface EventDoc {
  _id: string;
  title: string;
  description: string;
  type: 'offline_class' | 'webinar' | 'live_session' | 'video_release';
  date: string;
  endDate: string | null;
  audience: string;
  location: string | null;
  meetLink: string | null;
  guestLecturer: GuestLecturer | null;
  batchId: Batch | null;
}

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  offline_class:  { label: 'Offline Class',  className: 'bg-amber-100 text-amber-700'  },
  webinar:        { label: 'Webinar',        className: 'bg-green-100 text-green-700'  },
  live_session:   { label: 'Live Session',   className: 'bg-indigo-100 text-indigo-700'},
  video_release:  { label: 'Video Release',  className: 'bg-sky-100 text-sky-700'     },
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetch_ = async () => {
    setLoading(true);
    const res = await fetch('/api/events');
    const data = await res.json();
    if (data.success) setEvents(data.data);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const deleteEvent = (id: string) => setConfirmId(id);
  const handleConfirmDelete = async () => {
    if (!confirmId) return;
    setDeleting(confirmId);
    setConfirmId(null);
    await fetch(`/api/events/${confirmId}`, { method: 'DELETE' });
    setEvents((prev) => prev.filter((e) => e._id !== confirmId));
    setDeleting(null);
    toast.success('Event deleted.');
  };

  const filtered = events.filter((e) => {
    if (typeFilter && e.type !== typeFilter) return false;
    if (audienceFilter && e.audience !== audienceFilter) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage announcements, webinars and offline classes</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Create Event
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex items-center gap-3 flex-wrap">
        <Filter size={14} className="text-slate-400" />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">All Types</option>
          {Object.entries(TYPE_STYLES).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select value={audienceFilter} onChange={(e) => { setAudienceFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">All Audiences</option>
          <option value="all">Everyone</option>
          <option value="teachers">Teachers</option>
          <option value="students">Students</option>
          <option value="batch">Batch</option>
        </select>
        <span className="ml-auto text-sm text-slate-400">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-16 flex flex-col items-center text-center">
          <CalendarDays size={36} className="text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">No events yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first event to notify students and teachers.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((ev) => {
            const ts = TYPE_STYLES[ev.type] ?? TYPE_STYLES.offline_class;
            return (
              <div key={ev._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${ts.className}`}>
                        {ts.label}
                      </span>
                      <h3 className="font-semibold text-slate-900 leading-snug">{ev.title}</h3>
                    </div>
                    <button
                      onClick={() => deleteEvent(ev._id)}
                      disabled={deleting === ev._id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      {deleting === ev._id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>

                  {ev.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{ev.description}</p>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <CalendarDays size={12} className="text-slate-400 flex-shrink-0" />
                      <span>{istDateTime(ev.date)}</span>
                      {ev.endDate && <span className="text-slate-400">→ {istTime(ev.endDate)}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Users size={12} className="text-slate-400 flex-shrink-0" />
                      <span className="capitalize">{ev.audience === 'all' ? 'Everyone' : ev.audience === 'batch' ? ev.batchId?.name ?? 'Batch' : ev.audience}</span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                    {ev.meetLink && (
                      <div className="flex items-center gap-2 text-xs text-indigo-600">
                        <Link2 size={12} className="flex-shrink-0" />
                        <a href={ev.meetLink} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                          Join Link
                        </a>
                      </div>
                    )}
                    {ev.guestLecturer && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="text-slate-400">Guest:</span>
                        <span className="font-medium">{ev.guestLecturer.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 bg-white rounded-xl border border-slate-200">
          <Pagination currentPage={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
        </>
      )}

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={(ev) => { setShowCreate(false); setEvents((prev) => [ev as unknown as EventDoc, ...prev]); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete event?"
        message="This event will be removed and all enrolled users will no longer see it."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
