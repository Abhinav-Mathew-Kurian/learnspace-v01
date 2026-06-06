import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  specialization: z.string().max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.user.id).select('-password').populate({ path: 'installmentCourseId', select: 'title', strictPopulate: false });
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(session.user.id, { $set: parsed.data }, { returnDocument: 'after' }).select('-password');
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  return NextResponse.json({ success: true, data: user, message: 'Profile updated' });
}
