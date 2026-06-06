import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';
import Attendance from '@/models/Attendance';
import Video from '@/models/Video';
import Batch from '@/models/Batch';
import { istDate } from '@/lib/ist';
import { Users, BookOpen, TrendingUp, AlertTriangle, Clock, DollarSign, CheckCircle2, BarChart3 } from 'lucide-react';

async function getAnalytics() {
  await connectDB();
  const now = new Date();

  const [
    totalStudents,
    activeStudents,
    expiredStudents,
    bannedUsers,
    installmentPending,
    totalTeachers,
    totalCourses,
    publishedCourses,
    totalEnrollments,
    activeEnrollments,
    totalVideos,
    completedProgress,
    totalProgressRecords,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', isActive: true, isBanned: false, $or: [{ subscriptionExpiry: null }, { subscriptionExpiry: { $gt: now } }] }),
    User.countDocuments({ role: 'student', subscriptionExpiry: { $lt: now, $ne: null } }),
    User.countDocuments({ isBanned: true }),
    User.countDocuments({ role: 'student', installmentPending: true }),
    User.countDocuments({ role: 'teacher' }),
    Course.countDocuments({}),
    Course.countDocuments({ isPublished: true }),
    Enrollment.countDocuments({}),
    Enrollment.countDocuments({ isActive: true }),
    Video.countDocuments({ isPublished: true }),
    Progress.countDocuments({ isCompleted: true }),
    Progress.countDocuments({}),
  ]);

  type PopulatedCourse = { _id: mongoose.Types.ObjectId; title: string; totalVideos: number; teacher: { name: string } | null };

  // Per-course stats — single aggregation pass per collection instead of N+1 queries
  const courses = (await Course.find({ isPublished: true })
    .select('title totalVideos teacher')
    .populate('teacher', 'name')
    .lean()) as unknown as PopulatedCourse[];

  const courseIds = courses.map((c) => c._id);

  const [enrollAgg, progressAgg] = await Promise.all([
    Enrollment.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { course: { $in: courseIds }, isActive: true } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
    Progress.aggregate<{ _id: mongoose.Types.ObjectId; completedCount: number; uniqueStudents: mongoose.Types.ObjectId[] }>([
      { $match: { course: { $in: courseIds } } },
      { $group: {
        _id: '$course',
        completedCount: { $sum: { $cond: ['$isCompleted', 1, 0] } },
        uniqueStudents: { $addToSet: '$student' },
      }},
    ]),
  ]);

  const enrollMap = new Map(enrollAgg.map((e) => [String(e._id), e.count]));
  const progressMap = new Map(progressAgg.map((p) => [String(p._id), p]));

  const courseStats = courses.map((c) => {
    const cid = String(c._id);
    const enrollCount = enrollMap.get(cid) ?? 0;
    const prog = progressMap.get(cid);
    const completedCount = prog?.completedCount ?? 0;
    const uniqueCount = prog?.uniqueStudents.length ?? 0;
    const completionRate = uniqueCount > 0
      ? Math.round((completedCount / (uniqueCount * (c.totalVideos || 1))) * 100)
      : 0;
    return {
      id: cid,
      title: c.title,
      teacher: c.teacher?.name ?? '—',
      totalVideos: c.totalVideos,
      enrollCount,
      completionRate: Math.min(completionRate, 100),
    };
  });

  // Attendance rate by batch — single aggregation instead of 2 queries per batch
  const batches = await Batch.find({}).select('name').lean() as Array<{ _id: mongoose.Types.ObjectId; name: string }>;
  const batchIds = batches.map((b) => b._id);

  const attendanceAgg = await Attendance.aggregate<{ _id: mongoose.Types.ObjectId; total: number; present: number }>([
    { $match: { batch: { $in: batchIds } } },
    { $group: {
      _id: '$batch',
      total: { $sum: 1 },
      present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
    }},
  ]);

  const attendanceMap = new Map(attendanceAgg.map((a) => [String(a._id), a]));

  const batchStats = batches.map((b) => {
    const att = attendanceMap.get(String(b._id));
    const total = att?.total ?? 0;
    const present = att?.present ?? 0;
    return {
      id: String(b._id),
      name: b.name,
      total,
      present,
      rate: total > 0 ? Math.round((present / total) * 100) : null,
    };
  });

  // Installment pending students
  const pendingStudents = await User.find({ role: 'student', installmentPending: true })
    .select('name email installmentAmount installmentDueDate subscriptionExpiry')
    .lean() as Array<{
      _id: unknown;
      name: string;
      email: string;
      installmentAmount: number | null;
      installmentDueDate: Date | null;
      subscriptionExpiry: Date | null;
    }>;

  const overallCompletionRate = totalProgressRecords > 0
    ? Math.round((completedProgress / totalProgressRecords) * 100)
    : 0;

  return {
    overview: { totalStudents, activeStudents, expiredStudents, bannedUsers, installmentPending, totalTeachers, totalCourses, publishedCourses, totalEnrollments, activeEnrollments, totalVideos, overallCompletionRate },
    courseStats,
    batchStats,
    pendingStudents: pendingStudents.map((s) => ({
      id: String(s._id),
      name: s.name,
      email: s.email,
      amount: s.installmentAmount,
      dueDate: s.installmentDueDate ? istDate(s.installmentDueDate) : null,
      expiryDate: s.subscriptionExpiry ? istDate(s.subscriptionExpiry) : null,
      isOverdue: s.installmentDueDate ? new Date(s.installmentDueDate) < now : false,
    })),
  };
}

