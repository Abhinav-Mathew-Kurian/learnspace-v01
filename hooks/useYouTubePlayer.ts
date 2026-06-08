'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// YT IFrame API types
interface YTPlayer {
  getDuration(): number;
  getCurrentTime(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getVolume(): number;
  setVolume(v: number): void;
  setPlaybackRate(suggestedRate: number): void;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  setPlaybackQuality(suggestedQuality: string): void;
  getPlaybackQuality(): string;
  getAvailableQualityLevels(): string[];
  destroy(): void;
}

interface YTPlayerOptions {
  videoId?: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number }) => void;
  };
}

declare global {
  interface Window {
    YT: { Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer };
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoaded = false;
let apiLoadingPromise: Promise<void> | null = null;

const API_LOAD_TIMEOUT_MS = 12_000;

function loadYTApi(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  if (apiLoadingPromise) return apiLoadingPromise;

  apiLoadingPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) { apiLoaded = true; resolve(); return; }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      clearTimeout(timer);
      if (prev) prev();
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;

    script.onerror = () => {
      apiLoadingPromise = null;
      reject(new Error('YouTube player failed to load. Check your internet connection or ad-blocker settings.'));
    };

    const timer = setTimeout(() => {
      apiLoadingPromise = null;
      reject(new Error('YouTube player timed out. Check your internet connection or ad-blocker settings.'));
    }, API_LOAD_TIMEOUT_MS);

    document.head.appendChild(script);
  });

  return apiLoadingPromise;
}

interface UseYouTubePlayerOptions {
  containerId: string;
  videoId: string;
  initialPosition?: number;
  onReady?: (duration: number) => void;
  onStateChange?: (state: number, currentTime: number) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export function useYouTubePlayer({
  containerId,
  videoId,
  initialPosition = 0,
  onReady,
  onStateChange,
  onTimeUpdate,
}: UseYouTubePlayerOptions) {
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onReadyCb = useRef(onReady);
  const onStateCb = useRef(onStateChange);
  const onTimeCb = useRef(onTimeUpdate);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => { onReadyCb.current = onReady; }, [onReady]);
  useEffect(() => { onStateCb.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onTimeCb.current = onTimeUpdate; }, [onTimeUpdate]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    let destroyed = false;

    loadYTApi().then(() => {
      if (destroyed) return;
      const el = document.getElementById(containerId);
      if (!el) return;

      const isExistingIframe = el.tagName === 'IFRAME';
      const opts: YTPlayerOptions = isExistingIframe
        ? {}
        : { videoId, playerVars: { rel: 0, modestbranding: 1, enablejsapi: 1 } };

      playerRef.current = new window.YT.Player(el, {
        ...opts,
        events: {
          onReady(e) {
            if (destroyed) return;
            const duration = e.target.getDuration();
            if (initialPosition > 0) {
              setTimeout(() => e.target.seekTo(initialPosition, true), 500);
            }
            onReadyCb.current?.(duration);
          },
          onStateChange(e) {
            if (destroyed) return;
            const state = e.data;
            const player = playerRef.current!;

            if (state === 1) {
              stopInterval();
              intervalRef.current = setInterval(() => {
                if (!playerRef.current) return;
                const t = playerRef.current.getCurrentTime();
                const d = playerRef.current.getDuration();
                onTimeCb.current?.(t, d);
              }, 2000);
            } else {
              stopInterval();
            }

            onStateCb.current?.(state, player.getCurrentTime());
          },
        },
      });
    }).catch((err: unknown) => {
      if (!destroyed) {
        setApiError(err instanceof Error ? err.message : 'YouTube player failed to load.');
      }
    });

    return () => {
      destroyed = true;
      stopInterval();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, videoId]);

  return { playerRef, apiError };
}
