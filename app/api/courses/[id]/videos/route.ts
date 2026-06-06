import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Video from '@/models/Video';
import { extractYouTubeId, validateYouTubeId, fetchTranscript } from '@/lib/youtube';
import { z } from 'zod';

const addVideoSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  youtubeUrl: z.string().min(5),
  isPublished: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const videos = await Video.find({ course: id }).sort({ order: 1 });
  return NextResponse.json({ success: true, data: videos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !['admin', 'teacher'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const course = await Course.findById(id);
  if (!course) return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });

  if (session.user.role === 'teacher' && course.teacher.toString() !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = addVideoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const youtubeId = extractYouTubeId(parsed.data.youtubeUrl);
  if (!youtubeId || !validateYouTubeId(youtubeId)) {
    return NextResponse.json({ success: false, error: 'Invalid YouTube URL' }, { status: 400 });
  }

  const lastVideo = await Video.findOne({ course: id }).sort({ order: -1 });
  const order = (lastVideo?.order ?? 0) + 1;

  // Fetch transcript at save time so the AI can use it immediately.
  // Gracefully returns '' if captions are unavailable — never blocks the save.
  const transcript = await fetchTranscript(youtubeId);

  const video = await Video.create({
    course: id,
    title: parsed.data.title,
    description: parsed.data.description ?? '',
    youtubeId,
    order,
    isPublished: parsed.data.isPublished ?? true,
    releaseDate: new Date(),
    transcript,
    transcriptFetchedAt: transcript ? new Date() : null,
  });

  // Only count published videos in totalVideos
  if (video.isPublished) {
    await Course.findByIdAndUpdate(id, { $inc: { totalVideos: 1 } });
  }

  revalidatePath(`/student/courses/${id}`);
  return NextResponse.json({ success: true, data: video }, { status: 201 });
}
