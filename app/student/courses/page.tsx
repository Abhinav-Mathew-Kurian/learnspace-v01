export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Link from 'next/link';
import { BookOpen, PlayCircle } from 'lucide-react';

interface CourseWithProgress {
  _id: string;
  title: string;
  description: string;
  bannerImage: string;
  category: string;
  totalVideos: number;
  teacher: { name: string };
  completedVideos: number;
  percent: number;
  nextVideoId?: string;
}

async function getEnrolledCourses(userId: string): Promise<CourseWithProgress[]> {
  await connectDB();

  const enrollments = await Enrollment.find({ student: userId, isActive: true });
  const courseIds = enrollments.map((e) => e.course);

  const courses = await Course.find({ _id: { $in: courseIds }, isPublished: true })
    .populate('teacher', 'name');

  const [progressRecords, publishedVideos] = await Promise.all([
    Progress.find({ student: userId, course: { $in: courseIds } }),
    Video.find({ course: { $in: courseIds }, isPublished: true }).select('_id course order').sort({ order: 1 }),
  ]);

  // Build per-course set of published video IDs for accurate counts
  const publishedByCourse = new Map<string, Set<string>>();
  for (const v of publishedVideos) {
    const cId = v.course.toString();
    if (!publishedByCourse.has(cId)) publishedByCourse.set(cId, new Set());
    publishedByCourse.get(cId)!.add(v._id.toString());
  }

  return courses.map((c) => {
    const courseProgress = progressRecords.filter(
      (p) => p.course.toString() === c._id.toString()
    );
    const publishedIds = publishedByCourse.get(c._id.toString()) ?? new Set<string>();

    // Build a map of videoId → percentComplete for quick lookup
    const pctByVideo = new Map(
      courseProgress.map((p) => [p.video.toString(), p.percentComplete ?? 0])
    );
    const completed = courseProgress.filter(
      (p) => p.isCompleted && publishedIds.has(p.video.toString())
    ).length;

    // Average percentComplete across ALL published videos (unwatched = 0%)
    const sumPct = [...publishedIds].reduce((sum, vid) => sum + (pctByVideo.get(vid) ?? 0), 0);
    const pct = publishedIds.size > 0 ? Math.round(sumPct / publishedIds.size) : 0;

    // "Continue" = first video that has some progress but isn't done yet,
    // or the first video if nothing started
    const inProgress = courseProgress.find(
      (p) => !p.isCompleted && publishedIds.has(p.video.toString())
    );
    const firstVideo = publishedVideos.find((v) => publishedIds.has(v._id.toString()) && v.course.toString() === c._id.toString());

    return {
      _id: c._id.toString(),
      title: c.title,
      description: c.description,
      bannerImage: c.bannerImage,
      category: c.category,
      totalVideos: publishedIds.size,
      teacher: { name: (c.teacher as unknown as { name: string }).name },
      completedVideos: completed,
      percent: pct,
      nextVideoId: inProgress?.video.toString() ?? (pct === 0 ? firstVideo?._id.toString() : undefined),
    };
  });
}

export default async function StudentCoursesPage() {
  const session = await auth();
  const courses = await getEnrolledCourses(session!.user.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
        <p className="text-sm text-slate-500 mt-0.5">{courses.length} enrolled</p>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <BookOpen size={24} className="text-indigo-400" />
          </div>
          <h2 className="text-base font-semibold text-slate-700 mb-1">No courses yet</h2>
          <p className="text-sm text-slate-400">Contact your admin to get enrolled in a course.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {courses.map((c) => (
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

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{c.completedVideos}/{c.totalVideos} videos</span>
                    <span className="font-medium text-indigo-600">{c.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${c.percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 group-hover:text-indigo-700">
                  <PlayCircle size={14} />
                  {c.percent === 0 ? 'Start Course' : c.percent === 100 ? 'Review Course' : 'Continue'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
