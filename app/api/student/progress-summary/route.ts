import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Progress from '@/models/Progress';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const completedVideos = await Progress.countDocuments({ student: session.user.id, isCompleted: true });

  return NextResponse.json({ success: true, data: { completedVideos } });
}
