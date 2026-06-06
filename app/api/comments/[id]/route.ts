import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Course from '@/models/Course';
import Video from '@/models/Video';
import { z } from 'zod';

const patchSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  isPinned: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();
  const comment = await Comment.findById(id);
  if (!comment) return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });

  const isOwn = comment.author.toString() === session.user.id;
  const isAdmin = session.user.role === 'admin';

  // Check teacher ownership of the course.
  // Video-level comments store course: null — resolve through the video in that case.
  let isTeacherOfCourse = false;
  if (session.user.role === 'teacher') {
    let courseId = comment.course;
    if (!courseId && comment.video) {
      const video = await Video.findById(comment.video).select('course');
      courseId = video?.course ?? null;
    }
    if (courseId) {
      const course = await Course.findById(courseId).select('teacher');
      isTeacherOfCourse = course?.teacher.toString() === session.user.id;
    }
  }

  // Content edit: only own comment
  if (parsed.data.content !== undefined) {
    if (!isOwn) return NextResponse.json({ success: false, error: 'Cannot edit others\' comments' }, { status: 403 });
    comment.content = parsed.data.content;
    comment.isEdited = true;
  }

  // Pin: teacher of course or admin
  if (parsed.data.isPinned !== undefined) {
    if (!isTeacherOfCourse && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Only teachers and admins can pin comments' }, { status: 403 });
    }
    comment.isPinned = parsed.data.isPinned;
  }

  // Soft delete: own for student, teacher for course, admin for any
  if (parsed.data.isDeleted !== undefined) {
    if (!isOwn && !isTeacherOfCourse && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Not authorized to delete this comment' }, { status: 403 });
    }
    comment.isDeleted = parsed.data.isDeleted;
  }

  await comment.save();
  const populated = await comment.populate('author', 'name avatar role');
  return NextResponse.json({ success: true, data: populated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  await Comment.findByIdAndDelete(id);
  return NextResponse.json({ success: true, message: 'Comment deleted' });
}
