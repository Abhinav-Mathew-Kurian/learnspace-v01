import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Rating from '@/models/Rating';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ratingSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email().optional().or(z.literal('')),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10, 'Comment must be at least 10 characters'),
  role: z.string().optional(),
});

export async function GET() {
  await connectDB();

  const ratings = await Rating.find({ isApproved: true })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('name rating comment role createdAt')
    .lean();

  return NextResponse.json({ success: true, data: ratings });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ratingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  await connectDB();

  const rating = await Rating.create({
    ...parsed.data,
    isApproved: false,
  });

  return NextResponse.json(
    { success: true, data: { id: rating._id }, message: 'Thank you! Your rating will appear after review.' },
    { status: 201 }
  );
}
