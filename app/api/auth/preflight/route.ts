import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { z } from 'zod';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ type: 'ok' });

  await connectDB();

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() })
    .select('isBanned banReason isActive role subscriptionExpiry')
    .lean() as {
      isBanned: boolean;
      banReason?: string;
      isActive: boolean;
      role: string;
      subscriptionExpiry?: Date | null;
    } | null;

  if (!user) return NextResponse.json({ type: 'ok' });

  if (user.isBanned) {
    return NextResponse.json({
      type: 'banned',
      message: user.banReason || 'Your account has been suspended.',
    });
  }

  if (user.role === 'student' && user.subscriptionExpiry) {
    if (new Date() > new Date(user.subscriptionExpiry)) {
      const expDate = new Date(user.subscriptionExpiry).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
      });
      return NextResponse.json({ type: 'expired', message: expDate });
    }
  }

  if (!user.isActive) {
    return NextResponse.json({ type: 'deactivated' });
  }

  return NextResponse.json({ type: 'ok' });
}
