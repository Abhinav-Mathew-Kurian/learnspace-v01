import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Enrollment from '@/models/Enrollment';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  category: z.string().optional(),
  bannerImage: z.string().optional(),
  previewVideoId: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  pricingType: z.enum(['free', 'lifetime', 'installment']).optional(),
  price: z.number().min(0).optional(),
  originalPrice: z.number().min(0).nullable().optional(),
  installmentMonths: z.number().int().min(1).max(60).nullable().optional(),
  currency: z.string().optional(),
  accessDurationMonths: z.number().int().min(1).max(120).nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const course = await Course.findById(id).populate('teacher', 'name avatar bio');
  if (!course) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  // Students can only access published courses they're enrolled in (or for preview)
  if (session.user.role === 'student' && !course.isPublished) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const isTeacherOrAdmin = ['admin', 'teacher'].includes(session.user.role);
  const videoFilter: Record<string, unknown> = { course: id };
  // Teachers/admins must see all videos (published + hidden) so they can manage
  // them. Students only ever see published videos.
  if (!isTeacherOrAdmin) videoFilter.isPublished = true;
  const videos = await Video.find(videoFilter).sort({ order: 1 });

  let isEnrolled = false;
  if (session.user.role === 'student') {
    const enrollment = await Enrollment.findOne({
      student: session.user.id,
      course: id,
      isActive: true,
    });
    isEnrolled = !!enrollment;
  }
  if (['admin', 'teacher'].includes(session.user.role)) isEnrolled = true;

  // Overwrite the denormalized totalVideos with a fresh published-only count.
  const publishedCount = await Video.countDocuments({ course: id, isPublished: true });
  const courseObj = course.toObject();
  courseObj.totalVideos = publishedCount;

  return NextResponse.json({ success: true, data: { course: courseObj, videos, isEnrolled } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const course = await Course.findById(id);
  if (!course) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (session.user.role === 'teacher' && course.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  Object.assign(course, parsed.data);
  await course.save();
  return NextResponse.json({ success: true, data: course });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const course = await Course.findById(id);
  if (!course) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (session.user.role === 'teacher' && course.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await Promise.all([
    Course.findByIdAndDelete(id),
    Video.deleteMany({ course: id }),
    Enrollment.deleteMany({ course: id }),
  ]);

  return NextResponse.json({ success: true, data: null });
}
