'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, PlayCircle, Search } from 'lucide-react';
import Pagination from '@/components/shared/Pagination';

const PAGE_SIZE = 10;

interface CourseItem {
  _id: string;
  title: string;
  description: string;
  bannerImage: string;
  category: string;
  totalVideos: number;
  teacher: { name: string };
}

export default function StudentCoursesGrid({ courses }: { courses: CourseItem[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = courses.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q) || c.teacher.name.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {courses.length} enrolled</p>
        </div>
        <div className="relative self-start sm:self-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search courses…"
            className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={32} className="text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No courses match &quot;{search}&quot;</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {paged.map((c) => (
              <Link key={c._id} href={`/student/courses/${c._id}`} className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                {c.bannerImage ? (
                  <img src={c.bannerImage} alt={c.title} className="w-full h-40 object-cover group-hover:opacity-95 transition-opacity" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center">
                    <BookOpen size={36} className="text-indigo-300" />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-2">{c.title}</h3>
                  <p className="text-xs text-slate-400 mb-4">by {c.teacher.name}</p>
                  <p className="text-xs text-slate-500 mb-4">{c.totalVideos} video{c.totalVideos !== 1 ? 's' : ''}</p>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 group-hover:text-indigo-700">
                    <PlayCircle size={14} />
                    Start / Continue
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 bg-white rounded-xl border border-slate-200">
              <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
