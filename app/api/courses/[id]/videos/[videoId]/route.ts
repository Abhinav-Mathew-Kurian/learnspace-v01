import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Progress from '@/models/Progress';
import { extractYouTubeId, validateYouTubeId, fetchTranscript } from '@/lib/youtube';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  youtubeUrl: z.string().optional(),
  isPublished: z.boolean().optional(),
  order: z.number().optional(),
  duration: z.number().optional(),
});

type Params = { params: Promise<{ id: string; videoId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id, videoId } = await params;
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

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.youtubeUrl) {
    const youtubeId = extractYouTubeId(parsed.data.youtubeUrl);
    if (!youtubeId || !validateYouTubeId(youtubeId)) {
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL' }, { status: 400 });
    }
    update.youtubeId = youtubeId;
    delete update.youtubeUrl;
    // Re-fetch transcript whenever the video changes
    const transcript = await fetchTranscript(youtubeId);
    update.transcript = transcript;
    update.transcriptFetchedAt = transcript ? new Date() : null;
  }

  const oldVideo = await Video.findById(videoId);
  if (!oldVideo) return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });

  const video = await Video.findByIdAndUpdate(videoId, update, { returnDocument: 'after' });

  // Keep Course.totalVideos in sync with published count
  if (typeof parsed.data.isPublished === 'boolean' && oldVideo.isPublished !== parsed.data.isPublished) {
    const delta = parsed.data.isPublished ? 1 : -1;
    await Course.findByIdAndUpdate(id, { $inc: { totalVideos: delta } });
  }

  revalidatePath(`/student/courses/${id}`);
  return NextResponse.json({ success: true, data: video });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id, videoId } = await params;
  await connectDB();

  const course = await Course.findById(id);
  if (!course) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (session.user.role === 'teacher' && course.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const videoToDelete = await Video.findById(videoId);
  await Promise.all([
    Video.findByIdAndDelete(videoId),
    Progress.deleteMany({ video: videoId }),
  ]);

  // Only decrement if the deleted video was published
  if (videoToDelete?.isPublished) {
    await Course.findByIdAndUpdate(id, { $inc: { totalVideos: -1 } });
  }

  revalidatePath(`/student/courses/${id}`);
  revalidatePath('/student/courses');
  return NextResponse.json({ success: true, data: null });
}
