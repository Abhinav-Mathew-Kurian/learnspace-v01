const TRANSCRIPT_CAP = 20_000; // chars — enough for ~25 min of speech

/**
 * Fetch the auto-generated or manual captions for a YouTube video.
 * Returns plain text (timestamps stripped). Returns '' if unavailable.
 * Never throws — a missing transcript is not an error.
 */
export async function fetchTranscript(youtubeId: string): Promise<string> {
  try {
    // youtube-transcript is CJS; use require to avoid ESM .default confusion
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { YoutubeTranscript } = require('youtube-transcript') as {
      YoutubeTranscript: { fetchTranscript(id: string): Promise<Array<{ text: string }>> };
    };
    const segments = await YoutubeTranscript.fetchTranscript(youtubeId);
    const text = segments
      .map((s) => s.text.replace(/\[.*?\]/g, '').trim()) // strip [Music], [Applause] etc.
      .filter(Boolean)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return text.slice(0, TRANSCRIPT_CAP);
  } catch {
    return '';
  }
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // bare 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

export function embedUrl(id: string, startSeconds = 0): string {
  const start = startSeconds > 0 ? `&start=${Math.round(startSeconds)}` : '';
  // Use the actual page origin at runtime so the embed works on any domain
  // (localhost, ngrok, production) without needing a build-time env var.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : '';
  return `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1&controls=0&iv_load_policy=3&disablekb=1${originParam}${start}`;
}

export function validateYouTubeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}
