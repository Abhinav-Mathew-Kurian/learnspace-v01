import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(['offline_class', 'webinar', 'live_session', 'video_release']).optional(),
  date: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  audience: z.enum(['all', 'teachers', 'students', 'batch']).optional(),
  batchId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  meetLink: z.string().nullable().optional(),
  guestLecturerId: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.date) update.date = new Date(parsed.data.date);
  if (parsed.data.endDate) update.endDate = new Date(parsed.data.endDate);
  if (parsed.data.guestLecturerId !== undefined) { update.guestLecturer = parsed.data.guestLecturerId; delete update.guestLecturerId; }

  const event = await Event.findByIdAndUpdate(id, update, { returnDocument: 'after' });
  if (!event) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });

  return NextResponse.json({ success: true, data: event });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  await Event.findByIdAndDelete(id);
  return NextResponse.json({ success: true, message: 'Event deleted' });
}
