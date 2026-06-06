import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PDFResource from '@/models/PDFResource';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  // Students must be enrolled
  if (session.user.role === 'student') {
    const enrolled = await Enrollment.findOne({ student: session.user.id, course: id, isActive: true });
    if (!enrolled) return NextResponse.json({ success: false, error: 'Not enrolled' }, { status: 403 });
  }

  // Teachers must own the course
  if (session.user.role === 'teacher') {
    const course = await Course.findById(id).select('teacher');
    if (!course || course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
  }

  const materials = await PDFResource.find({ course: id })
    .select('title fileUrl createdAt uploadedBy')
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });

  return NextResponse.json({ success: true, data: materials });
}
