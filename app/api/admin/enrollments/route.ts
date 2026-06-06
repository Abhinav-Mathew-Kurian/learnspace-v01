import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import { z } from 'zod';

const enrollSchema = z.object({
  studentId: z.string(),
  courseId: z.string(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const courseId = searchParams.get('courseId');
  const studentId = searchParams.get('studentId');

  if (!courseId && !studentId) {
    return NextResponse.json({ success: false, error: 'courseId or studentId required' }, { status: 400 });
  }

  await connectDB();
  const filter: Record<string, unknown> = {};
  if (courseId) filter.course = courseId;
  if (studentId) filter.student = studentId;

  const enrollments = courseId
    ? await Enrollment.find(filter).populate('student', 'name email avatar')
    : await Enrollment.find(filter)
        .populate('course', 'title bannerImage category totalVideos isPublished pricingType price installmentMonths currency')
        .sort({ enrolledAt: -1 });

  return NextResponse.json({ success: true, data: enrollments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();

  const existing = await Enrollment.findOne({
    student: parsed.data.studentId,
    course: parsed.data.courseId,
  });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
      return NextResponse.json({ success: true, data: existing });
    }
    return NextResponse.json({ success: false, error: 'Already enrolled' }, { status: 409 });
  }

  const enrollment = await Enrollment.create({
    student: parsed.data.studentId,
    course: parsed.data.courseId,
    enrolledBy: session.user.id,
    enrolledAt: new Date(),
  });

  return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const studentId = searchParams.get('studentId');
  const courseId = searchParams.get('courseId');

  if (!studentId || !courseId) {
    return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 });
  }

  await connectDB();
  await Enrollment.findOneAndUpdate(
    { student: studentId, course: courseId },
    { isActive: false }
  );

  return NextResponse.json({ success: true, data: null });
}
