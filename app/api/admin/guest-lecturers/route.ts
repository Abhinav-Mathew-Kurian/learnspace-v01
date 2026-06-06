import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
  }

  await connectDB();
  const guests = await User.find({ isGuestLecturer: true }).select('name email avatar bio specialization');
  return NextResponse.json({ success: true, data: guests });
}
