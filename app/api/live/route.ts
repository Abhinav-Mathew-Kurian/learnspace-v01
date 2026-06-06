import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import Batch from '@/models/Batch';
import { z } from 'zod';

const createSchema = z.object({
  batchId: z.string().min(1),
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().min(1).max(480),
  meetLink: z.string().url(),
  meetPassword: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batchId');
  const courseId = searchParams.get('courseId');
  const status = searchParams.get('status');

  const filter: Record<string, unknown> = {};

  const teacherId = searchParams.get('teacherId');

  if (session.user.role === 'teacher') {
    filter.teacher = session.user.id;
  } else if (session.user.role === 'admin' && teacherId) {
    filter.teacher = teacherId;
  } else if (session.user.role === 'student') {
    const studentBatches = await Batch.find({ students: session.user.id, isActive: true }).select('_id');
    filter.batch = { $in: studentBatches.map((b) => b._id) };
  }

  if (batchId) filter.batch = batchId;
  if (courseId) filter.course = courseId;
  if (status) filter.status = status;

  const sessions = await LiveSession.find(filter)
    .populate('batch', 'name schedule students')
    .populate('teacher', 'name avatar')
    .populate('course', 'title bannerImage')
    .sort({ scheduledAt: -1 });

  // Strip meetLink from list response for students — only expose via /join endpoint
  const safe = sessions.map((s) => {
    const obj = s.toObject() as unknown as Record<string, unknown>;
    if (session.user.role === 'student') {
      delete obj.meetLink;
      delete obj.meetPassword;
    }
    return obj;
  });

  return NextResponse.json({ success: true, data: safe });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();

  const batch = await Batch.findById(parsed.data.batchId);
  if (!batch) return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });

  if (session.user.role === 'teacher' && batch.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const teacherId = session.user.role === 'teacher' ? session.user.id : batch.teacher;

  const liveSession = await LiveSession.create({
    batch: parsed.data.batchId,
    teacher: teacherId,
    course: parsed.data.courseId,
    title: parsed.data.title,
    scheduledAt: new Date(parsed.data.scheduledAt),
    duration: parsed.data.duration,
    meetLink: parsed.data.meetLink,
    meetPassword: parsed.data.meetPassword ?? null,
    status: 'scheduled',
  });

  const populated = await liveSession.populate([
    { path: 'batch', select: 'name schedule' },
    { path: 'teacher', select: 'name avatar' },
    { path: 'course', select: 'title' },
  ]);

  return NextResponse.json({ success: true, data: populated }, { status: 201 });
}
