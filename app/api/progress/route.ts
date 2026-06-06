import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Progress from '@/models/Progress';
import Enrollment from '@/models/Enrollment';
import { z } from 'zod';

const upsertSchema = z.object({
  videoId: z.string(),
  courseId: z.string(),
  watchedSeconds: z.number().min(0),
  totalSeconds: z.number().min(0),
  lastPosition: z.number().min(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const courseId = searchParams.get('courseId');
  const videoId = searchParams.get('videoId');

  await connectDB();
  const filter: Record<string, string> = { student: session.user.id };
  if (courseId) filter.course = courseId;
  if (videoId) filter.video = videoId;

  const progress = await Progress.find(filter);
  return NextResponse.json({ success: true, data: progress });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  await connectDB();

  const enrolled = await Enrollment.findOne({
    student: session.user.id,
    course: parsed.data.courseId,
    isActive: true,
  });
  if (!enrolled) {
    return NextResponse.json({ success: false, error: 'Not enrolled' }, { status: 403 });
  }

  const { videoId, courseId, watchedSeconds, totalSeconds, lastPosition } = parsed.data;

  const cappedWatched = Math.min(watchedSeconds, totalSeconds);
  const percentComplete = totalSeconds > 0 ? (cappedWatched / totalSeconds) * 100 : 0;
  const isCompleted = percentComplete >= 90;

  // Use atomic $max so concurrent writes always converge to the highest value —
  // no read-then-write race condition possible.
  const setFields: Record<string, unknown> = {
    course: courseId,
    totalSeconds,
    lastPosition,
    lastWatchedAt: new Date(),
  };
  // Only ever flip isCompleted to true, never back to false
  if (isCompleted) setFields.isCompleted = true;

  const updateOp: Record<string, unknown> = {
    $max: { watchedSeconds: cappedWatched, percentComplete },
    $set: setFields,
  };
  // On first insert, initialise isCompleted to false
  if (!isCompleted) updateOp.$setOnInsert = { isCompleted: false };

  const progress = await Progress.findOneAndUpdate(
    { student: session.user.id, video: videoId },
    updateOp,
    { upsert: true, returnDocument: 'after' },
  );

  return NextResponse.json({ success: true, data: progress });
}
