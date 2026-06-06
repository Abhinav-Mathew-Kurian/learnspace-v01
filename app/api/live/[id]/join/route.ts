import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import Batch from '@/models/Batch';

type Params = { params: Promise<{ id: string }> };

// Only returns meet link if the student belongs to the session's batch
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const liveSession = await LiveSession.findById(id).populate('batch');
  if (!liveSession) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

  // Zombie meet link guard: ended sessions must never expose credentials
  if (liveSession.status === 'ended') {
    return NextResponse.json({ success: false, error: 'This session has ended. The meet link is no longer available.' }, { status: 410 });
  }

  if (session.user.role === 'teacher') {
    if (liveSession.teacher.toString() !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({
      success: true,
      data: { meetLink: liveSession.meetLink, meetPassword: liveSession.meetPassword },
    });
  }

  if (session.user.role === 'admin') {
    return NextResponse.json({
      success: true,
      data: { meetLink: liveSession.meetLink, meetPassword: liveSession.meetPassword },
    });
  }

  // Student: verify batch membership
  const batch = await Batch.findById(liveSession.batch._id ?? liveSession.batch);
  if (!batch) return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });

  const isMember = batch.students.some((s: { toString(): string }) => s.toString() === session.user.id);
  if (!isMember) {
    return NextResponse.json({ success: false, error: 'You are not enrolled in this batch.' }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    data: { meetLink: liveSession.meetLink, meetPassword: liveSession.meetPassword },
  });
}
