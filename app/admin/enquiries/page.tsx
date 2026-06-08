'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, CheckCircle2, Mail, Phone, Clock } from 'lucide-react';
import Pagination from '@/components/shared/Pagination';

const PAGE_SIZE = 10;

interface Enquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchEnquiries = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/enquiries');
    const data = await res.json();
    if (data.success) setEnquiries(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchEnquiries(); }, []);

  const markRead = async (id: string) => {
    // Check if it was unread before updating — only fire the event if it was new
    const wasUnread = enquiries.find((e) => e._id === id && !e.isRead);
    setEnquiries((prev) => prev.map((e) => e._id === id ? { ...e, isRead: true } : e));
    await fetch(`/api/admin/enquiries/${id}`, { method: 'PATCH' });
    if (wasUnread) window.dispatchEvent(new Event('enquiry-read'));
  };

  const unreadCount = enquiries.filter((e) => !e.isRead).length;

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
          <MessageCircle size={18} className="text-sky-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Enquiries
            {unreadCount > 0 && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400">{enquiries.length} total enquiries</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : enquiries.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200">
          <MessageCircle size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No enquiries yet</p>
        </div>
      ) : (
        <>
        <div className="space-y-3">
          {enquiries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((e) => (
            <div
              key={e._id}
              className={`bg-white rounded-xl border transition-colors ${
                !e.isRead ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'
              }`}
            >
              <button
                onClick={() => {
                  setExpanded(expanded === e._id ? null : e._id);
                  if (!e.isRead) markRead(e._id);
                }}
                className="w-full text-left px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!e.isRead ? 'bg-indigo-500' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{e.name}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Mail size={11} /> {e.email}
                      </span>
                      {e.phone && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone size={11} /> {e.phone}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">{e.subject}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(e.createdAt).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {e.isRead && (
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-1" />
                  )}
                </div>
              </button>

              {expanded === e._id && (
                <div className="px-9 pb-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{e.message}</p>
                  </div>
                  <a
                    href={`mailto:${e.email}?subject=Re: ${encodeURIComponent(e.subject)}`}
                    className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    <Mail size={12} /> Reply via Email
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white rounded-xl border border-slate-200">
          <Pagination currentPage={page} totalPages={Math.ceil(enquiries.length / PAGE_SIZE)} totalItems={enquiries.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
        </>
      )}
    </div>
  );
}
