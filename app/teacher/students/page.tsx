export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Batch from '@/models/Batch';
import Attendance from '@/models/Attendance';
import LiveSession from '@/models/LiveSession';
import { Users, Clock } from 'lucide-react';
import StudentList from '@/components/teacher/StudentList';
import mongoose from 'mongoose';

interface StudentRecord {
  _id: { toString(): string };
  name: string;
  email: string;
  avatar?: string;
}

interface BatchDoc {
  _id: { toString(): string };
  name: string;
  schedule: string;
  isActive: boolean;
  course: { _id: { toString(): string }; title: string } | null;
  students: StudentRecord[];
}

export default async function TeacherStudentsPage() {
  const session = await auth();
  await connectDB();

  const batches = (await Batch.find({ teacher: session!.user.id, isActive: true })
    .populate('course', 'title')
    .populate('students', 'name email avatar')
    .sort({ createdAt: -1 })) as unknown as BatchDoc[];

  // Fetch sessions with their batch so we can compute per-batch session counts
  const teacherSessions = await LiveSession.find({ teacher: session!.user.id }).select('_id batch');
  const sessionIds = teacherSessions.map((s) => s._id);

  // batchId (string) → list of session IDs in that batch
  const sessionsByBatch = new Map<string, string[]>();
  for (const s of teacherSessions) {
    const bid = String(s.batch);
    if (!sessionsByBatch.has(bid)) sessionsByBatch.set(bid, []);
    sessionsByBatch.get(bid)!.push(String(s._id));
  }

  // Deduplicate students by string ID so Map key comparison is reliable
  const uniqueStudentsMap = new Map<string, StudentRecord>();
  batches.forEach((b) =>
    b.students.forEach((s) => {
      const id = String(s._id);
      if (!uniqueStudentsMap.has(id)) uniqueStudentsMap.set(id, s);
    })
  );

  const allStudentIds = [...uniqueStudentsMap.keys()];

  const attendanceStats = await Attendance.aggregate([
    { $match: { session: { $in: sessionIds }, student: { $in: allStudentIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    {
      $group: {
        _id: '$student',
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        late:    { $sum: { $cond: [{ $eq: ['$status', 'late']    }, 1, 0] } },
        absent:  { $sum: { $cond: [{ $eq: ['$status', 'absent']  }, 1, 0] } },
        total:   { $sum: 1 },
      },
    },
  ]);

  // String keys — safe for Map.get() lookups
  const statsMap = new Map(attendanceStats.map((a) => [String(a._id), a]));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Students</h1>
        <p className="text-sm text-slate-500 mt-0.5">Students enrolled in your batches</p>
      </div>

      {/* Batch summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {batches.map((b) => (
          <div key={b._id.toString()} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{b.name}</h3>
                {b.course && <p className="text-xs text-slate-400 mt-0.5 truncate">{b.course.title}</p>}
              </div>
              <span className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-indigo-600" />
              </span>
            </div>
            {b.schedule && (
              <p className="text-xs text-slate-500 mb-2">
                <Clock size={12} className="inline mr-1 text-slate-400" />{b.schedule}
              </p>
            )}
            <p className="text-2xl font-bold text-indigo-600">{b.students.length}</p>
            <p className="text-xs text-slate-400">enrolled students</p>
          </div>
        ))}

        {batches.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-10 flex flex-col items-center text-center">
            <Users size={32} className="text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No batches yet</p>
            <p className="text-sm text-slate-400 mt-1">Create batches from the Live Classes page to see students here.</p>
          </div>
        )}
      </div>

      {/* Student list with search + pagination */}
      <StudentList students={[...uniqueStudentsMap.entries()].map(([sid, s]) => {
        const stats = statsMap.get(sid) ?? { present: 0, late: 0, absent: 0, total: 0 };
        const studentBatches = batches.filter((b) => b.students.some((st) => String(st._id) === sid));
        const relevantSessions = new Set<string>();
        studentBatches.forEach((b) => (sessionsByBatch.get(String(b._id)) ?? []).forEach((id) => relevantSessions.add(id)));
        const totalSessions = relevantSessions.size;
        const pct = totalSessions > 0 ? Math.round(((stats.present + stats.late) / totalSessions) * 100) : null;
        return {
          id: sid, name: s.name, email: s.email,
          batches: studentBatches.map((b) => b.name),
          present: stats.present, late: stats.late, absent: stats.absent, total: stats.total,
          pct,
        };
      })} />
    </div>
  );
}
