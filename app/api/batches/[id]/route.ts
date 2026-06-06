import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Batch from '@/models/Batch';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  schedule: z.string().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const batch = await Batch.findById(id)
    .populate('teacher', 'name email avatar')
    .populate('course', 'title bannerImage')
    .populate('students', 'name email avatar subscriptionExpiry isActive');

  if (!batch) return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });

  if (session.user.role === 'teacher' && batch.teacher._id.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  if (session.user.role === 'student' && !batch.students.some((s: { _id: { toString(): string } }) => s._id.toString() === session.user.id)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: batch });
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
  const batch = await Batch.findById(id);
  if (!batch) return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });

  if (session.user.role === 'teacher' && batch.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  Object.assign(batch, parsed.data);
  await batch.save();

  return NextResponse.json({ success: true, data: batch });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const batch = await Batch.findById(id);
  if (!batch) return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });

  if (session.user.role === 'teacher' && batch.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await batch.deleteOne();
  return NextResponse.json({ success: true, message: 'Batch deleted' });
}
