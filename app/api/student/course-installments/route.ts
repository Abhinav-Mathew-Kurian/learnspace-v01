import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import CourseInstallment from '@/models/CourseInstallment';

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const installments = await CourseInstallment.find({ student: session.user.id })
    .populate('course', 'title currency')
    .sort({ course: 1, installmentNumber: 1 })
    .lean();

  return NextResponse.json({ success: true, data: installments });
}
