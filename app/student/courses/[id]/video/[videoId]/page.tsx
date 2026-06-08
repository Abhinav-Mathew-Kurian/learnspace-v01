export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Enrollment from '@/models/Enrollment';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import DescriptionRenderer from '@/components/shared/DescriptionRenderer';
import VideoPlayerWrapper from '@/components/student/VideoPlayerWrapper';
import CommentSection from '@/components/shared/CommentSection';
import AiAssistant from '@/components/shared/AiAssistant';
import ChapterSidebar from '@/components/student/ChapterSidebar';

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string; videoId: string }>;
}) {
  const { id, videoId } = await params;
  const session = await auth();

  await connectDB();

  const [course, video, allVideos] = await Promise.all([
    Course.findById(id),
    Video.findById(videoId),
    Video.find({ course: id, isPublished: true }).sort({ order: 1 }),
  ]);

  if (!course || !video || !course.isPublished) notFound();

  const enrollment = await Enrollment.findOne({
    student: session!.user.id,
    course: id,
    isActive: true,
  });
  const isEnrolled = !!enrollment;

  const isFirstVideo = allVideos[0]?._id.toString() === videoId;
  if (!isEnrolled && !isFirstVideo) notFound();

  const currentIndex = allVideos.findIndex((v) => v._id.toString() === videoId);

  const prevVideo = isEnrolled && currentIndex > 0 ? allVideos[currentIndex - 1] : null;
  const nextVideo = isEnrolled && currentIndex < allVideos.length - 1 ? allVideos[currentIndex + 1] : null;
  const prevVideoUrl = prevVideo ? `/student/courses/${id}/video/${prevVideo._id}` : undefined;
  const nextVideoUrl = nextVideo ? `/student/courses/${id}/video/${nextVideo._id}` : undefined;

  const chapterVideos = allVideos.map((v, i) => ({
    id: v._id.toString(),
    title: v.title,
    accessible: isEnrolled || i === 0,
    isCurrent: v._id.toString() === videoId,
    index: i,
  }));

  return (
    <div className="flex flex-col lg:flex-row lg:h-full lg:overflow-hidden">
      {/* ── Main: video + info (scrollable on desktop) ── */}
      <div className="flex-1 min-w-0 min-h-0 lg:overflow-y-auto">
        <div className="p-3 sm:p-5 pb-6 max-w-4xl">
          <Link
            href={`/student/courses/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
          >
            <ArrowLeft size={15} /> Back to Course
          </Link>

          <VideoPlayerWrapper
            videoId={video.youtubeId}
            videoDbId={videoId}
            courseId={id}
            totalSeconds={video.duration}
            prevVideoUrl={prevVideoUrl}
            nextVideoUrl={nextVideoUrl}
          />

          {/* Video title + description */}
          <div className="mt-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 mb-1">{video.title}</h1>
            {video.description && (
              <div className="mt-2">
                <DescriptionRenderer text={video.description} />
              </div>
            )}
            {!isEnrolled && (
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <Lock size={14} />
                <span>You&apos;re watching a preview. Contact your admin to unlock all videos.</span>
              </div>
            )}
          </div>

          {/* Video-level discussion */}
          {isEnrolled && (
            <div className="mt-4">
              <CommentSection courseId={id} videoId={videoId} isEnrolled={isEnrolled} />
            </div>
          )}
        </div>
      </div>

      {/* ── Chapter sidebar ── */}
      <ChapterSidebar
        videos={chapterVideos}
        courseTitle={course.title}
        currentIndex={currentIndex}
        totalCount={allVideos.length}
        courseId={id}
      />

      {/* Floating AI assistant */}
      {isEnrolled && (
        <AiAssistant
          courseId={id}
          videoId={videoId}
          buttonPosition="bottom-6 right-6 lg:right-[316px]"
          panelPosition="bottom-[5.5rem] right-6 lg:right-[316px]"
        />
      )}
    </div>
  );
}
