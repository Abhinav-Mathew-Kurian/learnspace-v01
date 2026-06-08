'use client';

import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(() => import('@/components/shared/VideoPlayer'), { ssr: false });

interface Props {
  videoId: string;
  videoDbId: string;
  courseId: string;
  totalSeconds?: number;
  prevVideoUrl?: string;
  nextVideoUrl?: string;
}

export default function VideoPlayerWrapper(props: Props) {
  return <VideoPlayer {...props} />;
}
