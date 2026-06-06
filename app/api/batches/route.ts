import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Batch from '@/models/Batch';
import Course from '@/models/Course';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  courseId: z.string().min(1),
  schedule: z.string().default(''),
  studentIds: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  const teacherId = searchParams.get('teacherId');

  const filter: Record<string, unknown> = {};

  if (session.user.role === 'teacher') {
    filter.teacher = session.user.id;
  } else if (session.user.role === 'student') {
    filter.students = session.user.id;
    filter.isActive = true;
  }

  if (courseId) filter.course = courseId;
  if (teacherId && session.user.role === 'admin') filter.teacher = teacherId;

  const batches = await Batch.find(filter)
    .populate('teacher', 'name email avatar')
    .populate('course', 'title bannerImage')
    .populate('students', 'name email avatar')
    .sort({ createdAt: -1 });

  return NextResponse.json({ success: true, data: batches });
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

  const course = await Course.findById(parsed.data.courseId);
  if (!course) return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });

  if (session.user.role === 'teacher' && course.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const teacherId = session.user.role === 'teacher' ? session.user.id : course.teacher;

  const batch = await Batch.create({
    name: parsed.data.name,
    teacher: teacherId,
    course: parsed.data.courseId,
    schedule: parsed.data.schedule,
    students: parsed.data.studentIds,
    isActive: true,
  });

  const populated = await batch.populate([
    { path: 'teacher', select: 'name email avatar' },
    { path: 'course', select: 'title bannerImage' },
    { path: 'students', select: 'name email avatar' },
  ]);

  return NextResponse.json({ success: true, data: populated }, { status: 201 });
}
