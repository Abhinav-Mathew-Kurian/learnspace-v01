/**
 * Tests for GET/PATCH/DELETE /api/courses/[id]
 * Separate from courses.test.ts which covers the collection route.
 */
import { GET, PATCH, DELETE } from '@/app/api/courses/[id]/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Enrollment from '@/models/Enrollment';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
const mockAuth = auth as jest.MockedFunction<typeof auth>;

function makeReq(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function setup() {
  const admin   = await User.create({ name: 'Admin',    email: 'admin@cid.test',   password: 'h', role: 'admin'   });
  const teacher1 = await User.create({ name: 'Teacher1', email: 'teacher1@cid.test', password: 'h', role: 'teacher' });
  const teacher2 = await User.create({ name: 'Teacher2', email: 'teacher2@cid.test', password: 'h', role: 'teacher' });
  const student  = await User.create({ name: 'Student',  email: 'student@cid.test',  password: 'h', role: 'student' });

  const published = await Course.create({
    title: 'Published', description: 'A published course', teacher: teacher1._id, isPublished: true,
  });
  const unpublished = await Course.create({
    title: 'Unpublished', description: 'Not yet published', teacher: teacher1._id, isPublished: false,
  });

  // Two videos: one published, one hidden
  const pubVideo  = await Video.create({ course: published._id, title: 'Pub Video',    youtubeId: 'pubVid12345', order: 1, isPublished: true });
  const hidVideo  = await Video.create({ course: published._id, title: 'Hidden Video',  youtubeId: 'hidVid12345', order: 2, isPublished: false });

  // Enroll student in published course
  await Enrollment.create({ student: student._id, course: published._id, enrolledBy: admin._id });

  return { admin, teacher1, teacher2, student, published, unpublished, pubVideo, hidVideo };
}

// ─── GET /api/courses/[id] ───────────────────────────────────────────────────

describe('GET /api/courses/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    const { published } = await setup();
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeReq('GET', `http://localhost/api/courses/${published._id}`), {
      params: Promise.resolve({ id: published._id.toString() }),
    });
    expect(res.status).toBe(401);
  });

  it('enrolled student gets course with isEnrolled=true', async () => {
    const { student, published } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res = await GET(makeReq('GET', `http://localhost/api/courses/${published._id}`), {
      params: Promise.resolve({ id: published._id.toString() }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { isEnrolled: boolean; course: { title: string }; videos: unknown[] } };
    expect(json.data.isEnrolled).toBe(true);
    expect(json.data.course.title).toBe('Published');
  });

  it('enrolled student only sees published videos (not hidden ones)', async () => {
    const { student, published, pubVideo, hidVideo } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res = await GET(makeReq('GET', `http://localhost/api/courses/${published._id}`), {
      params: Promise.resolve({ id: published._id.toString() }),
    });
    const json = await res.json() as { data: { videos: Array<{ _id: string }> } };
    const ids = json.data.videos.map((v) => v._id.toString());
    expect(ids).toContain(pubVideo._id.toString());
    expect(ids).not.toContain(hidVideo._id.toString());
  });

  it('unenrolled student gets course with isEnrolled=false (preview mode)', async () => {
    const { published } = await setup();
    const stranger = await User.create({ name: 'Stranger', email: 'stranger@cid.test', password: 'h', role: 'student' });
    mockAuth.mockResolvedValueOnce({ user: { id: stranger._id.toString(), role: 'student' } } as never);
    const res = await GET(makeReq('GET', `http://localhost/api/courses/${published._id}`), {
      params: Promise.resolve({ id: published._id.toString() }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { isEnrolled: boolean } };
    expect(json.data.isEnrolled).toBe(false); // API returns preview; UI decides what to lock
  });

  it('student accessing unpublished course → 404', async () => {
    const { student, unpublished } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res = await GET(makeReq('GET', `http://localhost/api/courses/${unpublished._id}`), {
      params: Promise.resolve({ id: unpublished._id.toString() }),
    });
    expect(res.status).toBe(404);
  });

  it('owning teacher gets all videos including hidden ones', async () => {
    const { teacher1, published, pubVideo, hidVideo } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await GET(makeReq('GET', `http://localhost/api/courses/${published._id}`), {
      params: Promise.resolve({ id: published._id.toString() }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { videos: Array<{ _id: string }>; isEnrolled: boolean } };
    const ids = json.data.videos.map((v) => v._id.toString());
    expect(ids).toContain(pubVideo._id.toString());
    expect(ids).toContain(hidVideo._id.toString()); // teacher sees hidden too
    expect(json.data.isEnrolled).toBe(true);
  });

  it('admin gets course with all videos + isEnrolled=true', async () => {
    const { admin, published, hidVideo } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await GET(makeReq('GET', `http://localhost/api/courses/${published._id}`), {
      params: Promise.resolve({ id: published._id.toString() }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { videos: Array<{ _id: string }>; isEnrolled: boolean } };
    expect(json.data.isEnrolled).toBe(true);
    const ids = json.data.videos.map((v) => v._id.toString());
    expect(ids).toContain(hidVideo._id.toString());
  });

  it('returns 404 for non-existent course', async () => {
    const { admin } = await setup();
    const fakeId = '000000000000000000000099';
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await GET(makeReq('GET', `http://localhost/api/courses/${fakeId}`), {
      params: Promise.resolve({ id: fakeId }),
    });
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/courses/[id] ─────────────────────────────────────────────────

describe('PATCH /api/courses/[id]', () => {
  it('owning teacher edits course title → 200', async () => {
    const { teacher1, published } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/courses/${published._id}`, { title: 'New Title', description: 'Updated description here' }),
      { params: Promise.resolve({ id: published._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { title: string } };
    expect(json.data.title).toBe('New Title');
  });

  it("non-owning teacher cannot edit course → 403", async () => {
    const { teacher2, published } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher2._id.toString(), role: 'teacher' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/courses/${published._id}`, { title: 'Hacked', description: 'Bad actor' }),
      { params: Promise.resolve({ id: published._id.toString() }) },
    );
    expect(res.status).toBe(403);
  });

  it('admin edits any course → 200', async () => {
    const { admin, published } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/courses/${published._id}`, { isPublished: false }),
      { params: Promise.resolve({ id: published._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { isPublished: boolean } };
    expect(json.data.isPublished).toBe(false);
  });

  it('returns 400 for short title (< 3 chars)', async () => {
    const { teacher1, published } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/courses/${published._id}`, { title: 'AB' }),
      { params: Promise.resolve({ id: published._id.toString() }) },
    );
    expect(res.status).toBe(400);
  });

  it('teacher can publish their own course', async () => {
    const { teacher1, unpublished } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await PATCH(
      makeReq('PATCH', `http://localhost/api/courses/${unpublished._id}`, { isPublished: true }),
      { params: Promise.resolve({ id: unpublished._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { isPublished: boolean } };
    expect(json.data.isPublished).toBe(true);
  });
});

// ─── DELETE /api/courses/[id] ────────────────────────────────────────────────

describe('DELETE /api/courses/[id]', () => {
  it('owning teacher deletes own course → 200, course removed', async () => {
    const { teacher1, published } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await DELETE(
      makeReq('DELETE', `http://localhost/api/courses/${published._id}`),
      { params: Promise.resolve({ id: published._id.toString() }) },
    );
    expect(res.status).toBe(200);
    const deleted = await Course.findById(published._id);
    expect(deleted).toBeNull();
  });

  it("non-owning teacher cannot delete another teacher's course → 403", async () => {
    const { teacher2, published } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher2._id.toString(), role: 'teacher' } } as never);
    const res = await DELETE(
      makeReq('DELETE', `http://localhost/api/courses/${published._id}`),
      { params: Promise.resolve({ id: published._id.toString() }) },
    );
    expect(res.status).toBe(403);
    const stillExists = await Course.findById(published._id);
    expect(stillExists).not.toBeNull();
  });

  it('admin deletes any course → 200', async () => {
    const { admin, unpublished } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await DELETE(
      makeReq('DELETE', `http://localhost/api/courses/${unpublished._id}`),
      { params: Promise.resolve({ id: unpublished._id.toString() }) },
    );
    expect(res.status).toBe(200);
  });

  it('student cannot delete any course → 401', async () => {
    const { student, published } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res = await DELETE(
      makeReq('DELETE', `http://localhost/api/courses/${published._id}`),
      { params: Promise.resolve({ id: published._id.toString() }) },
    );
    expect(res.status).toBe(401);
  });

  it('deleting course also removes its videos and enrollments', async () => {
    const { teacher1, published } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    await DELETE(
      makeReq('DELETE', `http://localhost/api/courses/${published._id}`),
      { params: Promise.resolve({ id: published._id.toString() }) },
    );
    const videos      = await Video.find({ course: published._id });
    const enrollments = await Enrollment.find({ course: published._id });
    expect(videos.length).toBe(0);
    expect(enrollments.length).toBe(0);
  });
});
