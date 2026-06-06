import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Promotion from '@/models/Promotion';
import { z } from 'zod';

const promotionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().optional(),
  linkUrl: z.string().optional(),
  badge: z.string().optional(),
  bgColor: z.string().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const promotions = await Promotion.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, data: promotions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = promotionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  await connectDB();
  const promotion = await Promotion.create({
    ...parsed.data,
    ...(parsed.data.validUntil ? { validUntil: new Date(parsed.data.validUntil) } : {}),
  });

  return NextResponse.json({ success: true, data: promotion }, { status: 201 });
}
