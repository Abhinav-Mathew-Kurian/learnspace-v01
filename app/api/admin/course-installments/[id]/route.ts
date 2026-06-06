import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import CourseInstallment from '@/models/CourseInstallment';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const doc = await CourseInstallment.findById(id);
  if (!doc) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const body = await req.json();

  if (body.markPaid === true) {
    doc.status = 'paid';
    doc.paidAt = new Date();
  } else if (body.markPending === true) {
    doc.status = 'pending';
    doc.paidAt = null;
  } else {
    if (body.dueDate) doc.dueDate = new Date(body.dueDate);
    if (body.amount != null) doc.amount = body.amount;
    if (body.notes != null) doc.notes = body.notes;
    if (body.status) doc.status = body.status;
  }

  await doc.save();
  return NextResponse.json({ success: true, data: doc });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  await CourseInstallment.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
