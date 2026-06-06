import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const enrollments = await Enrollment.find({ student: session.user.id, isActive: true })
    .populate('course', 'title bannerImage')
    .sort({ enrolledAt: -1 });

  return NextResponse.json({ success: true, data: enrollments });
}
