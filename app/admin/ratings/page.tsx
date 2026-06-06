'use client';

import { useEffect, useState } from 'react';
import { Star, CheckCircle2, XCircle } from 'lucide-react';
import Pagination from '@/components/shared/Pagination';

const PAGE_SIZE = 10;

interface Rating {
  _id: string;
  name: string;
  email?: string;
  rating: number;
  comment: string;
  role?: string;
  isApproved: boolean;
  createdAt: string;
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          className={s <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
  );
}

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [page, setPage] = useState(1);

  const fetchRatings = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/ratings');
    const data = await res.json();
    if (data.success) setRatings(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchRatings(); }, []);

  const toggleApproval = async (id: string, isApproved: boolean) => {
    const res = await fetch('/api/admin/ratings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isApproved }),
    });
    const data = await res.json();
    if (data.success) {
      setRatings((prev) => prev.map((r) => r._id === id ? { ...r, isApproved } : r));
    }
  };

  const filtered = ratings.filter((r) => {
    if (filter === 'pending') return !r.isApproved;
    if (filter === 'approved') return r.isApproved;
    return true;
  });

  const pendingCount = ratings.filter((r) => !r.isApproved).length;

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
          <Star size={18} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Ratings
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400">{ratings.length} total ratings</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'pending', 'approved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200">
          <Star size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No {filter !== 'all' ? filter : ''} ratings</p>
        </div>
      ) : (
        <>
        <div className="space-y-3">
          {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
            <div
              key={r._id}
              className={`bg-white rounded-xl border p-4 transition-colors ${
                r.isApproved ? 'border-emerald-200' : 'border-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{r.name}</span>
                    {r.role && <span className="text-xs text-slate-400">{r.role}</span>}
                    <StarDisplay value={r.rating} />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.isApproved
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {r.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  {r.email && <p className="text-xs text-slate-400 mb-1">{r.email}</p>}
                  <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(r.createdAt).toLocaleDateString('en-IN', {
                      timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {!r.isApproved ? (
                    <button
                      onClick={() => toggleApproval(r._id, true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-colors"
                    >
                      <CheckCircle2 size={13} /> Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleApproval(r._id, false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white rounded-xl border border-slate-200">
          <Pagination currentPage={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
        </>
      )}
    </div>
  );
}
