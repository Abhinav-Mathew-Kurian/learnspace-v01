'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, PlayCircle, Lock, ChevronDown, ChevronUp, List } from 'lucide-react';

interface ChapterVideo {
  id: string;
  title: string;
  accessible: boolean;
  isCurrent: boolean;
  isDone: boolean;
  index: number;
}

interface Props {
  videos: ChapterVideo[];
  courseTitle: string;
  currentIndex: number;
  totalCount: number;
  courseId: string;
}

function VideoListItem({ v, courseId }: { v: ChapterVideo; courseId: string }) {
  if (!v.accessible) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 opacity-40 cursor-not-allowed">
        <Lock size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <span className="text-[13px] text-slate-500 flex-1 truncate">{v.title}</span>
      </div>
    );
  }
  return (
    <Link
      href={`/student/courses/${courseId}/video/${v.id}`}
      className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${v.isCurrent ? 'bg-indigo-50' : ''}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {v.isDone ? (
          <CheckCircle2 size={15} className="text-green-500" />
        ) : v.isCurrent ? (
          <PlayCircle size={15} className="text-indigo-600" />
        ) : (
          <span className="w-[15px] h-[15px] flex items-center justify-center text-[10px] font-bold text-slate-400">
            {v.index + 1}
          </span>
        )}
      </div>
      <span className={`text-[13px] leading-snug flex-1 ${
        v.isCurrent ? 'font-semibold text-indigo-700' : v.isDone ? 'text-slate-500' : 'text-slate-700'
      }`}>
        {v.title}
      </span>
    </Link>
  );
}

export default function ChapterSidebar({ videos, courseTitle, currentIndex, totalCount, courseId }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const listItems = (
    <ul className="divide-y divide-slate-100">
      {videos.map((v) => (
        <li key={v.id}>
          <VideoListItem v={v} courseId={courseId} />
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Mobile: collapsible accordion below the video */}
      <div className="lg:hidden border-t border-slate-200 bg-white">
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <List size={15} className="text-indigo-500" />
            Chapters
            <span className="text-xs font-normal text-slate-400 ml-1">
              {currentIndex + 1}/{totalCount}
            </span>
          </span>
          {mobileOpen
            ? <ChevronUp size={15} className="text-slate-400" />
            : <ChevronDown size={15} className="text-slate-400" />
          }
        </button>
        {mobileOpen && (
          <div className="max-h-72 overflow-y-auto border-t border-slate-100">
            {listItems}
          </div>
        )}
      </div>

      {/* Desktop: fixed right sidebar */}
      <div className="hidden lg:flex w-[300px] flex-shrink-0 border-l border-slate-200 bg-white flex-col h-screen sticky top-0">
        <div className="px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
          <p className="text-xs text-slate-400 mb-0.5">
            {currentIndex + 1} / {totalCount}
          </p>
          <h2 className="text-sm font-semibold text-slate-800 truncate" title={courseTitle}>
            {courseTitle}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {listItems}
        </div>
      </div>
    </>
  );
}
