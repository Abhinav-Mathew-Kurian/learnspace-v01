'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Users, Eye, EyeOff, Tag, Search } from 'lucide-react';
import EnrollmentModal from '@/components/admin/EnrollmentModal';
import SetPriceModal from '@/components/admin/SetPriceModal';
import Pagination from '@/components/shared/Pagination';

const PAGE_SIZE = 10;

interface Course {
  _id: string;
  title: string;
  category: string;
  totalVideos: number;
  isPublished: boolean;
  bannerImage: string;
  teacher: { name: string };
  pricingType?: 'free' | 'lifetime' | 'installment';
  price?: number;
  originalPrice?: number | null;
  installmentMonths?: number | null;
  currency?: string;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrollCourseTitle, setEnrollCourseTitle] = useState('');
  const [priceCourse, setPriceCourse] = useState<Course | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/courses');
    const data = await res.json();
    if (data.success) setCourses(data.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function togglePublish(id: string, current: boolean) {
    await fetch(`/api/courses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !current }),
    });
    load();
  }

  const filtered = courses.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.teacher?.name || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q)
    );
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedCourses = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {courses.length} total</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title, teacher, category…"
            className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        search.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No courses match &quot;{search}&quot;</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={36} className="text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No courses yet. Teachers can create courses from their dashboard.</p>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {pagedCourses.map((c) => (
              <div key={c._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {c.bannerImage ? (
                  <img src={c.bannerImage} alt={c.title} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center">
                    <BookOpen size={32} className="text-indigo-300" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">{c.title}</h3>
                    <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {c.isPublished ? 'Live' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">by {c.teacher?.name}</p>
                  <p className="text-xs text-slate-400 mb-4">
                    {c.totalVideos} video{c.totalVideos !== 1 ? 's' : ''}
                    {c.category && ` · ${c.category}`}
                  </p>
                  <div className="mb-3">
                    {(!c.pricingType || c.pricingType === 'free') ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span>
                    ) : c.pricingType === 'installment' ? (
                      <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                        {c.currency === 'USD' ? '$' : c.currency === 'EUR' ? '€' : '₹'}{(c.price ?? 0).toLocaleString('en-IN')}/mo × {c.installmentMonths ?? 1}m
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {c.currency === 'USD' ? '$' : c.currency === 'EUR' ? '€' : '₹'}{(c.price ?? 0).toLocaleString('en-IN')} lifetime
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEnrollCourseId(c._id); setEnrollCourseTitle(c.title); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <Users size={12} /> Enroll
                    </button>
                    <button
                      onClick={() => setPriceCourse(c)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                      title="Set Price"
                    >
                      <Tag size={12} />
                    </button>
                    <button
                      onClick={() => togglePublish(c._id, c.isPublished)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                      title={c.isPublished ? 'Unpublish' : 'Publish'}
                    >
                      {c.isPublished ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 bg-white rounded-xl border border-slate-200">
              <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {enrollCourseId && (
        <EnrollmentModal
          courseId={enrollCourseId}
          courseTitle={enrollCourseTitle}
          onClose={() => setEnrollCourseId('')}
        />
      )}
      {priceCourse && (
        <SetPriceModal
          courseId={priceCourse._id}
          courseTitle={priceCourse.title}
          initialPricingType={priceCourse.pricingType}
          initialPrice={priceCourse.price}
          initialOriginalPrice={priceCourse.originalPrice}
          initialInstallmentMonths={priceCourse.installmentMonths}
          initialCurrency={priceCourse.currency}
          onClose={() => setPriceCourse(null)}
          onSaved={() => { setPriceCourse(null); load(); }}
        />
      )}
    </div>
  );
}
