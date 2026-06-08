'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { embedUrl } from '@/lib/youtube';
import {
  Play, Pause, Volume2, VolumeX,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Gauge, Settings,
} from 'lucide-react';

interface Props {
  videoId: string;
  videoDbId: string;
  courseId: string;
  initialPosition?: number;
  totalSeconds?: number;
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

const QUALITY_LABELS: Record<string, string> = {
  hd2160: '4K', hd1440: '1440p', hd1080: '1080p', hd720: '720p',
  large: '480p', medium: '360p', small: '240p', tiny: '144p', auto: 'Auto',
};

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function VideoPlayer({
  videoId, videoDbId, courseId,
  initialPosition = 0, totalSeconds: propTotal = 0,
  prevVideoUrl, nextVideoUrl,
}: Props) {
  const router = useRouter();
  const iframeId = `yt-player-${videoDbId}`;
  const containerRef = useRef<HTMLDivElement>(null);

  // UI state
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(propTotal);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);

  // Speed & quality
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const qualitiesLoadedRef = useRef(false);

  // Fetch quality levels — only available after buffering starts, not at onReady time
  const tryLoadQualities = useCallback(() => {
    if (qualitiesLoadedRef.current) return;
    const qualities = playerRef.current?.getAvailableQualityLevels() ?? [];
    // YouTube returns ['auto'] or [] before buffering; wait until real levels appear
    if (qualities.length > 1 || (qualities.length === 1 && qualities[0] !== 'auto')) {
      setAvailableQualities(qualities);
      qualitiesLoadedRef.current = true;
    }
    const q = playerRef.current?.getPlaybackQuality();
    if (q) setCurrentQuality(q);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── IFrame API callbacks ───────────────────────────────────────────
  const handleReady = useCallback((d: number) => {
    if (d > 0) setDuration(d);
    if (propTotal === 0 && d > 0) {
      fetch(`/api/courses/${courseId}/videos/${videoDbId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: d }),
      }).catch(() => {});
    }
    const vol = playerRef.current?.getVolume();
    if (typeof vol === 'number') setVolume(vol);
    tryLoadQualities();
    setIsReady(true);
  }, [courseId, videoDbId, propTotal, tryLoadQualities]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStateChange = useCallback((state: number) => {
    setIsPlaying(state === 1);
    // Quality levels become available once the video starts buffering/playing
    if (state === 1 || state === 3) tryLoadQualities();
  }, [tryLoadQualities]);

  const handleQualityChange = useCallback((q: string) => {
    setCurrentQuality(q);
    // Re-fetch the full list in case it changed (e.g. adaptive switch revealed more levels)
    if (!qualitiesLoadedRef.current) {
      const qualities = playerRef.current?.getAvailableQualityLevels() ?? [];
      if (qualities.length > 1) {
        setAvailableQualities(qualities);
        qualitiesLoadedRef.current = true;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { playerRef, apiError } = useYouTubePlayer({
    containerId: iframeId, videoId, initialPosition,
    onReady: handleReady, onStateChange: handleStateChange,
    onQualityChange: handleQualityChange,
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

  // ── Auto-hide controls ─────────────────────────────────────────────
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };
  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showControls) { setShowSpeedMenu(false); setShowQualityMenu(false); }
  }, [showControls]);

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
      p.unMute(); setIsMuted(false);
      if (volume === 0) { p.setVolume(70); setVolume(70); }
    } else { p.mute(); setIsMuted(true); }
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
    playerRef.current.seekTo(fraction * duration, true);
    setCurrentTime(fraction * duration);
    resetHideTimer();
  };

  const changeSpeed = (rate: number) => {
    playerRef.current?.setPlaybackRate(rate);
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    resetHideTimer();
  };

  const changeQuality = (q: string) => {
    playerRef.current?.setPlaybackQuality(q);
    setCurrentQuality(q);
    setShowQualityMenu(false);
    resetHideTimer();
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPct = Math.min(100, progressPct + 2);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-video bg-black rounded-xl overflow-hidden relative select-none"
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

      {/* API load error */}
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
        <div className="h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        <div className="bg-black/80 px-4 pt-2 pb-3 space-y-2">
          {/* Seek bar */}
          <div
            ref={seekBarRef}
            onClick={seek}
            className="relative h-1.5 rounded-full bg-white/20 cursor-pointer group/seek hover:h-2.5 transition-all duration-100"
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${bufferPct}%` }} />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 group-hover/seek:bg-indigo-400 transition-colors"
              style={{ width: `${progressPct}%` }}
            />
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
                onClick={(e) => { e.stopPropagation(); router.push(prevVideoUrl); }}
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
                onClick={(e) => { e.stopPropagation(); router.push(nextVideoUrl); }}
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

            <div className="flex-1" />

            {/* Playback speed */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setShowSpeedMenu((s) => !s); setShowQualityMenu(false); resetHideTimer(); }}
                title="Playback speed"
                className="flex items-center gap-1 text-white/70 hover:text-white transition-colors px-1.5 py-1 text-xs font-semibold"
              >
                <Gauge size={15} />
                {playbackRate === 1 ? '1×' : `${playbackRate}×`}
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-black/95 border border-white/10 rounded-lg overflow-hidden shadow-xl min-w-[90px]">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${
                        playbackRate === s ? 'text-indigo-400 font-semibold' : 'text-white/80'
                      }`}
                    >
                      {s === 1 ? 'Normal' : `${s}×`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality selector */}
            {availableQualities.length > 0 && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setShowQualityMenu((s) => !s); setShowSpeedMenu(false); resetHideTimer(); }}
                  title="Video quality"
                  className="flex items-center gap-1 text-white/70 hover:text-white transition-colors px-1.5 py-1 text-xs font-semibold"
                >
                  <Settings size={15} />
                  {QUALITY_LABELS[currentQuality] ?? currentQuality}
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-8 right-0 bg-black/95 border border-white/10 rounded-lg overflow-hidden shadow-xl min-w-[90px]">
                    {availableQualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => changeQuality(q)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${
                          currentQuality === q ? 'text-indigo-400 font-semibold' : 'text-white/80'
                        }`}
                      >
                        {QUALITY_LABELS[q] ?? q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
  );
}
