import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Video from '@/models/Video';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectDB();

  const courses = await Course.find({ isPublished: true })
    .populate('teacher', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  // Attach first video ID for preview link
  const coursesWithPreview = await Promise.all(
    courses.map(async (course) => {
      const firstVideo = await Video.findOne({ course: course._id, isPublished: true })
        .sort({ order: 1 })
        .select('_id')
        .lean();
      return {
        ...course,
        firstVideoId: firstVideo ? firstVideo._id : null,
      };
    })
  );

  return NextResponse.json({ success: true, data: coursesWithPreview });
}
