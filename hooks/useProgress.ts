'use client';

import { useCallback, useRef } from 'react';

interface ProgressState {
  videoId: string;
  courseId: string;
  watchedSeconds: number;
  totalSeconds: number;
  lastPosition: number;
}

export function useProgress(initial: ProgressState) {
  const state = useRef<ProgressState>(initial);
  const isSaving = useRef(false);

  const update = useCallback((patch: Partial<Omit<ProgressState, 'videoId' | 'courseId'>>) => {
    state.current = { ...state.current, ...patch };
  }, []);

  const save = useCallback(async () => {
    if (isSaving.current) return;
    isSaving.current = true;
    const { videoId, courseId, watchedSeconds, totalSeconds, lastPosition } = state.current;
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, courseId, watchedSeconds, totalSeconds, lastPosition }),
      });
    } finally {
      isSaving.current = false;
    }
  }, []);

  return { update, save, state };
}
