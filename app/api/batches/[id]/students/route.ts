import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Batch from '@/models/Batch';
import mongoose from 'mongoose';
import { z } from 'zod';

const schema = z.object({
  studentIds: z.array(z.string().min(1)),
  action: z.enum(['add', 'remove', 'set']),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();
  const batch = await Batch.findById(id);
  if (!batch) return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });

  if (session.user.role === 'teacher' && batch.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { studentIds, action } = parsed.data;
  const toOid = (sid: string) => new mongoose.Types.ObjectId(sid);

  // Use atomic MongoDB operators to eliminate race conditions on concurrent requests
  if (action === 'add') {
    await Batch.findByIdAndUpdate(id, { $addToSet: { students: { $each: studentIds.map(toOid) } } });
  } else if (action === 'remove') {
    await Batch.findByIdAndUpdate(id, { $pull: { students: { $in: studentIds.map(toOid) } } });
  } else {
    await Batch.findByIdAndUpdate(id, { $set: { students: studentIds.map(toOid) } });
  }

  const updated = await Batch.findById(id).populate('students', 'name email avatar');
  return NextResponse.json({ success: true, data: updated });
}
