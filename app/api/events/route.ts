import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';
import Batch from '@/models/Batch';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().default(''),
  type: z.enum(['offline_class', 'webinar', 'live_session', 'video_release']),
  date: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  audience: z.enum(['all', 'teachers', 'students', 'batch']).default('all'),
  batchId: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  meetLink: z.string().optional().nullable(),
  guestLecturerId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get('upcoming') === 'true';
  const limit = parseInt(searchParams.get('limit') ?? '100');

  let filter: Record<string, unknown>;
  if (session.user.role === 'admin') {
    filter = {};
  } else if (session.user.role === 'teacher') {
    filter = { audience: { $in: ['all', 'teachers'] } };
  } else {
    // Students see all/student events + batch events for batches they belong to
    const studentBatches = await Batch.find({ students: session.user.id }).select('_id').lean() as Array<{ _id: unknown }>;
    const batchIds = studentBatches.map((b) => b._id);
    filter = {
      $or: [
        { audience: { $in: ['all', 'students'] } },
        ...(batchIds.length > 0 ? [{ audience: 'batch', batchId: { $in: batchIds } }] : []),
      ],
    };
  }

  if (upcoming) filter.date = { $gte: new Date() };

  const events = await Event.find(filter)
    .populate('guestLecturer', 'name avatar bio specialization')
    .populate('batchId', 'name')
    .sort({ date: upcoming ? 1 : -1 })
    .limit(limit);

  return NextResponse.json({ success: true, data: events });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();

  const event = await Event.create({
    ...parsed.data,
    date: new Date(parsed.data.date),
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    batchId: parsed.data.batchId ?? null,
    location: parsed.data.location ?? null,
    meetLink: parsed.data.meetLink ?? null,
    guestLecturer: parsed.data.guestLecturerId ?? null,
    createdBy: session.user.id,
  });

  const populated = await event.populate([
    { path: 'guestLecturer', select: 'name avatar' },
    { path: 'batchId', select: 'name' },
  ]);

  return NextResponse.json({ success: true, data: populated }, { status: 201 });
}
