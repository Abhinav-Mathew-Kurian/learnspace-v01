import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Video from '@/models/Video';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().optional(),
  bannerImage: z.string().optional(),
  previewVideoId: z.string().nullable().optional(),
  pricingType: z.enum(['free', 'lifetime', 'installment']).optional(),
  price: z.number().min(0).optional(),
  originalPrice: z.number().min(0).nullable().optional(),
  installmentMonths: z.number().int().min(1).max(60).nullable().optional(),
  currency: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const role = session.user.role;
  const filter: Record<string, unknown> = {};

  if (role === 'teacher') filter.teacher = session.user.id;
  if (role === 'student') filter.isPublished = true;
  if (role === 'admin') {
    const teacherId = req.nextUrl.searchParams.get('teacherId');
    if (teacherId) filter.teacher = teacherId;
  }

  const courses = await Course.find(filter)
    .populate('teacher', 'name avatar')
    .sort({ createdAt: -1 });

  // Override the denormalized totalVideos with a fresh count of published
  // videos so dashboards never show stale or inflated numbers.
  const courseIds = courses.map((c) => c._id);
  const counts = await Video.aggregate<{ _id: unknown; count: number }>([
    { $match: { course: { $in: courseIds }, isPublished: true } },
    { $group: { _id: '$course', count: { $sum: 1 } } },
  ]);
  const countMap = new Map<string, number>(counts.map((r) => [String(r._id), r.count]));
  const data = courses.map((c) => {
    const obj = c.toObject();
    obj.totalVideos = countMap.get(String(c._id)) ?? 0;
    return obj;
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();

  const teacherId = session.user.role === 'admin' && body.teacherId
    ? body.teacherId
    : session.user.id;

  const course = await Course.create({ ...parsed.data, teacher: teacherId });
  return NextResponse.json({ success: true, data: course }, { status: 201 });
}
