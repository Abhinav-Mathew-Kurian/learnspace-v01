export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import VideoModel from '@/models/Video';
import Link from 'next/link';
import { BookOpen, Video, Plus, Radio, Users } from 'lucide-react';
import LiveSession from '@/models/LiveSession';
import Batch from '@/models/Batch';
import mongoose from 'mongoose';

export default async function TeacherDashboard() {
  const session = await auth();
  await connectDB();

  const courses = await Course.find({ teacher: session!.user.id });
  const published = courses.filter((c) => c.isPublished).length;

  const courseIds = courses.map((c) => c._id);
  const [publishedCounts, upcomingSessions, batches] = await Promise.all([
    VideoModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { course: { $in: courseIds }, isPublished: true } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
    LiveSession.find({ teacher: session!.user.id, status: { $in: ['scheduled', 'live'] } })
      .populate('batch', 'name')
      .populate('course', 'title')
      .sort({ scheduledAt: 1 })
      .limit(5),
    Batch.find({ teacher: session!.user.id, isActive: true }),
  ]);

  const countByCourse = new Map<string, number>(
    publishedCounts.map((row) => [String(row._id), row.count])
  );
  const totalVideos = publishedCounts.reduce((sum, row) => sum + row.count, 0);
  const teacherOid = new mongoose.Types.ObjectId(session!.user.id);
  const totalStudents = (await Batch.aggregate([
    { $match: { teacher: teacherOid } },
    { $unwind: '$students' },
    { $group: { _id: '$students' } },
    { $count: 'total' },
  ]))[0]?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Welcome back, {session?.user.name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Here&apos;s your teaching overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">{courses.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Courses</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Video size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{totalVideos}</p>
            <p className="text-xs text-slate-500 mt-0.5">Published Videos</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
            <Radio size={20} className="text-sky-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-sky-600">{upcomingSessions.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Upcoming Sessions</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-violet-600">{totalStudents}</p>
            <p className="text-xs text-slate-500 mt-0.5">My Students</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">My Courses</h2>
            <Link href="/teacher/courses" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          {courses.length === 0 ? (
            <div className="text-center py-6">
              <BookOpen size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 mb-3">No courses yet</p>
              <Link href="/teacher/courses" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline">
                <Plus size={14} /> Create your first course
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {courses.slice(0, 5).map((c) => (
                <li key={c._id.toString()}>
                  <Link href={`/teacher/courses/${c._id}`} className="flex items-center justify-between py-2.5 hover:text-indigo-600 group">
                    <div className="flex items-center gap-2.5">
                      <BookOpen size={14} className="text-slate-400 group-hover:text-indigo-500" />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 truncate max-w-xs">{c.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="flex items-center gap-1 text-xs text-slate-400"><Video size={11} />{countByCourse.get(c._id.toString()) ?? 0}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${c.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {c.isPublished ? 'Live' : 'Draft'}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Radio size={16} className="text-red-500" /> Upcoming Live Sessions
          </h2>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-6">
              <Radio size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 mb-3">No upcoming sessions</p>
              <Link href="/teacher/live" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline">
                <Plus size={14} /> Schedule a class
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingSessions.map((s) => {
                const sess = s as unknown as { _id: { toString(): string }; title: string; scheduledAt: Date; status: string; batch: { name: string } | null; course: { title: string } | null };
                return (
                  <li key={sess._id.toString()} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sess.status === 'live' ? 'bg-red-500' : 'bg-sky-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{sess.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{sess.batch?.name ?? ''} · {new Date(sess.scheduledAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} at {new Date(sess.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${sess.status === 'live' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'}`}>
                      {sess.status === 'live' ? 'Live' : 'Scheduled'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/teacher/live" className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:underline mt-4">
            View all sessions →
          </Link>
        </div>
      </div>
    </div>
  );
}
