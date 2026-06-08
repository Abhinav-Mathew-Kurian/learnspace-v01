'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Eye, EyeOff, Video, Pencil, Search } from 'lucide-react';
import CreateCourseModal from '@/components/teacher/CreateCourseModal';
import Pagination from '@/components/shared/Pagination';

const PAGE_SIZE = 10;

interface Course {
  _id: string;
  title: string;
  description: string;
  bannerImage: string;
  category: string;
  totalVideos: number;
  isPublished: boolean;
  createdAt: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/courses');
    const data = await res.json();
    if (data.success) setCourses(data.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = courses.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedCourses = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function togglePublish(id: string, current: boolean) {
    await fetch(`/api/courses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !current }),
    });
    load();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {courses.length} course{courses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search courses…"
              className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={16} />
            New Course
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="h-40 bg-slate-100" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <BookOpen size={24} className="text-indigo-400" />
          </div>
          <h2 className="text-base font-semibold text-slate-700 mb-1">No courses yet</h2>
          <p className="text-sm text-slate-400 mb-5">Create your first course to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg"
          >
            <Plus size={14} /> New Course
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={32} className="text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No courses match &quot;{search}&quot;</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {pagedCourses.map((c) => (
            <div key={c._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              {c.bannerImage ? (
                <img src={c.bannerImage} alt={c.title} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center">
                  <BookOpen size={36} className="text-indigo-300" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug">{c.title}</h3>
                  <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    c.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {c.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4">{stripHtml(c.description)}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                  <Video size={13} />
                  <span>{c.totalVideos} video{c.totalVideos !== 1 ? 's' : ''}</span>
                  {c.category && (
                    <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full">{c.category}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/teacher/courses/${c._id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Pencil size={12} /> Manage
                  </Link>
                  <button
                    onClick={() => togglePublish(c._id, c.isPublished)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {c.isPublished ? <EyeOff size={12} /> : <Eye size={12} />}
                    {c.isPublished ? 'Unpublish' : 'Publish'}
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

      {showCreate && (
        <CreateCourseModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}
