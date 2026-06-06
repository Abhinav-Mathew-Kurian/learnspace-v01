import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PublicWebinar from '@/models/PublicWebinar';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectDB();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const webinars = await PublicWebinar.find({
    isActive: true,
    date: { $gte: oneHourAgo },
  })
    .sort({ date: 1 })
    .limit(6)
    .lean();

  return NextResponse.json({ success: true, data: webinars });
}
