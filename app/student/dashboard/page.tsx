import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';
import Course from '@/models/Course';
import Link from 'next/link';
import { PlayCircle, BookOpen, CheckCircle2, ArrowRight, Radio, Trophy, Video } from 'lucide-react';
import { istDateShort, istTime } from '@/lib/ist';
import Batch from '@/models/Batch';
import LiveSession from '@/models/LiveSession';

export default async function StudentDashboard() {
  const session = await auth();
  await connectDB();

  const enrollments = await Enrollment.find({ student: session!.user.id, isActive: true });
  const courseIds = enrollments.map((e) => e.course);

  const studentBatches = await Batch.find({ students: session!.user.id, isActive: true }).select('_id');
  const batchIds = studentBatches.map((b) => b._id);

  const [courses, allProgress, upcomingSessions] = await Promise.all([
    Course.find({ _id: { $in: courseIds }, isPublished: true })
      .populate('teacher', 'name')
      .sort({ createdAt: -1 }),
    Progress.find({ student: session!.user.id, course: { $in: courseIds } }),
    LiveSession.find({ batch: { $in: batchIds }, status: { $in: ['scheduled', 'live'] }, scheduledAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } })
      .populate('course', 'title')
      .populate('batch', 'name')
      .sort({ scheduledAt: 1 })
      .limit(3),
  ]);

  // Fetch published video counts per course for accurate progress denominator
  const publishedVideoCounts = await (await import('@/models/Video')).default.aggregate<{ _id: unknown; count: number; ids: string[] }>([
    { $match: { course: { $in: courseIds }, isPublished: true } },
    { $group: { _id: '$course', count: { $sum: 1 }, ids: { $push: { $toString: '$_id' } } } },
  ]);
  const videoCountMap = new Map(publishedVideoCounts.map((r) => [String(r._id), { count: r.count, ids: r.ids }]));

  const completedVideos = allProgress.filter((p) => p.isCompleted).length;

  const coursesWithProgress = courses.map((c) => {
    const cp = allProgress.filter((p) => p.course.toString() === c._id.toString());
    const done = cp.filter((p) => p.isCompleted).length;
    const videoInfo = videoCountMap.get(c._id.toString());
    const totalVids = videoInfo?.count ?? c.totalVideos;
    const videoIds = videoInfo?.ids ?? [];

    // Average percentComplete across all published videos (unwatched = 0%)
    const pctByVideo = new Map(cp.map((p) => [p.video.toString(), p.percentComplete ?? 0]));
    const sumPct = videoIds.reduce((sum: number, vid: string) => sum + (pctByVideo.get(vid) ?? 0), 0);
    const pct = totalVids > 0 ? Math.round(sumPct / totalVids) : 0;

    return { id: c._id.toString(), title: c.title, bannerImage: c.bannerImage, totalVideos: totalVids, done, pct };
  });

  const completedCourses = coursesWithProgress.filter((c) => c.pct === 100).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Welcome back, {session?.user.name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Keep up the great work!</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex items-start gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">{courses.length}</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">Enrolled Courses</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex items-start gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Video size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{completedVideos}</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">Videos Done</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex items-start gap-3 shadow-sm col-span-2 lg:col-span-1">
          <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
            <Trophy size={16} className="text-sky-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-sky-600">{completedCourses}</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">Courses Completed</p>
          </div>
        </div>
      </div>

      {/* Upcoming live sessions */}
      {upcomingSessions.length > 0 && (
        <div className="mb-8 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Radio size={16} className="text-red-500" /> Upcoming Live Classes</h2>
            <Link href="/student/live" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {(upcomingSessions as unknown as Array<{ _id: { toString(): string }; title: string; scheduledAt: Date; duration: number; status: string; course: { title: string } | null; batch: { name: string } | null }>).map((s) => {
              const isLive = s.status === 'live';
              return (
                <li key={s._id.toString()} className="px-6 py-3 flex items-center gap-4">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isLive ? 'bg-red-500 animate-pulse' : 'bg-sky-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.title}</p>
                    <p className="text-xs text-slate-400">{s.batch?.name} · {s.course?.title}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isLive ? (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">LIVE</span>
                    ) : (
                      <p className="text-xs text-slate-500">{istDateShort(s.scheduledAt)} · {istTime(s.scheduledAt)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200">
          <BookOpen size={36} className="text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700 mb-1">No courses yet</p>
          <p className="text-sm text-slate-400">Contact your admin to get enrolled in a course.</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Continue Learning</h2>
            <Link href="/student/courses" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {coursesWithProgress.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/student/courses/${c.id}`} className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                {c.bannerImage ? (
                  <img src={c.bannerImage} alt={c.title} className="w-full h-32 object-cover group-hover:opacity-95 transition-opacity" />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center">
                    <BookOpen size={28} className="text-indigo-300" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2 line-clamp-2">{c.title}</h3>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{c.done}/{c.totalVideos} videos</span>
                    <span className="font-medium text-indigo-600">{c.pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${c.pct}%` }} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 group-hover:text-indigo-700">
                    {c.pct === 100
                      ? <><CheckCircle2 size={13} className="text-green-500" /> Completed</>
                      : <><PlayCircle size={13} /> {c.pct === 0 ? 'Start' : 'Continue'}</>
                    }
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
