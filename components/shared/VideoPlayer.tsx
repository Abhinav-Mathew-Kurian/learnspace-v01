'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { embedUrl } from '@/lib/youtube';
import {
  Play, Pause, Volume2, VolumeX,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  videoId: string;
  videoDbId: string;
  courseId: string;
  initialPosition?: number;
  initialWatched?: number;
  totalSeconds?: number;
  isEnrolled: boolean;
  onComplete?: () => void;
  prevVideoUrl?: string;
  nextVideoUrl?: string;
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoPlayer({
  videoId, videoDbId, courseId,
  initialPosition = 0, initialWatched = 0, totalSeconds: propTotal = 0,
  isEnrolled, onComplete, prevVideoUrl, nextVideoUrl,
}: Props) {
  const router = useRouter();
  const iframeId = `yt-player-${videoDbId}`;
  const containerRef = useRef<HTMLDivElement>(null);

  // Progress tracking refs (don't need re-renders)
  const totalRef = useRef(propTotal);
  const watchedRef = useRef(initialWatched);
  const maxReachedRef = useRef(initialPosition);
  const lastSavedRef = useRef(initialPosition);
  const completedRef = useRef(initialWatched > 0 && propTotal > 0 && initialWatched / propTotal >= 0.9);
  const lastDbSaveRef = useRef(0);

  // UI state
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(propTotal);
  const [livePercent, setLivePercent] = useState(
    propTotal > 0 ? Math.round((initialWatched / propTotal) * 100) : 0
  );
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);

  // ── Accumulate watched seconds (anti-skip) ─────────────────────────
  function accumulate(t: number, d?: number) {
    if (typeof d === 'number' && d > 0) totalRef.current = d;
    if (t <= maxReachedRef.current + 7) {
      const delta = t - lastSavedRef.current;
      if (delta > 0 && delta < 15) {
        watchedRef.current = totalRef.current > 0
          ? Math.min(watchedRef.current + delta, totalRef.current)
          : watchedRef.current + delta;
      }
    }
    maxReachedRef.current = Math.max(maxReachedRef.current, t);
    lastSavedRef.current = t;
  }

  async function persistProgress(t: number) {
    if (!isEnrolled || totalRef.current <= 0) return;
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: videoDbId, courseId,
        watchedSeconds: Math.round(watchedRef.current),
        totalSeconds: Math.round(totalRef.current),
        lastPosition: Math.round(t),
      }),
    });
    lastDbSaveRef.current = Date.now();
  }

  // ── IFrame API callbacks ───────────────────────────────────────────
  const handleReady = useCallback((d: number) => {
    if (d > 0) { totalRef.current = d; setDuration(d); }
    if (propTotal === 0 && d > 0 && !isEnrolled) {
      fetch(`/api/courses/${courseId}/videos/${videoDbId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: d }),
      }).catch(() => {});
    }
    // Sync initial volume from the actual player (YouTube defaults to 100)
    const vol = playerRef.current?.getVolume();
    if (typeof vol === 'number') setVolume(vol);
    setIsReady(true);
  }, [courseId, videoDbId, propTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStateChange = useCallback((state: number, t: number) => {
    setIsPlaying(state === 1);
    if (state === 2 || state === 0) {
      accumulate(t);
      persistProgress(t);
    }
    if (state === 0 && !completedRef.current) {
      if (totalRef.current > 0 && watchedRef.current / totalRef.current >= 0.9) {
        completedRef.current = true;
        onComplete?.();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimeUpdate = useCallback((t: number, d: number) => {
    if (!isEnrolled) return;
    accumulate(t, d);
    const pct = totalRef.current > 0 ? Math.round((watchedRef.current / totalRef.current) * 100) : 0;
    setLivePercent(pct);
    // Save to DB every 10 s while playing
    if (Date.now() - lastDbSaveRef.current > 10_000) persistProgress(t);
  }, [isEnrolled]); // eslint-disable-line react-hooks/exhaustive-deps

  const { playerRef, apiError } = useYouTubePlayer({
    containerId: iframeId, videoId, initialPosition,
    onReady: handleReady, onStateChange: handleStateChange, onTimeUpdate: handleTimeUpdate,
  });

  // ── Smooth UI tick (250 ms) ────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      const t = p.getCurrentTime();
      const d = p.getDuration();
      if (isFinite(t)) setCurrentTime(t);
      if (isFinite(d) && d > 0) setDuration(d);
    }, 250);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fullscreen change listener ─────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Tab-kill / page-hide progress save ────────────────────────────
  // fetch() is cancelled when a tab closes. sendBeacon() survives it.
  useEffect(() => {
    if (!isEnrolled) return;

    const flush = () => {
      if (totalRef.current <= 0) return;
      const payload = JSON.stringify({
        videoId: videoDbId,
        courseId,
        watchedSeconds: Math.round(watchedRef.current),
        totalSeconds: Math.round(totalRef.current),
        lastPosition: Math.round(lastSavedRef.current),
      });
      navigator.sendBeacon('/api/progress', new Blob([payload], { type: 'application/json' }));
    };

    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnrolled, videoDbId, courseId]);

  // ── Auto-hide controls ─────────────────────────────────────────────
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };
  useEffect(() => { resetHideTimer(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Control actions ───────────────────────────────────────────────
  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo(); else p.playVideo();
    resetHideTimer();
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isMuted) {
      p.unMute();
      setIsMuted(false);
      // If the slider was dragged to 0, restore to a sensible level
      if (volume === 0) { p.setVolume(70); setVolume(70); }
    } else {
      p.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(val);
    if (val === 0) { p.mute(); setIsMuted(true); }
    else if (isMuted) { p.unMute(); setIsMuted(false); }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen().catch(() => {});
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = seekBarRef.current;
    if (!bar || !playerRef.current || duration <= 0) return;
    const { left, width } = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - left) / width));
    const newT = fraction * duration;
    playerRef.current.seekTo(newT, true);
    setCurrentTime(newT);
    resetHideTimer();
  };

  const navigate = async (url: string) => {
    if (isEnrolled && totalRef.current > 0) await persistProgress(lastSavedRef.current);
    router.push(url);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPct = Math.min(100, progressPct + 2);

  return (
    <div className="space-y-0">
      <div
        ref={containerRef}
        className="w-full aspect-video bg-black rounded-t-xl overflow-hidden relative select-none"
        onMouseMove={resetHideTimer}
        onMouseEnter={resetHideTimer}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* iframe — no YouTube controls (controls=0 in URL) */}
        <iframe
          key={iframeId}
          id={iframeId}
          src={embedUrl(videoId, initialPosition)}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media; fullscreen"
          title="Course video player"
        />

        {/* Full-surface click blocker — captures all clicks on the iframe */}
        <div
          className="absolute inset-0 z-10"
          style={{ cursor: showControls ? 'default' : 'none' }}
          onClick={togglePlay}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* API load error — ad-blocker or network blocked the IFrame API */}
        {apiError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 gap-3 px-6 text-center">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-white font-semibold text-sm">Video player could not load</p>
            <p className="text-white/60 text-xs max-w-xs">{apiError}</p>
          </div>
        )}

        {/* Loading spinner */}
        {!isReady && !apiError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
            <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Custom control bar ──────────────────────────────────────── */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Gradient fade so controls are readable */}
          <div className="h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          <div className="bg-black/80 px-4 pt-2 pb-3 space-y-2">
            {/* Seek bar */}
            <div
              ref={seekBarRef}
              onClick={seek}
              className="relative h-1.5 rounded-full bg-white/20 cursor-pointer group/seek hover:h-2.5 transition-all duration-100"
            >
              {/* Buffer */}
              <div className="absolute inset-y-0 left-0 rounded-full bg-white/20" style={{ width: `${bufferPct}%` }} />
              {/* Watched progress */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 group-hover/seek:bg-indigo-400 transition-colors"
                style={{ width: `${livePercent}%` }}
              />
              {/* Playback position */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white"
                style={{ width: `${progressPct}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover/seek:opacity-100 transition-opacity -translate-x-1/2"
                style={{ left: `${progressPct}%` }}
              />
            </div>

            {/* Buttons row */}
            <div className="flex items-center gap-2">
              {/* Prev video */}
              {prevVideoUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(prevVideoUrl); }}
                  title="Previous video"
                  className="text-white/70 hover:text-white transition-colors p-1"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              {/* Play / Pause */}
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                title={isPlaying ? 'Pause' : 'Play'}
                className="text-white hover:text-indigo-300 transition-colors p-1"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>

              {/* Next video */}
              {nextVideoUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(nextVideoUrl); }}
                  title="Next video"
                  className="text-white/70 hover:text-white transition-colors p-1"
                >
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Time */}
              <span className="text-white/80 text-xs font-mono tabular-nums ml-1">
                {fmt(currentTime)} / {fmt(duration)}
              </span>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Tracking indicator */}
              {isEnrolled && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-white/50">
                  {livePercent >= 90
                    ? <><CheckCircle2 size={11} className="text-green-400" /><span className="text-green-400">Done</span></>
                    : <>{isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}<span>{livePercent}%</span></>
                  }
                </span>
              )}

              {/* Mute + volume slider */}
              <div
                className="flex items-center gap-1 group/vol"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={toggleMute}
                  title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                  className="text-white/70 hover:text-white transition-colors p-1 flex-shrink-0"
                >
                  {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
                {/* Slider expands on hover */}
                <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-200 ease-out flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 appearance-none rounded-full cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #818cf8 ${isMuted ? 0 : volume}%, rgba(255,255,255,0.25) ${isMuted ? 0 : volume}%)`,
                      accentColor: '#818cf8',
                    }}
                  />
                </div>
              </div>

              {/* Fullscreen */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                className="text-white/70 hover:text-white transition-colors p-1"
              >
                {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slim watched-progress strip below player */}
      {isEnrolled && isReady && (
        <div className="bg-slate-900 rounded-b-xl px-4 py-2 flex items-center gap-3">
          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${livePercent >= 90 ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(livePercent, 100)}%` }}
            />
          </div>
          <span className={`text-[11px] font-semibold flex-shrink-0 ${livePercent >= 90 ? 'text-green-400' : 'text-slate-400'}`}>
            {livePercent >= 90 ? '✓ Completed' : `${livePercent}% watched`}
          </span>
        </div>
      )}
    </div>
  );
}
