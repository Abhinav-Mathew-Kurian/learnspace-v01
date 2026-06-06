import { extractYouTubeId, embedUrl, validateYouTubeId } from '@/lib/youtube';

describe('extractYouTubeId', () => {
  const VIDEO_ID = 'dQw4w9WgXcQ';

  it('extracts ID from youtu.be short URL', () => {
    expect(extractYouTubeId(`https://youtu.be/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it('extracts ID from youtube.com/watch?v= URL', () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it('extracts ID from youtube.com/embed/ URL', () => {
    expect(extractYouTubeId(`https://www.youtube.com/embed/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it('extracts ID from youtube.com/shorts/ URL', () => {
    expect(extractYouTubeId(`https://youtube.com/shorts/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it('extracts ID from youtu.be URL with timestamp param', () => {
    expect(extractYouTubeId(`https://youtu.be/${VIDEO_ID}?t=30`)).toBe(VIDEO_ID);
  });

  it('extracts ID from youtube.com/watch with extra params', () => {
    expect(extractYouTubeId(`https://youtube.com/watch?v=${VIDEO_ID}&list=PL123`)).toBe(VIDEO_ID);
  });

  it('returns the ID as-is for a bare 11-character ID', () => {
    expect(extractYouTubeId(VIDEO_ID)).toBe(VIDEO_ID);
  });

  it('returns null for a non-YouTube URL', () => {
    expect(extractYouTubeId('https://google.com')).toBeNull();
  });

  it('returns null for a Vimeo URL', () => {
    expect(extractYouTubeId('https://vimeo.com/123456')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractYouTubeId('')).toBeNull();
  });
});

describe('validateYouTubeId', () => {
  it('returns true for a valid 11-character ID', () => {
    expect(validateYouTubeId('dQw4w9WgXcQ')).toBe(true);
  });

  it('returns true for an ID with underscores and hyphens', () => {
    expect(validateYouTubeId('abc_DE-1234')).toBe(true); // 11 chars: a,b,c,_,D,E,-,1,2,3,4
  });

  it('returns false for a string shorter than 11 chars', () => {
    expect(validateYouTubeId('short')).toBe(false);
  });

  it('returns false for "invalid" (7 chars)', () => {
    expect(validateYouTubeId('invalid')).toBe(false);
  });

  it('returns false for a string longer than 11 chars', () => {
    expect(validateYouTubeId('dQw4w9WgXcQextra')).toBe(false);
  });

  it('returns false for a string with spaces', () => {
    expect(validateYouTubeId('dQw4w9 XcQ!')).toBe(false);
  });
});

describe('embedUrl', () => {
  const VIDEO_ID = 'dQw4w9WgXcQ';

  it('uses youtube-nocookie.com domain', () => {
    const url = embedUrl(VIDEO_ID);
    expect(url).toContain('youtube-nocookie.com');
    expect(url).not.toContain('youtube.com/embed');
  });

  it('includes enablejsapi=1', () => {
    expect(embedUrl(VIDEO_ID)).toContain('enablejsapi=1');
  });

  it('includes rel=0', () => {
    expect(embedUrl(VIDEO_ID)).toContain('rel=0');
  });

  it('includes modestbranding=1', () => {
    expect(embedUrl(VIDEO_ID)).toContain('modestbranding=1');
  });

  it('does not include start param when startSeconds is 0', () => {
    const url = embedUrl(VIDEO_ID);
    expect(url).not.toContain('start=');
  });

  it('includes start=30 when startSeconds is 30', () => {
    expect(embedUrl(VIDEO_ID, 30)).toContain('start=30');
  });

  it('rounds fractional startSeconds', () => {
    expect(embedUrl(VIDEO_ID, 30.7)).toContain('start=31');
  });

  it('embeds the video ID in the URL path', () => {
    expect(embedUrl(VIDEO_ID)).toContain(`/embed/${VIDEO_ID}`);
  });
});
