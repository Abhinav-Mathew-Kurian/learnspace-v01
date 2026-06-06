import { GET, POST } from '@/app/api/courses/[id]/videos/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
import Video from '@/models/Video';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// fetchTranscript is a network call — stub it out
jest.mock('@/lib/youtube', () => ({
  ...jest.requireActual('@/lib/youtube'),
  fetchTranscript: jest.fn().mockResolvedValue(''),
}));

// revalidatePath is a Next.js server function
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

function makeReq(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function setup() {
  const admin = await User.create({ name: 'Admin', email: 'admin@videos.test', password: 'hash', role: 'admin' });
  const teacher1 = await User.create({ name: 'Teacher1', email: 'teacher1@videos.test', password: 'hash', role: 'teacher' });
  const teacher2 = await User.create({ name: 'Teacher2', email: 'teacher2@videos.test', password: 'hash', role: 'teacher' });
  const course = await Course.create({ title: 'Video Course', description: 'Course for video tests', teacher: teacher1._id });
  return { admin, teacher1, teacher2, course };
}

describe('GET /api/courses/[id]/videos', () => {
  it('returns 401 when unauthenticated', async () => {
    const { course } = await setup();
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeReq('GET', `http://localhost/api/courses/${course._id}/videos`), {
      params: Promise.resolve({ id: course._id.toString() }),
    });
    expect(res.status).toBe(401);
  });

  it('returns sorted video list for authenticated user', async () => {
    const { teacher1, course } = await setup();
    await Video.create({ course: course._id, title: 'Video 2', youtubeId: 'vid2ABCDEFG', order: 2 });
    await Video.create({ course: course._id, title: 'Video 1', youtubeId: 'vid1ABCDEFG', order: 1 });

    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await GET(makeReq('GET', `http://localhost/api/courses/${course._id}/videos`), {
      params: Promise.resolve({ id: course._id.toString() }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ title: string; order: number }> };
    expect(json.data[0].order).toBe(1);
    expect(json.data[1].order).toBe(2);
  });
});

describe('POST /api/courses/[id]/videos', () => {
  it('returns 401 when unauthenticated', async () => {
    const { course } = await setup();
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(
      makeReq('POST', `http://localhost/api/courses/${course._id}/videos`, {
        title: 'New Video',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }),
      { params: Promise.resolve({ id: course._id.toString() }) },
    );
    expect(res.status).toBe(401);
  });

  it('teacher adds video — stores 11-char ID, not full URL', async () => {
    const { teacher1, course } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await POST(
      makeReq('POST', `http://localhost/api/courses/${course._id}/videos`, {
        title: 'React Hooks Explained',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }),
      { params: Promise.resolve({ id: course._id.toString() }) },
    );
    expect(res.status).toBe(201);
    const json = await res.json() as { data: { youtubeId: string; title: string } };
    // Must store bare ID, not full URL
    expect(json.data.youtubeId).toBe('dQw4w9WgXcQ');
    expect(json.data.youtubeId).not.toContain('youtube.com');
    expect(json.data.youtubeId).not.toContain('http');
    expect(json.data.youtubeId.length).toBe(11);
  });

  it('video order auto-increments from last video', async () => {
    const { teacher1, course } = await setup();
    await Video.create({ course: course._id, title: 'Existing', youtubeId: 'existing1234', order: 5 });

    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await POST(
      makeReq('POST', `http://localhost/api/courses/${course._id}/videos`, {
        title: 'New Video',
        youtubeUrl: 'dQw4w9WgXcQ', // bare ID also accepted
      }),
      { params: Promise.resolve({ id: course._id.toString() }) },
    );
    const json = await res.json() as { data: { order: number } };
    expect(json.data.order).toBe(6); // last was 5, new is 6
  });

  it('returns 400 for invalid YouTube URL', async () => {
    const { teacher1, course } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await POST(
      makeReq('POST', `http://localhost/api/courses/${course._id}/videos`, {
        title: 'Bad Video',
        youtubeUrl: 'https://vimeo.com/12345',
      }),
      { params: Promise.resolve({ id: course._id.toString() }) },
    );
    expect(res.status).toBe(400);
  });

  it('returns 403 when teacher tries to add video to another teacher course', async () => {
    const { teacher2, course } = await setup();
    // course belongs to teacher1
    mockAuth.mockResolvedValueOnce({ user: { id: teacher2._id.toString(), role: 'teacher' } } as never);
    const res = await POST(
      makeReq('POST', `http://localhost/api/courses/${course._id}/videos`, {
        title: 'Stolen Video',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }),
      { params: Promise.resolve({ id: course._id.toString() }) },
    );
    expect(res.status).toBe(403);
  });
});
