import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import User from '@/models/User';
import PublicWebinar from '@/models/PublicWebinar';
import Promotion from '@/models/Promotion';
import { istDate } from '@/lib/ist';
import Rating from '@/models/Rating';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen, Users, Calendar, Mail, MapPin, Phone,
  Star, ArrowRight, CheckCircle, Brain, Video as VideoIcon,
  TrendingUp, Radio, Shield, Zap, Clock, Award,
} from 'lucide-react';
import HomeNavbar from '@/components/home/HomeNavbar';
import EnquiryForm from '@/components/home/EnquiryForm';
import RatingForm from '@/components/home/RatingForm';
import WebinarCard from '@/components/home/WebinarCard';
import PriceTag from '@/components/home/PriceTag';
import BuyButton from '@/components/home/BuyButton';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['Digital Marketing','Meta Ads','UI/UX Design','Graphic designing','Business','Photography','Videography','Art & Crafts'];

const FEATURES = [
  { icon: VideoIcon, title: 'HD Video Lessons',        desc: 'Stream premium video courses with no distractions. Pause, resume, and rewatch anytime.',                       iconColor: 'text-sky-600',     iconBg: 'bg-sky-500/15',     banner: 'from-sky-400/25 via-blue-400/10 to-transparent',     hover: 'hover:shadow-sky-100/70'    },
  { icon: Radio,     title: 'Live Interactive Classes', desc: 'Join scheduled live sessions with your instructor. Ask questions and get answers in real time.',                iconColor: 'text-rose-600',    iconBg: 'bg-rose-500/15',    banner: 'from-rose-400/25 via-pink-400/10 to-transparent',    hover: 'hover:shadow-rose-100/70'   },
  { icon: Brain,     title: 'AI Study Assistant',       desc: 'Ask anything about your course material. The AI reads your PDFs and gives precise answers.',                   iconColor: 'text-violet-600',  iconBg: 'bg-violet-500/15',  banner: 'from-violet-400/25 via-purple-400/10 to-transparent', hover: 'hover:shadow-violet-100/70' },
  { icon: TrendingUp,title: 'Progress Tracking',        desc: 'See completion percentages, attendance records, and resume exactly where you stopped.',                         iconColor: 'text-emerald-600', iconBg: 'bg-emerald-500/15', banner: 'from-emerald-400/25 via-teal-400/10 to-transparent',  hover: 'hover:shadow-emerald-100/70'},
  { icon: Shield,    title: 'Private & Secure',         desc: 'Invite-only platform. Your data and course content are never shared or made public.',                           iconColor: 'text-amber-600',   iconBg: 'bg-amber-500/15',   banner: 'from-amber-400/25 via-orange-400/10 to-transparent',  hover: 'hover:shadow-amber-100/70'  },
  { icon: Award,     title: 'Structured Learning',      desc: 'Curated paths with assignments, PDFs, live Q&A sessions, and step-by-step guidance from experts.', iconColor: 'text-indigo-600',  iconBg: 'bg-indigo-500/15',  banner: 'from-indigo-400/25 via-violet-400/10 to-transparent', hover: 'hover:shadow-indigo-100/70' },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={12} className={s <= n ? 'fill-amber-400 text-amber-400' : 'text-slate-600'} />
      ))}
    </div>
  );
}

