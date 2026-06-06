import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import LiveSession from '@/models/LiveSession';
import Batch from '@/models/Batch';
import mongoose from 'mongoose';
import { z } from 'zod';

const markSchema = z.object({
  sessionId: z.string().min(1),
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(['present', 'absent', 'late']),
  })).min(1),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const studentId = searchParams.get('studentId');
  const batchId = searchParams.get('batchId');

  const filter: Record<string, unknown> = {};

  if (session.user.role === 'student') {
    filter.student = session.user.id;
  } else if (session.user.role === 'teacher') {
    // Teacher sees attendance for their own sessions only
    const teacherSessions = await LiveSession.find({ teacher: session.user.id }).select('_id');
    filter.session = { $in: teacherSessions.map((s) => s._id) };
  }

  if (sessionId) filter.session = sessionId;
  if (studentId && session.user.role !== 'student') filter.student = studentId;
  if (batchId) filter.batch = batchId;

  const records = await Attendance.find(filter)
    .populate('student', 'name email avatar')
    .populate('session', 'title scheduledAt status')
    .populate('batch', 'name')
    .populate('markedBy', 'name')
    .sort({ markedAt: -1 });

  return NextResponse.json({ success: true, data: records });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = markSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();

  const liveSession = await LiveSession.findById(parsed.data.sessionId).populate('batch');
  if (!liveSession) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

  if (session.user.role === 'teacher' && liveSession.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const batchId = liveSession.batch._id ?? liveSession.batch;

  const toOid = (id: string) => new mongoose.Types.ObjectId(id);

  // Upsert attendance records
  const ops = parsed.data.records.map(({ studentId, status }) => ({
    updateOne: {
      filter: {
        session: toOid(parsed.data.sessionId),
        student: toOid(studentId),
      },
      update: {
        $set: {
          session: toOid(parsed.data.sessionId),
          student: toOid(studentId),
          batch: batchId,
          markedBy: toOid(session.user.id),
          status,
          markedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(ops);

  const records = await Attendance.find({ session: parsed.data.sessionId })
    .populate('student', 'name email avatar')
    .sort({ markedAt: -1 });

  return NextResponse.json({ success: true, data: records });
}
