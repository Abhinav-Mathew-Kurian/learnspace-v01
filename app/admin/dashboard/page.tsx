import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';
import Batch from '@/models/Batch';
import Attendance from '@/models/Attendance';
import Link from 'next/link';
import {
  GraduationCap, Users, BookOpen, AlertTriangle,
  Clock, DollarSign, TrendingUp, BarChart3,
  ArrowRight, CheckCircle2,
} from 'lucide-react';
import mongoose from 'mongoose';

async function getDashboardData() {
  await connectDB();
  const now = new Date();

  const [totalStudents, activeStudents, bannedUsers, totalTeachers, expiredStudents, installmentPending] =
    await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', isActive: true, isBanned: false }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'student', subscriptionExpiry: { $lt: now, $ne: null } }),
      User.countDocuments({ role: 'student', installmentPending: true }),
    ]);

  // Per-course enrollment + completion (top 6)
  type PopulatedCourse = { _id: mongoose.Types.ObjectId; title: string; totalVideos: number };
  const courses = (await Course.find({ isPublished: true })
    .select('title totalVideos')
    .sort({ createdAt: -1 })
    .limit(6)
    .lean()) as unknown as PopulatedCourse[];

  const courseStats = await Promise.all(
    courses.map(async (c) => {
      const enrollCount = await Enrollment.countDocuments({ course: c._id, isActive: true });
      const completedCount = await Progress.countDocuments({ course: c._id, isCompleted: true });
      const uniqueStudents = await Progress.distinct('student', { course: c._id });
      const denominator = uniqueStudents.length * (c.totalVideos || 1);
      const completionRate = denominator > 0 ? Math.min(Math.round((completedCount / denominator) * 100), 100) : 0;
      return { id: String(c._id), title: c.title, enrollCount, completionRate };
    })
  );

  // Batch attendance (top 5)
  const batches = (await Batch.find({}).select('name').limit(5).lean()) as Array<{ _id: mongoose.Types.ObjectId; name: string }>;
  const batchStats = await Promise.all(
    batches.map(async (b) => {
      const total = await Attendance.countDocuments({ batch: b._id });
      const present = await Attendance.countDocuments({ batch: b._id, status: { $in: ['present', 'late'] } });
      return {
        id: String(b._id),
        name: b.name,
        rate: total > 0 ? Math.round((present / total) * 100) : null,
        total,
      };
    })
  );

  return { totalStudents, activeStudents, bannedUsers, totalTeachers, expiredStudents, installmentPending, courseStats, batchStats };
}

export default async function AdminDashboard() {
  const session = await auth();
  const data = await getDashboardData();
  const { totalStudents, activeStudents, bannedUsers, totalTeachers, expiredStudents, installmentPending, courseStats, batchStats } = data;

  const statCards = [
    { label: 'Total Students', value: totalStudents, sub: `${activeStudents} active`, Icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Teachers', value: totalTeachers, sub: 'on platform', Icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Expired Subscriptions', value: expiredStudents, sub: 'need renewal', Icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Installment Pending', value: installmentPending, sub: 'students', Icon: DollarSign, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Banned Users', value: bannedUsers, sub: 'all roles', Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Published Courses', value: courseStats.length, sub: 'shown below', Icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Welcome back, {session?.user.name}</p>
      </div>

      {/* Alerts banner */}
      {(installmentPending > 0 || expiredStudents > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {installmentPending > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700 font-medium">
              <DollarSign size={14} />
              {installmentPending} student{installmentPending > 1 ? 's' : ''} have pending installments
              <Link href="/admin/analytics" className="ml-1 underline text-orange-600 text-xs">View</Link>
            </div>
          )}
          {expiredStudents > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium">
              <Clock size={14} />
              {expiredStudents} subscription{expiredStudents > 1 ? 's' : ''} expired
            </div>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {statCards.map(({ label, value, sub, Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex items-start gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div className="min-w-0">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">{label}</p>
              <p className="text-xs text-slate-400 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { href: '/admin/students', label: 'Manage Students', Icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50 hover:bg-indigo-100' },
          { href: '/admin/teachers', label: 'Manage Teachers', Icon: Users, color: 'text-sky-600', bg: 'bg-sky-50 hover:bg-sky-100' },
          { href: '/admin/analytics', label: 'Full Analytics', Icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-100' },
        ].map(({ href, label, Icon, color, bg }) => (
          <Link key={href} href={href} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 ${bg} transition-colors group`}>
            <Icon size={18} className={`${color} flex-shrink-0`} />
            <span className={`text-sm font-semibold ${color}`}>{label}</span>
            <ArrowRight size={14} className={`${color} ml-auto opacity-0 group-hover:opacity-100 transition-opacity`} />
          </Link>
        ))}
      </div>

      {/* Course enrollment + completion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-500" /> Course Enrolment & Completion
            </h2>
            <Link href="/admin/analytics" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Full report <ArrowRight size={11} />
            </Link>
          </div>
          {courseStats.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <BookOpen size={24} className="text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No published courses yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {courseStats.map((c) => (
                <div key={c.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-slate-800 truncate flex-1 mr-3">{c.title}</p>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-indigo-600 font-bold">{c.enrollCount} enrolled</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${c.completionRate >= 70 ? 'bg-green-500' : c.completionRate >= 40 ? 'bg-indigo-500' : 'bg-amber-400'}`}
                        style={{ width: `${c.completionRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-9 text-right font-medium">{c.completionRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batch attendance */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" /> Attendance Rate by Batch
            </h2>
          </div>
          {batchStats.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <Users size={24} className="text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No batches yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {batchStats.map((b) => (
                <div key={b.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{b.name}</p>
                    <p className="text-xs text-slate-400">{b.total} sessions recorded</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    b.rate === null ? 'bg-slate-100 text-slate-400'
                    : b.rate >= 75 ? 'bg-green-100 text-green-700'
                    : b.rate >= 50 ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {b.rate !== null ? `${b.rate}%` : 'No data'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
