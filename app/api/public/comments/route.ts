import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Comment from '@/models/Comment';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const courseId = searchParams.get('courseId');

  if (!courseId) {
    return NextResponse.json({ success: false, error: 'courseId is required' }, { status: 400 });
  }

  await connectDB();

  // Only course-level top-level non-deleted comments (no video comments)
  const comments = await Comment.find({
    course: courseId,
    video: null,
    parentComment: null,
    isDeleted: false,
  })
    .populate('author', 'name avatar role')
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({ success: true, data: comments });
}
