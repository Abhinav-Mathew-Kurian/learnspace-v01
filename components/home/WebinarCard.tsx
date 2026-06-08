'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Clock, Users, X, Radio, CalendarDays, ExternalLink } from 'lucide-react';
import { istMonthAbbr, istDay, istTime, istDate } from '@/lib/ist';

interface Webinar {
  _id: string;
  title: string;
  description: string;
  date: Date;
  duration: number;
  meetingUrl: string;
  thumbnail?: string;
  instructor: string;
  topic: string;
}

export default function WebinarCard({ w }: { w: Webinar }) {
  const [showDetail, setShowDetail] = useState(false);
  const d = new Date(w.date);

  return (
    <>
      {/* Row card */}
      <div
        className="flex items-center gap-4 sm:gap-5 bg-white/4 hover:bg-white/[0.07] border border-white/8 hover:border-emerald-500/40 rounded-2xl px-4 sm:px-5 py-4 transition-all group cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        {/* Thumbnail / date pill */}
        <div className="flex-shrink-0 relative w-16 h-16 rounded-xl overflow-hidden bg-emerald-500/10 border border-emerald-500/20">
          {w.thumbnail ? (
            <>
              <Image src={w.thumbnail} alt={w.title} fill sizes="64px" className="object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/65 py-0.5 text-center">
                <p className="text-[9px] font-black text-emerald-400 uppercase leading-none">{istMonthAbbr(d)}</p>
                <p className="text-sm font-black text-white leading-tight">{istDay(d)}</p>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <p className="text-[10px] font-black text-emerald-400 uppercase">{istMonthAbbr(d)}</p>
              <p className="text-2xl font-black text-white leading-tight">{istDay(d)}</p>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold truncate group-hover:text-emerald-300 transition-colors">{w.title}</p>
          <p className="text-slate-400 text-xs mt-0.5">
            {w.instructor}
            <span className="text-slate-600 mx-1.5">·</span>
            {istTime(d)}
            <span className="text-slate-600 mx-1.5">·</span>
            <Clock size={10} className="inline mr-0.5" />{w.duration} min
          </p>
        </div>

        {w.topic && (
          <span className="hidden sm:block flex-shrink-0 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            {w.topic}
          </span>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); window.open(w.meetingUrl, '_blank', 'noopener,noreferrer'); }}
          className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 sm:px-4 py-2.5 rounded-xl transition-colors"
        >
          <span className="hidden sm:inline">Join</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Detail modal */}
      {showDetail && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-[#0F1623] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Banner */}
            <div className="relative h-36 sm:h-52 bg-gradient-to-br from-emerald-700 to-teal-800 flex-shrink-0">
              {w.thumbnail ? (
                <>
                  <Image src={w.thumbnail} alt={w.title} fill sizes="672px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <Radio size={96} className="text-white" />
                </div>
              )}
              {/* Close */}
              <button
                onClick={() => setShowDetail(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X size={15} />
              </button>
              {/* Topic badge */}
              {w.topic && (
                <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest bg-emerald-500 border border-emerald-400/40 text-white px-2.5 py-1 rounded-full">
                  {w.topic}
                </span>
              )}
              {/* Title + meta overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <h3 className="text-white font-black text-base sm:text-xl leading-snug drop-shadow-lg mb-0.5">{w.title}</h3>
                <p className="text-white/60 text-xs sm:text-sm">{w.instructor}</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-5 sm:gap-6">

              {/* Meta row on mobile / left col on desktop */}
              <div className="sm:col-span-2 space-y-3">
                {/* Date + Duration side by side on mobile */}
                <div className="grid grid-cols-2 gap-3 sm:block sm:space-y-3">
                  <div className="bg-white/5 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CalendarDays size={12} className="text-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Date & Time</span>
                    </div>
                    <p className="text-white text-sm font-bold">{istDate(d)}</p>
                    <p className="text-emerald-400 text-xs font-semibold mt-0.5">{istTime(d)} IST</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Clock size={12} className="text-sky-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Duration</span>
                    </div>
                    <p className="text-white text-sm font-bold">{w.duration} min</p>
                    <p className="text-slate-500 text-xs mt-0.5">Live session</p>
                  </div>
                </div>
                {/* Instructor */}
                <div className="bg-white/5 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Users size={12} className="text-violet-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Instructor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                      {w.instructor.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-white text-sm font-bold">{w.instructor}</p>
                  </div>
                </div>
              </div>

              {/* Right col: description + CTA */}
              <div className="sm:col-span-3 flex flex-col gap-4">
                {w.description && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">About this Webinar</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{w.description}</p>
                  </div>
                )}
                <div className="mt-auto space-y-2.5">
                  <a
                    href={w.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl transition-colors text-sm"
                  >
                    <ExternalLink size={16} />
                    Join Free — No Login Required
                  </a>
                  <p className="text-center text-[11px] text-slate-600">Free & open to everyone · No registration needed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