export default async function Home() {
  let session = null;
  try { session = await auth(); } catch { /* untrusted host or auth error — treat as logged-out */ }
  if (session?.user?.role) {
    const r = session.user.role;
    if (r === 'admin') redirect('/admin/dashboard');
    if (r === 'teacher') redirect('/teacher/dashboard');
    redirect('/student/dashboard');
  }

  await connectDB();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [webinarsRaw, promotionsRaw, coursesRaw, ratingsRaw, courseCount, studentCount] = await Promise.all([
    PublicWebinar.find({ isActive: true, date: { $gte: oneHourAgo } }).sort({ date: 1 }).limit(5).lean(),
    Promotion.find({ isActive: true }).sort({ createdAt: -1 }).lean(),
    Course.find({ isPublished: true }).populate('teacher', 'name').sort({ createdAt: -1 }).limit(8).lean(),
    Rating.find({ isApproved: true }).sort({ createdAt: -1 }).limit(6).select('name rating comment role').lean(),
    Course.countDocuments({ isPublished: true }),
    User.countDocuments({ role: 'student' }),
  ]);

  const courses = coursesRaw;

  const courseGradients = [
    'from-violet-600 to-indigo-700','from-sky-500 to-blue-700',
    'from-emerald-500 to-teal-700','from-orange-500 to-red-600',
    'from-pink-500 to-rose-700','from-amber-500 to-orange-600',
    'from-cyan-500 to-sky-700','from-purple-600 to-violet-700',
  ];

  return (
    <div className="min-h-screen bg-[#07090F] overflow-x-hidden">
      <HomeNavbar />

      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=50"
            alt=""
            fill
            className="object-cover object-center opacity-[0.07]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#07090F] via-[#07090F]/90 to-[#07090F]/80" />
        </div>

        {/* Glow blobs */}
        <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-indigo-600/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-violet-700/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-sky-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/25 mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-xs font-semibold text-indigo-300 tracking-wide">India's Premium Up-Skill Platform</span>
              </div>

              <h1 className="text-5xl sm:text-6xl xl:text-[70px] font-black text-white leading-[1.02] tracking-tight mb-6">
                Upgarde Your{' '}
                <span className="relative">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
                    Skills
                  </span>
                </span>
                <br />With Expert<br />Instruction.
              </h1>

              <p className="text-lg text-slate-400 max-w-lg mb-8 leading-relaxed">
                Structured courses, live classes, AI assistance and real progress tracking — everything serious learners need in one private platform.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-10">
                <Link
                  href="/courses"
                  className="group inline-flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3.5 rounded-xl font-bold text-sm transition-all hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
                >
                  Explore Courses
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="#webinars"
                  className="inline-flex items-center gap-2.5 bg-white/6 hover:bg-white/10 border border-white/10 text-white px-7 py-3.5 rounded-xl font-bold text-sm transition-all"
                >
                  {/* Recording blink light */}
                  <span className="relative flex h-3 w-3 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  Free Webinar
                </a>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-x-8 gap-y-4 pt-8 border-t border-white/8">
                {[
                  { v: `${courseCount || '10'}+`, l: 'Courses', color: 'text-indigo-400' },
                  { v: `${studentCount || '200'}+`, l: 'Students', color: 'text-violet-400' },
                  { v: '50+', l: 'Live Sessions', color: 'text-sky-400' },
                  { v: '4.9★', l: 'Avg Rating', color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.l}>
                    <p className={`text-2xl font-black ${s.color}`}>{s.v}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Dashboard Mockup */}
            <div className="hidden lg:block relative">
              {/* Main card */}
              <div className="relative bg-[#0F1623] border border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
                {/* Titlebar */}
                <div className="bg-[#151D2B] px-4 py-3 flex items-center gap-2 border-b border-white/6">
                  <span className="w-3 h-3 rounded-full bg-red-500/70" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                  <span className="mx-auto text-xs text-slate-600 font-mono">howlfoxacademy.com/student/dashboard</span>
                </div>
                {/* Content */}
                <div className="flex">
                  {/* Sidebar */}
                  <div className="w-40 bg-[#0B1118] p-3 border-r border-white/5">
                    <div className="flex items-center gap-2 mb-5 px-1">
                      <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                        <BookOpen size={11} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-white">Howlfox Academy</span>
                    </div>
                    {['Dashboard','My Courses','Live Classes','Calendar','Profile'].map((item, i) => (
                      <div key={item} className={`px-2.5 py-2 rounded-lg text-xs mb-0.5 font-medium ${i === 1 ? 'bg-indigo-600/80 text-white' : 'text-slate-500 hover:text-slate-400'}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                  {/* Main */}
                  <div className="flex-1 p-4">
                    <p className="text-white text-sm font-semibold mb-1">Good morning, Arjun 👋</p>
                    <p className="text-slate-500 text-xs mb-4">4 courses in progress</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { t:'Full-Stack Dev', p:72, c:'bg-indigo-500' },
                        { t:'Digital Marketing', p:45, c:'bg-sky-500' },
                        { t:'UI/UX Design', p:91, c:'bg-violet-500' },
                        { t:'PSC Coaching', p:28, c:'bg-emerald-500' },
                      ].map((c) => (
                        <div key={c.t} className="bg-[#151D2B] rounded-xl p-3">
                          <div className="w-7 h-7 rounded-lg bg-white/5 mb-2" />
                          <p className="text-white text-[11px] font-semibold mb-2 leading-tight">{c.t}</p>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full ${c.c} rounded-full`} style={{ width: `${c.p}%` }} />
                          </div>
                          <p className="text-slate-500 text-[10px] mt-1">{c.p}% done</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating AI badge */}
              <div className="absolute -left-8 top-20 bg-[#0F1623] border border-violet-500/30 rounded-xl px-3.5 py-2.5 shadow-xl shadow-violet-900/30">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/30 flex items-center justify-center">
                    <Brain size={13} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">AI Assistant</p>
                    <p className="text-violet-400 text-[10px]">Ready to help</p>
                  </div>
                </div>
              </div>

              {/* Floating live badge */}
              <div className="absolute -right-4 bottom-24 bg-[#0F1623] border border-red-500/30 rounded-xl px-3.5 py-2.5 shadow-xl shadow-red-900/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-white text-xs font-semibold">Live Class</p>
                  <span className="text-[10px] text-red-400 font-bold">LIVE</span>
                </div>
              </div>

              {/* Floating progress badge */}
              <div className="absolute -right-6 top-12 bg-emerald-600/90 rounded-xl px-3 py-2 shadow-xl shadow-emerald-900/40">
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-white" />
                  <p className="text-white text-xs font-semibold">91% Complete</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#07090F] to-transparent" />
      </section>

      {/* ═══════════════════════════════════════
          CATEGORY TICKER
      ═══════════════════════════════════════ */}
      <div className="relative py-3.5 overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
        <div className="flex whitespace-nowrap" style={{ animation: 'ticker 30s linear infinite' }}>
          {[...CATEGORIES,...CATEGORIES,...CATEGORIES,...CATEGORIES].map((c,i) => (
            <span key={i} className="inline-flex items-center gap-2 text-white/80 text-xs font-semibold px-5 uppercase tracking-widest">
              {c}
              <span className="w-1 h-1 rounded-full bg-white/40 flex-shrink-0" />
            </span>
          ))}
        </div>
        <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-25%)}}`}</style>
      </div>

      {/* ═══════════════════════════════════════
          PROMOTIONS STRIP
      ═══════════════════════════════════════ */}
      {promotionsRaw.length > 0 && (() => {
        const PROMO_GRADIENTS: Record<string, string> = {
          indigo:  'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',
          sky:     'linear-gradient(135deg,#0ea5e9 0%,#3b82f6 100%)',
          emerald: 'linear-gradient(135deg,#059669 0%,#0d9488 100%)',
          fire:    'linear-gradient(135deg,#f97316 0%,#ef4444 100%)',
          pink:    'linear-gradient(135deg,#ec4899 0%,#f43f5e 100%)',
          gold:    'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)',
          purple:  'linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)',
          dark:    'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)',
        };
        return (
          <section className="py-10 px-4 sm:px-6 bg-[#07090F] border-b border-white/5">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 mb-5">
                <Zap size={14} className="text-amber-400" />
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">Special Offers</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotionsRaw.map((p) => {
                  const gradient = PROMO_GRADIENTS[p.bgColor as string] ?? PROMO_GRADIENTS.indigo;
                  const hasImage = !!(p.imageUrl as string | undefined);
                  return (
                    <div
                      key={String(p._id)}
                      className="relative rounded-2xl overflow-hidden flex flex-col justify-between min-h-[210px] p-5 group"
                    >
                      {/* Background: full image when available, gradient as base */}
                      <div className="absolute inset-0" style={{ background: gradient }} />
                      {hasImage && (
                        <>
                          <Image
                            src={p.imageUrl as string}
                            alt=""
                            fill
                            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                            className="object-cover"
                          />
                          {/* gradient tint overlay so text stays readable */}
                          <div className="absolute inset-0 bg-gradient-to-br from-black/65 via-black/40 to-black/20" />
                          <div className="absolute inset-0 opacity-60" style={{ background: gradient }} />
                        </>
                      )}
                      {/* Decorative blobs (only without image) */}
                      {!hasImage && (
                        <>
                          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
                          <div className="absolute -left-4 -bottom-6 w-24 h-24 rounded-full bg-black/15 pointer-events-none" />
                        </>
                      )}

                      {/* Top content */}
                      <div className="relative z-10">
                        {p.badge && (
                          <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-black/30 border border-white/25 text-white px-3 py-1 rounded-full mb-3">
                            {p.badge as string}
                          </span>
                        )}
                        <h3 className="text-white font-black text-xl leading-snug mb-2 drop-shadow-sm">{p.title as string}</h3>
                        <p className="text-white/80 text-xs leading-relaxed line-clamp-2">{p.description as string}</p>
                      </div>

                      {/* Bottom row */}
                      <div className="relative z-10 flex items-center justify-between mt-4 pt-3 border-t border-white/20">
                        {p.validUntil ? (
                          <div className="flex items-center gap-1.5">
                            <Clock size={11} className="text-white/60" />
                            <span className="text-white/75 text-[11px] font-semibold">
                              Ends {istDate(p.validUntil as Date)}
                            </span>
                          </div>
                        ) : <div />}
                        {p.linkUrl ? (
                          <Link
                            href={p.linkUrl as string}
                            className="inline-flex items-center gap-1.5 bg-white/25 hover:bg-white/40 border border-white/30 text-white text-xs font-black px-4 py-2 rounded-xl transition-all hover:scale-105"
                          >
                            Claim <ArrowRight size={11} />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ═══════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 bg-white relative overflow-hidden">
        {/* Subtle colour blobs behind content */}
        <div className="absolute top-0 right-0 w-[700px] h-[500px] bg-gradient-to-bl from-indigo-50 via-violet-50/60 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-gradient-to-tr from-sky-50/80 to-transparent pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-0.5 w-6 bg-indigo-500 rounded-full" />
              <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Why Howlfox Academy</p>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-4">
              Everything you need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">learn faster.</span>
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed">
              Built for serious learners who want more than just video content.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, iconColor, iconBg, banner, hover }) => (
              <div key={title} className={`group rounded-2xl overflow-hidden border border-slate-100 hover:border-slate-200 bg-white hover:shadow-2xl ${hover} hover:-translate-y-2 transition-all duration-300 cursor-default`}>
                {/* Coloured gradient banner */}
                <div className={`h-[72px] bg-gradient-to-br ${banner} flex items-center px-5`}>
                  <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
                    <Icon size={22} className={iconColor} />
                  </div>
                </div>
                {/* Text */}
                <div className="p-5 pt-4">
                  <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Hero image strip */}
          <div className="mt-14 rounded-3xl overflow-hidden relative h-64 sm:h-80">
            <Image
              src="/images/courseBanner.png"
              alt="Students learning together"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 via-indigo-900/40 to-transparent flex items-center px-8 sm:px-14">
              <div>
                <p className="text-white text-2xl sm:text-3xl font-black max-w-sm leading-tight mb-4">
                  Join thousands of students leveling up their careers.
                </p>
                <Link href="/courses" className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
                  Browse Courses <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          COURSES — Light gray
      ═══════════════════════════════════════ */}
      <section id="courses" className="py-20 px-4 sm:px-6 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-0.5 w-6 bg-indigo-500 rounded-full" />
                <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Curated Learning</p>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                Popular{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Courses</span>
              </h2>
            </div>
            <Link href="/courses" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">
              All Courses <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {courses.map((c, i) => {
              const teacher = c.teacher as unknown as { name: string } | null;
              return (
                <div key={String(c._id)} className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50 transition-all overflow-hidden flex flex-col">
                  <Link href={`/courses/${String(c._id)}`} className="block flex-1">
                    <div className="relative h-44 overflow-hidden">
                      {c.bannerImage ? (
                        <Image
                          src={c.bannerImage as string}
                          alt={c.title as string}
                          fill
                          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${courseGradients[i % courseGradients.length]} flex items-center justify-center`}>
                          <BookOpen size={36} className="text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {c.category && (
                        <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-wider text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
                          {c.category as string}
                        </span>
                      )}
                    </div>
                    <div className="p-4 pb-2">
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-indigo-700 transition-colors">
                        {c.title as string}
                      </h3>
                      {teacher && <p className="text-xs text-slate-400 font-medium">by {teacher.name}</p>}
                    </div>
                  </Link>
                  {/* Pricing card */}
                  <div className="px-3.5 pb-3.5 pt-2">
                    <div className="rounded-2xl overflow-hidden border border-indigo-100/80 shadow-sm shadow-indigo-200/30">
                      <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                      <div className="bg-white px-3.5 pt-3 pb-3.5">
                        <div className="flex items-center justify-between mb-2.5">
                          <PriceTag
                            pricingType={(c.pricingType as 'free'|'lifetime'|'installment') ?? 'free'}
                            price={(c.price as number) ?? 0}
                            originalPrice={(c.originalPrice as number|null) ?? null}
                            installmentMonths={(c.installmentMonths as number|null) ?? null}
                            currency={(c.currency as string) ?? 'INR'}
                            size="sm"
                          />
                          {(c.pricingType as string) === 'lifetime' && (
                            <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Lifetime</span>
                          )}
                        </div>
                        <BuyButton
                          courseTitle={c.title as string}
                          pricingType={(c.pricingType as 'free'|'lifetime'|'installment') ?? 'free'}
                          price={(c.price as number) ?? 0}
                          originalPrice={(c.originalPrice as number|null) ?? null}
                          installmentMonths={(c.installmentMonths as number|null) ?? null}
                          currency={(c.currency as string) ?? 'INR'}
                          size="sm"
                          fullWidth
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8 sm:hidden">
            <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 border border-indigo-200 px-6 py-2.5 rounded-xl hover:bg-indigo-50 transition-all">
              View All Courses <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FREE WEBINARS — Dark
      ═══════════════════════════════════════ */}
      <section id="webinars" className="py-14 px-4 sm:px-6 bg-[#07090F] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Free & Open to All</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Upcoming Live Webinars</h2>
            </div>
            <p className="text-sm text-slate-500">No login required — just click &amp; join</p>
          </div>

          {webinarsRaw.length === 0 ? (
            <div className="flex items-center gap-4 bg-white/4 border border-white/8 rounded-2xl px-6 py-5">
              <Calendar size={22} className="text-slate-600 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-semibold">No upcoming webinars right now</p>
                <p className="text-slate-500 text-xs mt-0.5">We schedule new sessions regularly — check back soon.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {webinarsRaw.map((w) => (
                <WebinarCard key={String(w._id)} w={{
                  _id: String(w._id),
                  title: w.title as string,
                  description: w.description as string,
                  date: w.date as Date,
                  duration: w.duration as number,
                  meetingUrl: w.meetingUrl as string,
                  thumbnail: w.thumbnail as string | undefined,
                  instructor: w.instructor as string,
                  topic: w.topic as string,
                }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          HOW IT WORKS — Bento grid, dark canvas
      ═══════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 bg-[#07090F] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          {/* Header — left-aligned */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-0.5 w-6 bg-indigo-500 rounded-full" />
              <p className="text-xs font-black uppercase tracking-widest text-indigo-400">How it works</p>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
              Get started in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">3 simple steps.</span>
            </h2>
          </div>

          {/* Bento grid: large left (2 rows) + two stacked right */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

            {/* ── Step 01 — big card ── */}
            <div className="md:col-span-3 md:row-span-2 relative rounded-3xl overflow-hidden p-8 sm:p-10 min-h-[260px] bg-white/[0.028] border border-indigo-500/25 hover:border-indigo-500/50 hover:bg-white/[0.05] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/12 via-transparent to-transparent" />
              <span className="absolute -right-6 bottom-2 text-[200px] font-black text-white/[0.03] leading-none select-none pointer-events-none">1</span>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/30">
                  <Mail size={26} className="text-white" />
                </div>
                <p className="text-xs font-black text-sky-400 uppercase tracking-widest mb-3">Step 01</p>
                <h3 className="font-black text-white text-2xl sm:text-3xl mb-4 leading-tight">Submit Your Enquiry</h3>
                <p className="text-slate-400 leading-relaxed max-w-sm">Fill out our form with your learning goals. Our team reviews every submission personally and reaches back within 24 hours.</p>
              </div>
            </div>

            {/* ── Step 02 ── */}
            <div className="md:col-span-2 relative rounded-3xl overflow-hidden p-6 sm:p-7 min-h-[150px] bg-white/[0.028] border border-violet-500/25 hover:border-violet-500/50 hover:bg-white/[0.05] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/12 via-transparent to-transparent" />
              <span className="absolute -right-3 bottom-0 text-[110px] font-black text-white/[0.03] leading-none select-none pointer-events-none">2</span>
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2">Step 02</p>
                <h3 className="font-black text-white text-xl mb-2">Get Enrolled</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Receive credentials and instantly access every enrolled course.</p>
              </div>
            </div>

            {/* ── Step 03 ── */}
            <div className="md:col-span-2 relative rounded-3xl overflow-hidden p-6 sm:p-7 min-h-[150px] bg-white/[0.028] border border-emerald-500/25 hover:border-emerald-500/50 hover:bg-white/[0.05] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/12 via-transparent to-transparent" />
              <span className="absolute -right-3 bottom-0 text-[110px] font-black text-white/[0.03] leading-none select-none pointer-events-none">3</span>
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Step 03</p>
                <h3 className="font-black text-white text-xl mb-2">Start Learning</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Watch, join live, ask AI, track progress — all in one place.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          PHOTO MOSAIC — floating cards, dark
      ═══════════════════════════════════════ */}
      <section className="py-16 px-4 sm:px-6 bg-[#07090F] overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-3 sm:gap-4 items-end">
            {([
              { src:'/images/recordedclass.png',      label:'Recorded Classes',      h:'h-52 sm:h-64', rot:'-rotate-1' },
              { src:'/images/liveclass.png',          label:'Live Class in Session',  h:'h-64 sm:h-80', rot:'rotate-1'  },
              { src:'/images/deepfocuslearningg.png',  label:'Deep-Focus Learning',    h:'h-56 sm:h-72', rot:'-rotate-1' },
              { src:'/images/aipowered.png',          label:'AI-Powered Learning',    h:'h-44 sm:h-56', rot:'rotate-1'  },
            ] as const).map((p, i) => (
              <div key={i} className={`relative flex-1 ${p.h} rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ${p.rot} hover:rotate-0 hover:scale-105 transition-all duration-500 cursor-pointer`}>
                <Image src={p.src} alt={p.label} fill sizes="25vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <p className="absolute bottom-3 left-3 text-white text-xs font-bold drop-shadow-lg">{p.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          STATS — Giant typography, dark canvas
      ═══════════════════════════════════════ */}
      <section className="pt-20 pb-32 px-4 sm:px-6 bg-[#07090F] relative overflow-hidden">
        {/* Central glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[900px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-700 mb-16">By the numbers</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
            {[
              { v:`${courseCount || 10}+`,    l:'Courses',      color:'text-indigo-400', glow:'from-indigo-600/20' },
              { v:`${studentCount || 200}+`,  l:'Students',     color:'text-violet-400', glow:'from-violet-600/20' },
              { v:'50+',                       l:'Live Sessions', color:'text-sky-400',    glow:'from-sky-600/20'    },
              { v:'4.9★',                      l:'Avg Rating',   color:'text-amber-400',  glow:'from-amber-600/20'  },
            ].map(s => (
              <div key={s.l} className="group relative">
                <div className={`absolute inset-0 bg-gradient-to-b ${s.glow} to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <p className={`relative text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black ${s.color} leading-none mb-3 group-hover:scale-110 transition-transform duration-300`}>{s.v}</p>
                <p className="relative text-slate-500 text-xs font-black uppercase tracking-widest">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fade into testimonials */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F8FAFC] to-transparent pointer-events-none" />
      </section>

      {/* ═══════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════ */}
      <section className="py-20 px-4 sm:px-6 bg-[#F8FAFC] relative overflow-hidden">
        {/* Decorative right-side blob */}
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-gradient-to-bl from-amber-50/80 via-orange-50/40 to-transparent pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12 relative">
            {/* Giant quote decoration */}
            <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none select-none -translate-y-4">
              <span className="text-[160px] sm:text-[200px] font-black text-slate-200/70 leading-none">&ldquo;</span>
            </div>
            <div className="relative">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="h-0.5 w-6 bg-amber-500 rounded-full" />
                <p className="text-xs font-black uppercase tracking-widest text-amber-600">Real Feedback</p>
                <div className="h-0.5 w-6 bg-amber-500 rounded-full" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Words from our students</h2>
              <p className="text-slate-500 max-w-lg mx-auto">Honest reviews from students who&apos;ve transformed their skills on Howlfox Academy.</p>
            </div>
          </div>

          {ratingsRaw.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
              {ratingsRaw.map((r, i) => {
                const avatarColors = ['from-indigo-500 to-violet-600','from-sky-500 to-indigo-600','from-emerald-500 to-teal-600','from-orange-500 to-red-500','from-pink-500 to-rose-600','from-violet-500 to-purple-600'];
                const accentBorders = ['border-l-indigo-500','border-l-sky-500','border-l-emerald-500','border-l-orange-500','border-l-pink-500','border-l-violet-500'];
                return (
                  <div key={String(r._id)} className={`relative bg-white rounded-2xl border border-slate-100 border-l-4 ${accentBorders[i % accentBorders.length]} p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden`}>
                    {/* Decorative quote in corner */}
                    <span className="absolute top-3 right-4 text-5xl font-black text-slate-100 select-none leading-none">&rdquo;</span>
                    <Stars n={r.rating as number} />
                    <p className="text-slate-700 text-sm leading-relaxed mt-4 mb-5 line-clamp-4 relative">
                      &ldquo;{r.comment as string}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-sm font-black flex-shrink-0`}>
                        {(r.name as string).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{r.name as string}</p>
                        {r.role && <p className="text-xs text-slate-400">{r.role as string}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rate Us Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-7 py-5 border-b border-amber-100/70 flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <Star key={s} size={16} className="fill-amber-400 text-amber-400" />)}
              </div>
              <h3 className="font-black text-slate-900">Share Your Experience</h3>
              <p className="text-xs text-slate-500 ml-auto hidden sm:block">Your review will appear after moderation</p>
            </div>
            <div className="p-6 sm:p-8">
              <RatingForm />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          ENQUIRY — Full dark
      ═══════════════════════════════════════ */}
      <section className="relative py-20 px-4 sm:px-6 overflow-hidden bg-[#07090F]">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1920&q=40"
            alt=""
            fill
            className="object-cover opacity-[0.06]"
          />
          <div className="absolute inset-0 bg-[#07090F]/80" />
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-start">
            {/* Left */}
            <div className="lg:col-span-2">
              <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">Get in Touch</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
                Ready to start<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">your journey?</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Submit your enquiry and our admissions team will get back to you within 24 hours.
              </p>

              <div className="space-y-4">
                {[
                  { Icon: Mail, label:'Email Us', value:'hello@howlfoxacademy.com', highlight:true },
                  { Icon: Phone, label:'Call Us', value:'+91 XXXXX XXXXX', highlight:false },
                  { Icon: MapPin, label:'Location', value:'India', highlight:false },
                ].map(({ Icon, label, value, highlight }) => (
                  <div key={label} className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-indigo-600/30 border border-indigo-500/30' : 'bg-white/5 border border-white/8'}`}>
                      <Icon size={16} className={highlight ? 'text-indigo-400' : 'text-slate-500'} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-600">{label}</p>
                      <p className="text-sm font-semibold text-white">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right */}
            <div className="lg:col-span-3 bg-white/5 border border-white/8 rounded-3xl p-6 sm:p-7 backdrop-blur-sm">
              <EnquiryForm />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════ */}
      <footer className="bg-[#030507] border-t border-white/5">
        {/* Main footer */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <Image src="/images/logo/HOWLFOOX-LOGO2.svg" alt="Howlfox Academy" width={32} height={32} className="rounded-lg object-contain" />
                <span className="font-black text-white text-lg tracking-tight">Howlfox Academy</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-4 max-w-xs">
                India's premium private learning platform. Expert-led courses, live classes, and AI-powered study tools.
              </p>
              <div className="flex gap-2">
                {['📧','📱','🌐'].map((e, i) => (
                  <div key={i} className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-base cursor-pointer hover:bg-white/10 transition-colors">
                    {e}
                  </div>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-600 mb-4">Platform</p>
              <div className="space-y-2.5">
                {[
                  { l:'Browse Courses', h:'/courses' },
                  { l:'Free Webinars', h:'#webinars' },
                  { l:'How It Works', h:'/how-it-works' },
                  { l:'About Us', h:'/about' },
                ].map(({ l, h }) => (
                  <Link key={l} href={h} className="block text-sm text-slate-500 hover:text-slate-300 transition-colors">{l}</Link>
                ))}
              </div>
            </div>

            {/* Learn */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-600 mb-4">Account</p>
              <div className="space-y-2.5">
                {[
                  { l:'Sign In', h:'/login' },
                  { l:'Contact Us', h:'#contact' },
                ].map(({ l, h }) => (
                  <Link key={l} href={h} className="block text-sm text-slate-500 hover:text-slate-300 transition-colors">{l}</Link>
                ))}
                <div className="pt-2">
                  <Link href="/login" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                    Get Started <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 px-4 sm:px-6 py-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-700">© 2025 Howlfox Academy. All rights reserved.</p>
            <p className="text-xs text-slate-700">Transforming education through technology 🚀</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
