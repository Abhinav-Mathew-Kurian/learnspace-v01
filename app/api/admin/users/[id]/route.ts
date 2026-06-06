import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';

const updateSchema = z.object({
  isBanned: z.boolean().optional(),
  banReason: z.string().optional(),
  isActive: z.boolean().optional(),
  installmentPending: z.boolean().optional(),
  installmentAmount: z.number().nullable().optional(),
  installmentDueDate: z.string().nullable().optional(),
  installmentCourseId: z.string().nullable().optional(),
  subscriptionExpiry: z.string().nullable().optional(),
  subscriptionType: z.enum(['1month', '3month', '6month', '1year']).nullable().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  await connectDB();
  const user = await User.findById(id).select('-password').populate({ path: 'installmentCourseId', select: 'title', strictPopulate: false });
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  await connectDB();

  const { newPassword, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };

  if (rest.subscriptionExpiry !== undefined) {
    updateData.subscriptionExpiry = rest.subscriptionExpiry ? new Date(rest.subscriptionExpiry) : null;
  }
  if (rest.installmentDueDate !== undefined) {
    updateData.installmentDueDate = rest.installmentDueDate ? new Date(rest.installmentDueDate) : null;
  }
  if (rest.installmentCourseId !== undefined) {
    updateData.installmentCourseId = rest.installmentCourseId
      ? new mongoose.Types.ObjectId(rest.installmentCourseId)
      : null;
  }
  if (newPassword) {
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  const user = await User.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' }).select('-password').populate({ path: 'installmentCourseId', select: 'title', strictPopulate: false });
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: user });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();
  await User.findByIdAndDelete(id);
  return NextResponse.json({ success: true, data: null });
}
