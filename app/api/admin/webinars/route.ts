import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PublicWebinar from '@/models/PublicWebinar';
import { z } from 'zod';

const webinarSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string(),
  duration: z.number().int().positive(),
  meetingUrl: z.string().url(),
  thumbnail: z.string().optional(),
  instructor: z.string().min(1),
  topic: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const webinars = await PublicWebinar.find().sort({ date: -1 }).lean();
  return NextResponse.json({ success: true, data: webinars });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = webinarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  await connectDB();
  const webinar = await PublicWebinar.create({
    ...parsed.data,
    date: new Date(parsed.data.date),
  });

  return NextResponse.json({ success: true, data: webinar }, { status: 201 });
}
