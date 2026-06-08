export const revalidate = 300; // ISR: rebuild at most every 5 minutes

import type { Metadata } from 'next';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Comment from '@/models/Comment';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  BookOpen,
  Lock,
  Clock,
  PlayCircle,
  ArrowLeft,
  Star,
  Users,
  MessageCircle,
} from 'lucide-react';
import DescriptionRenderer from '@/components/shared/DescriptionRenderer';
import PriceTag from '@/components/home/PriceTag';
import BuyButton from '@/components/home/BuyButton';

function fmtDuration(s: number) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connectDB();
  const { id } = await params;
  const course = await Course.findById(id).populate('teacher', 'name').lean();
  if (!course || !course.isPublished) return { title: 'Course Not Found | Howlfox Academy' };
  return {
    title: `${course.title as string} | Howlfox Academy`,
    description: (course.description as string).slice(0, 160),
    openGraph: {
      title: course.title as string,
      description: (course.description as string).slice(0, 160),
      ...(course.bannerImage ? { images: [{ url: course.bannerImage as string }] } : {}),
    },
  };
}

export default async function PublicCourseDetailPage({ params }: Props) {
  const { id } = await params;
  await connectDB();

  const course = await Course.findById(id).populate('teacher', 'name bio avatar').lean();
  if (!course || !course.isPublished) notFound();

  const videos = await Video.find({ course: id, isPublished: true }).sort({ order: 1 }).lean();

  // Fetch top-level course comments (read-only, public)
  const comments = await Comment.find({
    course: id,
    video: null,
    parentComment: null,
    isDeleted: false,
  })
    .populate('author', 'name avatar')
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(20)
    .lean();

  const teacher = course.teacher as unknown as { name: string; bio: string; avatar: string } | null;

  const totalDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0);
  const totalMins = Math.round(totalDuration / 60);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={15} /> All Courses
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              {course.category && (
                <span className="inline-block bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  {course.category as string}
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
                {course.title as string}
              </h1>
              {teacher && (
                <p className="text-slate-300 text-sm mb-4">by <span className="font-semibold text-white">{teacher.name}</span></p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <PlayCircle size={15} className="text-indigo-400" />
                  {videos.length} lessons
                </span>
                {totalMins > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={15} className="text-indigo-400" />
                    {totalMins} min total
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Star size={15} className="text-amber-400 fill-amber-400" />
                  Expert-led
                </span>
              </div>
            </div>

            {/* Banner image */}
            {course.bannerImage ? (
              <div className="lg:col-span-2 relative h-44 rounded-2xl overflow-hidden">
                <Image
                  src={course.bannerImage as string}
                  alt={course.title as string}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="lg:col-span-2 h-44 rounded-2xl bg-indigo-800/30 border border-indigo-700/30 flex items-center justify-center">
                <BookOpen size={48} className="text-indigo-400/30" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: description + video list + comments */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">About This Course</h2>
              <DescriptionRenderer text={course.description as string} />
            </div>

            {/* Video list */}
            {videos.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">Course Content</h2>
                  <span className="text-xs text-slate-400">{videos.length} lessons</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {videos.map((v, i) => (
                    <li key={String(v._id)} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-shrink-0">
                        {i === 0 ? (
                          <PlayCircle size={18} className="text-indigo-500" />
                        ) : (
                          <Lock size={16} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${i === 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                          {v.title as string}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {v.duration ? (
                          <span className="text-xs text-slate-400">{fmtDuration(v.duration as number)}</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Comments section (read-only) */}
            {comments.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageCircle size={20} className="text-indigo-500" />
                  Student Discussions
                  <span className="text-sm font-normal text-slate-400">({comments.length})</span>
                </h2>
                <div className="space-y-4">
                  {comments.map((c) => {
                    const author = c.author as unknown as { name: string; avatar: string } | null;
                    return (
                      <div key={String(c._id)} className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                            {author ? author.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">
                            {author ? author.name : 'Anonymous'}
                          </span>
                          <span className="text-xs text-slate-400 ml-auto">
                            {new Date(c.createdAt as Date).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{c.content as string}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: CTA sidebar */}
          <div className="space-y-5">

            {/* ── Primary pricing + buy card ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden sticky top-6">
              {/* Banner gradient header */}
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-5">
                {/* Price */}
                <div className="mb-4">
                  <PriceTag
                    pricingType={(course.pricingType as 'free'|'lifetime'|'installment') ?? 'free'}
                    price={(course.price as number) ?? 0}
                    originalPrice={(course.originalPrice as number|null) ?? null}
                    installmentMonths={(course.installmentMonths as number|null) ?? null}
                    currency={(course.currency as string) ?? 'INR'}
                    size="lg"
                    variant="light"
                  />
                </div>

                {/* Buy button — full width inside the gradient header */}
                <BuyButton
                  courseTitle={course.title as string}
                  pricingType={(course.pricingType as 'free'|'lifetime'|'installment') ?? 'free'}
                  price={(course.price as number) ?? 0}
                  originalPrice={(course.originalPrice as number|null) ?? null}
                  installmentMonths={(course.installmentMonths as number|null) ?? null}
                  currency={(course.currency as string) ?? 'INR'}
                  size="md"
                  fullWidth
                  variant="light"
                />
              </div>

              {/* What's included */}
              <div className="px-5 py-4 space-y-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">What&apos;s included</p>
                {[
                  { icon: PlayCircle, text: `${videos.length} video lesson${videos.length !== 1 ? 's' : ''}` },
                  { icon: Clock,      text: totalMins > 0 ? `${totalMins} min of content` : 'Full video content' },
                  { icon: Star,       text: 'Expert-led instruction' },
                  { icon: Users,      text: 'Live session access' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-xs text-slate-600">
                    <Icon size={13} className="text-indigo-500 flex-shrink-0" />
                    {text}
                  </div>
                ))}
              </div>

            </div>

            {/* Instructor */}
            {teacher && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <Users size={15} className="text-indigo-500" /> Instructor
                </h3>
                <p className="font-medium text-slate-800 text-sm">{teacher.name}</p>
                {teacher.bio && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-4">{teacher.bio}</p>
                )}
              </div>
            )}

            {/* Already enrolled */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center">
              <Lock size={18} className="text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 mb-1">Already enrolled?</p>
              <p className="text-xs text-slate-500 mb-3">Sign in to access all lessons.</p>
              <Link href="/login" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
                Sign In →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
