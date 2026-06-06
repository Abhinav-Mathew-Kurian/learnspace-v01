import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Promotion from '@/models/Promotion';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectDB();

  const promotions = await Promotion.find({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, data: promotions });
}
