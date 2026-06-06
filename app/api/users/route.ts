import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

// Admin and teachers can list students (for batch management)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') ?? 'student';

  const users = await User.find({ role: role as 'admin' | 'teacher' | 'student', isActive: true })
    .select('name email avatar phone')
    .sort({ name: 1 });

  return NextResponse.json({ success: true, data: users });
}
