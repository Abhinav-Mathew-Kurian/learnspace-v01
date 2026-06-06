export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlayCircle, CheckCircle2, Lock, BookOpen, Clock, FileText, Download } from 'lucide-react';
import DescriptionRenderer from '@/components/shared/DescriptionRenderer';
import CommentSection from '@/components/shared/CommentSection';
import AiAssistant from '@/components/shared/AiAssistant';
import PDFResource from '@/models/PDFResource';

function fmtDuration(s: number) {
  if (!s) return '';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default async function StudentCourseOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  await connectDB();

  const course = await Course.findById(id).populate('teacher', 'name avatar bio');
  if (!course || !course.isPublished) notFound();

  const videos = await Video.find({ course: id, isPublished: true }).sort({ order: 1 });

  const enrollment = await Enrollment.findOne({
    student: session!.user.id,
    course: id,
    isActive: true,
  });
  const isEnrolled = !!enrollment;

  const progressRecords = isEnrolled
    ? await Progress.find({ student: session!.user.id, course: id })
    : [];

  const progressMap = new Map(progressRecords.map((p) => [p.video.toString(), p]));

  const teacher = course.teacher as unknown as { name: string; bio: string };

  // Fetch PDF materials (only if enrolled)
  const materials = isEnrolled
    ? await PDFResource.find({ course: id }).select('title fileUrl createdAt').sort({ createdAt: -1 })
    : [];

  // Find "continue" video (first not completed)
  const continueVideo = isEnrolled
    ? videos.find((v) => !progressMap.get(v._id.toString())?.isCompleted)
    : null;

  const publishedVideoIds = new Set(videos.map((v) => v._id.toString()));
  const completedCount = progressRecords.filter(
    (p) => p.isCompleted && publishedVideoIds.has(p.video.toString())
  ).length;
  // Average percentComplete across all published videos (unwatched counts as 0%)
  const pctByVideo = new Map(progressRecords.map((p) => [p.video.toString(), p.percentComplete ?? 0]));
  const sumPct = [...publishedVideoIds].reduce((sum, vid) => sum + (pctByVideo.get(vid) ?? 0), 0);
  const overallPct = videos.length > 0 ? Math.round(sumPct / videos.length) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      {/* Banner */}
      {course.bannerImage ? (
        <img src={course.bannerImage} alt={course.title} className="w-full h-52 object-cover rounded-2xl mb-6" />
      ) : (
        <div className="w-full h-52 rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center mb-6">
          <BookOpen size={48} className="text-indigo-300" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
            <p className="text-sm text-slate-500 mt-1">by {teacher.name}</p>
            <div className="mt-3">
              <DescriptionRenderer text={course.description} />
            </div>
          </div>

          {/* PDF Materials */}
          {materials.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileText size={15} className="text-indigo-500" />
                <h2 className="font-semibold text-slate-800 text-sm">Course Materials</h2>
                <span className="text-xs text-slate-400">({materials.length})</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {(materials as Array<{ _id: { toString(): string }; title: string; fileUrl: string; createdAt: Date }>).map((m) => (
                  <li key={m._id.toString()} className="px-5 py-3 flex items-center gap-3 group hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={15} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                      <p className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <a
                      href={`/api/download?url=${encodeURIComponent(m.fileUrl)}&filename=${encodeURIComponent(m.title)}`}
                      download={`${m.title}.pdf`}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors flex-shrink-0"
                    >
                      <Download size={12} /> Download
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Video list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm">Course Content</h2>
              <span className="text-xs text-slate-400">{videos.length} videos</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {videos.map((v, i) => {
                const prog = progressMap.get(v._id.toString());
                const completed = prog?.isCompleted ?? false;
                const pct = prog?.percentComplete ?? 0;
                // Preview: only first video accessible if not enrolled
                const accessible = isEnrolled || i === 0;

                return (
                  <li key={v._id.toString()}>
                    {accessible ? (
                      <Link
                        href={`/student/courses/${id}/video/${v._id}`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex-shrink-0">
                          {completed ? (
                            <CheckCircle2 size={18} className="text-green-500" />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300 group-hover:border-indigo-400 transition-colors flex items-center justify-center">
                              <span className="text-[9px] font-bold text-slate-400 group-hover:text-indigo-500">{i + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-700 truncate">{v.title}</p>
                          {pct > 0 && pct < 100 && (
                            <div className="mt-1 w-full h-1 bg-slate-100 rounded-full">
                              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {v.duration > 0 && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock size={11} />{fmtDuration(v.duration)}
                            </span>
                          )}
                          {!isEnrolled && i === 0 && (
                            <span className="text-xs text-indigo-600 font-medium">Preview</span>
                          )}
                          <PlayCircle size={16} className="text-slate-300 group-hover:text-indigo-500" />
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-4 px-5 py-4 opacity-50 cursor-not-allowed">
                        <Lock size={16} className="text-slate-400 flex-shrink-0" />
                        <p className="text-sm text-slate-500 flex-1 truncate">{v.title}</p>
                        {v.duration > 0 && (
                          <span className="text-xs text-slate-400">{fmtDuration(v.duration)}</span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {isEnrolled ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">Your Progress</h3>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-indigo-600">{overallPct}%</span>
                <span className="text-xs text-slate-400">{completedCount}/{videos.length} done</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${overallPct}%` }} />
              </div>
              {continueVideo && (
                <Link
                  href={`/student/courses/${id}/video/${continueVideo._id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <PlayCircle size={16} /> Continue
                </Link>
              )}
              {overallPct === 100 && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle2 size={16} /> Course Completed!
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <Lock size={20} className="text-amber-500 mb-2" />
              <h3 className="font-semibold text-slate-800 text-sm mb-1">Preview Mode</h3>
              <p className="text-xs text-slate-500">You&apos;re viewing a preview. Contact your admin to get full access to this course.</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">About Instructor</h3>
            <p className="font-medium text-slate-800 text-sm">{teacher.name}</p>
            {teacher.bio && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{teacher.bio}</p>}
          </div>
        </div>
      </div>

      {/* Course-level comments */}
      <div className="mt-6 max-w-4xl">
        <CommentSection courseId={id} isEnrolled={isEnrolled} />
      </div>

      {/* Floating AI assistant */}
      {isEnrolled && <AiAssistant courseId={id} />}
    </div>
  );
}