export default async function AnalyticsPage() {
  await auth();
  const data = await getAnalytics();
  const { overview, courseStats, batchStats, pendingStudents } = data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Platform-wide stats across users, courses, and engagement</p>
      </div>

      {/* Overview grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users size={18} className="text-indigo-600" />} label="Total Students" value={overview.totalStudents} sub={`${overview.activeStudents} active`} bg="bg-indigo-50" />
        <StatCard icon={<CheckCircle2 size={18} className="text-green-600" />} label="Active Enrolments" value={overview.activeEnrollments} sub={`${overview.totalEnrollments} total`} bg="bg-green-50" />
        <StatCard icon={<BookOpen size={18} className="text-sky-600" />} label="Published Courses" value={overview.publishedCourses} sub={`${overview.totalVideos} videos`} bg="bg-sky-50" />
        <StatCard icon={<TrendingUp size={18} className="text-violet-600" />} label="Completion Rate" value={`${overview.overallCompletionRate}%`} sub="across all videos" bg="bg-violet-50" />
        <StatCard icon={<Clock size={18} className="text-amber-600" />} label="Expired Accounts" value={overview.expiredStudents} sub="need renewal" bg="bg-amber-50" />
        <StatCard icon={<AlertTriangle size={18} className="text-red-500" />} label="Banned Users" value={overview.bannedUsers} sub="all roles" bg="bg-red-50" />
        <StatCard icon={<DollarSign size={18} className="text-orange-500" />} label="Installment Pending" value={overview.installmentPending} sub="students" bg="bg-orange-50" />
        <StatCard icon={<BarChart3 size={18} className="text-teal-600" />} label="Teachers" value={overview.totalTeachers} sub={`${overview.totalCourses} courses`} bg="bg-teal-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Per-course stats */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Course Enrolment & Completion</h2>
          </div>
          {courseStats.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <BookOpen size={28} className="text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No published courses yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {courseStats.map((c) => (
                <div key={c.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.title}</p>
                      <p className="text-xs text-slate-400">{c.teacher} · {c.totalVideos} videos</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-indigo-600">{c.enrollCount}</p>
                      <p className="text-xs text-slate-400">enrolled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${c.completionRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{c.completionRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batch attendance */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Attendance Rate by Batch</h2>
          </div>
          {batchStats.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Users size={28} className="text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No batches created yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {batchStats.map((b) => (
                <div key={b.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-800">{b.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{b.present}/{b.total} records</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        b.rate === null ? 'bg-slate-100 text-slate-400'
                        : b.rate >= 75 ? 'bg-green-100 text-green-700'
                        : b.rate >= 50 ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                      }`}>
                        {b.rate !== null ? `${b.rate}%` : 'No data'}
                      </span>
                    </div>
                  </div>
                  {b.rate !== null && (
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${b.rate >= 75 ? 'bg-green-500' : b.rate >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${b.rate}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Installment pending */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <DollarSign size={15} className="text-orange-500" />
          <h2 className="font-semibold text-slate-800 text-sm">Installment Pending</h2>
          {pendingStudents.length > 0 && (
            <span className="ml-auto text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
              {pendingStudents.length} student{pendingStudents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {pendingStudents.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <CheckCircle2 size={28} className="text-green-300 mb-2" />
            <p className="text-sm text-slate-500 font-medium">All clear — no pending installments</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount Due</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subscription Expiry</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700">
                        {s.amount != null ? `₹${s.amount.toLocaleString()}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{s.dueDate ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{s.expiryDate ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {s.isOverdue ? 'Overdue' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, bg }: { icon: React.ReactNode; label: string; value: string | number; sub: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-5`}>
      <div className="flex items-center gap-2 mb-3">{icon}</div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs font-medium text-slate-700 mt-0.5">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}
