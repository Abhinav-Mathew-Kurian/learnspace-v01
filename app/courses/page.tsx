export const revalidate = 300; // ISR: rebuild at most every 5 minutes

import { Metadata } from 'next';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, PlayCircle, ArrowLeft } from 'lucide-react';
import PriceTag from '@/components/home/PriceTag';
import BuyButton from '@/components/home/BuyButton';

export const metadata: Metadata = {
  title: 'All Courses | LearnSpace',
  description: 'Browse all expert-led courses on LearnSpace. Web development, data science, AI/ML, design, and more.',
  openGraph: {
    title: 'All Courses | LearnSpace',
    description: 'Expert-led online courses for every skill level.',
  },
};

const gradients = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-700',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
];

export default async function CoursesPage() {
  await connectDB();

  const coursesRaw = await Course.find({ isPublished: true })
    .populate('teacher', 'name avatar')
    .sort({ createdAt: -1 })
    .lean();

  const courses = await Promise.all(
    coursesRaw.map(async (course, idx) => {
      const videoCount = await Video.countDocuments({ course: course._id, isPublished: true });
      return { ...course, videoCount, gradient: gradients[idx % gradients.length] };
    })
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={15} /> Back to Home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">All Courses</h1>
          <p className="text-slate-300 text-lg">
            {courses.length} expert-led {courses.length === 1 ? 'course' : 'courses'} available
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        {courses.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={48} className="text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-500">No courses published yet</h2>
            <p className="text-slate-400 text-sm mt-2">Check back soon — new courses are added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const teacher = course.teacher as unknown as { name: string; avatar: string } | null;
              return (
                <div key={String(course._id)} className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all overflow-hidden flex flex-col">
                  <Link href={`/courses/${String(course._id)}`} className="block flex-1">
                    {course.bannerImage ? (
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={course.bannerImage as string}
                          alt={course.title as string}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className={`h-48 bg-gradient-to-br ${course.gradient} flex items-center justify-center`}>
                        <BookOpen size={44} className="text-white/40" />
                      </div>
                    )}
                    <div className="p-5 pb-3">
                      {course.category && (
                        <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
                          {course.category as string}
                        </span>
                      )}
                      <h2 className="font-bold text-slate-900 text-base mb-1 group-hover:text-indigo-700 transition-colors line-clamp-2">
                        {course.title as string}
                      </h2>
                      {teacher && (
                        <p className="text-xs text-slate-400 mb-2">by {teacher.name}</p>
                      )}
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <PlayCircle size={11} />
                        {course.videoCount} {course.videoCount === 1 ? 'lesson' : 'lessons'}
                      </p>
                    </div>
                  </Link>
                  {/* Pricing card */}
                  <div className="px-3.5 pb-3.5 pt-2">
                    <div className="rounded-2xl overflow-hidden border border-indigo-100/80 shadow-sm shadow-indigo-200/30">
                      <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                      <div className="bg-white px-3.5 pt-3 pb-3.5">
                        <div className="flex items-center justify-between mb-2.5">
                          <PriceTag
                            pricingType={(course.pricingType as 'free'|'lifetime'|'installment') ?? 'free'}
                            price={(course.price as number) ?? 0}
                            originalPrice={(course.originalPrice as number|null) ?? null}
                            installmentMonths={(course.installmentMonths as number|null) ?? null}
                            currency={(course.currency as string) ?? 'INR'}
                            size="sm"
                          />
                          {(course.pricingType as string) === 'lifetime' && (
                            <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Lifetime</span>
                          )}
                        </div>
                        <BuyButton
                          courseTitle={course.title as string}
                          pricingType={(course.pricingType as 'free'|'lifetime'|'installment') ?? 'free'}
                          price={(course.price as number) ?? 0}
                          originalPrice={(course.originalPrice as number|null) ?? null}
                          installmentMonths={(course.installmentMonths as number|null) ?? null}
                          currency={(course.currency as string) ?? 'INR'}
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
        )}
      </div>
    </div>
  );
}
