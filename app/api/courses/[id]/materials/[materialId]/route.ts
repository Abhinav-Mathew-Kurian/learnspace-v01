import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PDFResource from '@/models/PDFResource';
import Course from '@/models/Course';

type Params = { params: Promise<{ id: string; materialId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id, materialId } = await params;
  await connectDB();

  // Teachers must own the course
  if (session.user.role === 'teacher') {
    const course = await Course.findById(id).select('teacher');
    if (!course || course.teacher.toString() !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
  }

  const material = await PDFResource.findById(materialId);
  if (!material) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  if (material.course.toString() !== id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await material.deleteOne();
  return NextResponse.json({ success: true, data: null });
}
