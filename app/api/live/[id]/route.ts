import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().int().min(1).max(480).optional(),
  meetLink: z.string().url().optional(),
  meetPassword: z.string().nullable().optional(),
  status: z.enum(['scheduled', 'live', 'ended']).optional(),
  recordingUrl: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const liveSession = await LiveSession.findById(id)
    .populate('batch', 'name schedule students')
    .populate('teacher', 'name avatar')
    .populate('course', 'title bannerImage');

  if (!liveSession) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

  const obj = liveSession.toObject() as unknown as Record<string, unknown>;

  if (session.user.role === 'teacher' && (liveSession.teacher as unknown as { _id: { toString(): string } })._id.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // For students, strip sensitive fields from this endpoint
  if (session.user.role === 'student') {
    delete obj.meetLink;
    delete obj.meetPassword;
  }

  return NextResponse.json({ success: true, data: obj });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();
  const liveSession = await LiveSession.findById(id);
  if (!liveSession) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

  if (session.user.role === 'teacher' && liveSession.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  Object.assign(liveSession, parsed.data);
  await liveSession.save();

  return NextResponse.json({ success: true, data: liveSession });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const liveSession = await LiveSession.findById(id);
  if (!liveSession) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

  if (session.user.role === 'teacher' && liveSession.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await liveSession.deleteOne();
  return NextResponse.json({ success: true, message: 'Session deleted' });
}
