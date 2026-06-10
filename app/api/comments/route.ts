import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Comment from '@/models/Comment';
import CommentDedup from '@/models/CommentDedup';
import Enrollment from '@/models/Enrollment';
import Video from '@/models/Video';
import { z } from 'zod';

const createSchema = z.object({
  content: z.string().min(1).max(2000),
  courseId: z.string().nullable().optional(),
  videoId: z.string().nullable().optional(),
  parentCommentId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  const videoId  = searchParams.get('videoId');
  const limit    = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)), 50);
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  if (!courseId && !videoId) {
    return NextResponse.json({ success: false, error: 'courseId or videoId required' }, { status: 400 });
  }

  await connectDB();

  // Enrollment check: students must be enrolled regardless of whether they
  // query by courseId or by videoId (video-level IDOR guard).
  if (session.user.role === 'student') {
    let enrollCourseId = courseId;
    if (!enrollCourseId && videoId) {
      const video = await Video.findById(videoId).select('course').lean() as { course: unknown } | null;
      enrollCourseId = video ? String(video.course) : null;
    }
    if (enrollCourseId) {
      const enrolled = await Enrollment.findOne({ student: session.user.id, course: enrollCourseId, isActive: true });
      if (!enrolled) return NextResponse.json({ success: false, error: 'Not enrolled' }, { status: 403 });
    }
  }

  const filter: Record<string, unknown> = { isDeleted: false, parentComment: null };
  if (videoId) {
    filter.video = videoId;
  } else if (courseId) {
    // Course-level discussion only — exclude video-scoped comments
    // (video comments store both course+video, so without this they'd bleed in)
    filter.course = courseId;
    filter.video = null;
  }

  const [total, topLevel] = await Promise.all([
    Comment.countDocuments(filter),
    Comment.find(filter)
      .populate('author', 'name avatar role')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  const topIds = topLevel.map((c) => c._id);

  const replies = await Comment.find({ parentComment: { $in: topIds }, isDeleted: false })
    .populate('author', 'name avatar role')
    .sort({ createdAt: 1 });

  const replyMap = new Map<string, typeof replies>();
  for (const r of replies) {
    const pid = r.parentComment!.toString();
    if (!replyMap.has(pid)) replyMap.set(pid, []);
    replyMap.get(pid)!.push(r);
  }

  const data = topLevel.map((c) => ({
    ...c.toObject(),
    replies: replyMap.get(c._id.toString()) ?? [],
  }));

  return NextResponse.json({ success: true, data, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { content, courseId, videoId, parentCommentId } = parsed.data;

  if (!courseId && !videoId) {
    return NextResponse.json({ success: false, error: 'courseId or videoId required' }, { status: 400 });
  }

  await connectDB();

  // Students must be enrolled — check by courseId or by resolving videoId → course
  if (session.user.role === 'student') {
    let enrollCourseId = courseId ?? null;
    if (!enrollCourseId && videoId) {
      const video = await Video.findById(videoId).select('course').lean() as { course: unknown } | null;
      enrollCourseId = video ? String(video.course) : null;
    }
    if (enrollCourseId) {
      const enrolled = await Enrollment.findOne({ student: session.user.id, course: enrollCourseId, isActive: true });
      if (!enrolled) return NextResponse.json({ success: false, error: 'Not enrolled' }, { status: 403 });
    }
  }

  // Prevent grandchildren (max 1 level deep)
  if (parentCommentId) {
    const parent = await Comment.findById(parentCommentId);
    if (!parent) return NextResponse.json({ success: false, error: 'Parent comment not found' }, { status: 404 });
    if (parent.parentComment) return NextResponse.json({ success: false, error: 'Replies can only be 1 level deep' }, { status: 400 });
  }

  // Atomic dedup: claim a 30-second slot via a unique key in CommentDedup.
  const bucket = Math.floor(Date.now() / 30_000);
  const dedupeKey = `${session.user.id}:${courseId ?? ''}:${videoId ?? ''}:${parentCommentId ?? ''}:${bucket}:${Buffer.from(content).toString('base64').slice(0, 40)}`;
  try {
    await CommentDedup.create({ key: dedupeKey });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json({ success: false, error: 'Duplicate submission' }, { status: 409 });
    }
    throw e;
  }

  const comment = await Comment.create({
    author: session.user.id,
    content,
    course: courseId ?? null,
    video: videoId ?? null,
    parentComment: parentCommentId ?? null,
  });

  const populated = await comment.populate('author', 'name avatar role');
  return NextResponse.json({ success: true, data: { ...populated.toObject(), replies: [] } }, { status: 201 });
}
