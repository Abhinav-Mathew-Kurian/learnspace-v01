import { GET, POST } from '@/app/api/comments/route';
import { PATCH } from '@/app/api/comments/[id]/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Enrollment from '@/models/Enrollment';
import Comment from '@/models/Comment';
import CommentDedup from '@/models/CommentDedup';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
const mockAuth = auth as jest.MockedFunction<typeof auth>;

function makePostReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetReq(url: string): Request {
  return new Request(url, { method: 'GET' });
}

async function setup() {
  const admin = await User.create({ name: 'Admin', email: 'admin@comments.api', password: 'hash', role: 'admin' });
  const teacher = await User.create({ name: 'Teacher', email: 'teacher@comments.api', password: 'hash', role: 'teacher' });
  const student = await User.create({ name: 'Student', email: 'student@comments.api', password: 'hash', role: 'student' });
  const course = await Course.create({ title: 'Comment Course', description: 'Course for comment tests', teacher: teacher._id });
  const video = await Video.create({ course: course._id, title: 'Comment Video', youtubeId: 'commentVid1A', order: 1 });
  await Enrollment.create({ student: student._id, course: course._id, enrolledBy: admin._id });
  return { admin, teacher, student, course, video };
}

describe('POST /api/comments', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = makePostReq('http://localhost/api/comments', { content: 'Hello', courseId: 'x' });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 when neither courseId nor videoId provided', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'uid', role: 'student' } } as never);
    const req = makePostReq('http://localhost/api/comments', { content: 'Hello' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 403 when student is not enrolled', async () => {
    const { course } = await setup();
    const stranger = await User.create({ name: 'Stranger', email: 'stranger@comments.api', password: 'hash', role: 'student' });
    mockAuth.mockResolvedValueOnce({ user: { id: stranger._id.toString(), role: 'student' } } as never);
    const req = makePostReq('http://localhost/api/comments', { content: 'Hello!', courseId: course._id.toString() });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it('returns 201 for valid post with courseId from enrolled student', async () => {
    const { student, course } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makePostReq('http://localhost/api/comments', { content: 'Great course!', courseId: course._id.toString() });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json() as { success: boolean; data: { content: string } };
    expect(json.success).toBe(true);
    expect(json.data.content).toBe('Great course!');
  });

  it('returns 409 on duplicate submission within 30 seconds', async () => {
    const { student, course } = await setup();

    // First post
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const body = { content: 'Unique comment here', courseId: course._id.toString() };
    await POST(makePostReq('http://localhost/api/comments', body) as never);

    // Second identical post (same bucket since within 30s)
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res2 = await POST(makePostReq('http://localhost/api/comments', body) as never);
    expect(res2.status).toBe(409);
  });

  it('resolves enrollment from videoId for video-level comments', async () => {
    const { student, video } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makePostReq('http://localhost/api/comments', { content: 'Great video!', videoId: video._id.toString() });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
  });

  it('returns 403 for video-level comment when student not enrolled in video course', async () => {
    const { video } = await setup();
    const stranger = await User.create({ name: 'VideoStranger', email: 'vs@comments.api', password: 'hash', role: 'student' });
    mockAuth.mockResolvedValueOnce({ user: { id: stranger._id.toString(), role: 'student' } } as never);
    const req = makePostReq('http://localhost/api/comments', { content: 'Not enrolled!', videoId: video._id.toString() });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/comments', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = makeGetReq('http://localhost/api/comments?courseId=x');
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it('returns paginated results with limit and total', async () => {
    const { teacher, course } = await setup();

    // Create 8 comments
    for (let i = 0; i < 8; i++) {
      const u = await User.create({ name: `User${i}`, email: `user${i}@pag.test`, password: 'hash', role: 'teacher' });
      await Comment.create({ author: u._id, content: `Comment number ${i}`, course: course._id });
    }

    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const req = makeGetReq(`http://localhost/api/comments?courseId=${course._id.toString()}&limit=5&page=1`);
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: unknown[]; total: number; limit: number; pages: number };
    expect(json.data).toHaveLength(5);
    expect(json.total).toBe(8);
    expect(json.limit).toBe(5);
    expect(json.pages).toBe(2);
  });

  it('returns 400 when neither courseId nor videoId provided', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'uid', role: 'teacher' } } as never);
    const req = makeGetReq('http://localhost/api/comments');
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });
});

// ─── Reply depth enforcement ────────────────────────────────────────────────

describe('POST /api/comments — reply depth', () => {
  it('allows depth-1 reply (comment → reply)', async () => {
    const { student, course } = await setup();
    const author = await User.create({ name: 'Author', email: 'author@depth.test', password: 'h', role: 'teacher' });
    const parent = await Comment.create({ author: author._id, content: 'Top-level', course: course._id });

    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makePostReq('http://localhost/api/comments', {
      content: 'A valid reply',
      courseId: course._id.toString(),
      parentCommentId: parent._id.toString(),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json() as { data: { parentComment: string } };
    expect(json.data.parentComment.toString()).toBe(parent._id.toString());
  });

  it('rejects depth-2 reply (reply → reply) with 400', async () => {
    const { student, course } = await setup();
    const author = await User.create({ name: 'D2Author', email: 'd2author@depth.test', password: 'h', role: 'teacher' });
    const parent = await Comment.create({ author: author._id, content: 'Top-level', course: course._id });
    const reply = await Comment.create({
      author: author._id,
      content: 'First reply',
      course: course._id,
      parentComment: parent._id,
    });

    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makePostReq('http://localhost/api/comments', {
      content: 'Reply to a reply — should fail',
      courseId: course._id.toString(),
      parentCommentId: reply._id.toString(), // reply already has a parentComment
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/1 level deep/i);
  });
});

// ─── Soft delete (PATCH isDeleted) ──────────────────────────────────────────

describe('PATCH /api/comments/[id] — soft delete', () => {
  it('student soft-deletes own comment → isDeleted=true, document still exists', async () => {
    const { student, course } = await setup();
    const comment = await Comment.create({ author: student._id, content: 'My comment', course: course._id });

    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makePostReq(`http://localhost/api/comments/${comment._id}`, { isDeleted: true });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: comment._id.toString() }) });
    expect(res.status).toBe(200);

    // Document still exists in DB
    const doc = await Comment.findById(comment._id);
    expect(doc).not.toBeNull();
    expect(doc!.isDeleted).toBe(true);
  });

  it("student cannot soft-delete another student's comment → 403", async () => {
    const { course } = await setup();
    const stranger = await User.create({ name: 'S2', email: 's2@delete.test', password: 'h', role: 'student' });
    const victim = await User.create({ name: 'Victim', email: 'victim@delete.test', password: 'h', role: 'student' });
    const comment = await Comment.create({ author: victim._id, content: 'Victim comment', course: course._id });

    mockAuth.mockResolvedValueOnce({ user: { id: stranger._id.toString(), role: 'student' } } as never);
    const req = makePostReq(`http://localhost/api/comments/${comment._id}`, { isDeleted: true });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: comment._id.toString() }) });
    expect(res.status).toBe(403);
  });

  it('teacher soft-deletes any comment on their course → 200', async () => {
    const { teacher, student, course } = await setup();
    const comment = await Comment.create({ author: student._id, content: 'Student comment', course: course._id });

    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const req = makePostReq(`http://localhost/api/comments/${comment._id}`, { isDeleted: true });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: comment._id.toString() }) });
    expect(res.status).toBe(200);
    const doc = await Comment.findById(comment._id);
    expect(doc!.isDeleted).toBe(true);
  });

  it('admin soft-deletes any comment → 200', async () => {
    const { admin, student, course } = await setup();
    const comment = await Comment.create({ author: student._id, content: 'Any comment', course: course._id });

    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makePostReq(`http://localhost/api/comments/${comment._id}`, { isDeleted: true });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: comment._id.toString() }) });
    expect(res.status).toBe(200);
  });
});

// ─── Pin toggle ──────────────────────────────────────────────────────────────

describe('PATCH /api/comments/[id] — pin', () => {
  it('teacher pins a comment on their course → isPinned=true', async () => {
    const { teacher, student, course } = await setup();
    const comment = await Comment.create({ author: student._id, content: 'Pin this', course: course._id });

    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const req = makePostReq(`http://localhost/api/comments/${comment._id}`, { isPinned: true });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: comment._id.toString() }) });
    expect(res.status).toBe(200);
    const doc = await Comment.findById(comment._id);
    expect(doc!.isPinned).toBe(true);
  });

  it('admin pins a comment → 200', async () => {
    const { admin, student, course } = await setup();
    const comment = await Comment.create({ author: student._id, content: 'Admin pin', course: course._id });

    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const req = makePostReq(`http://localhost/api/comments/${comment._id}`, { isPinned: true });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: comment._id.toString() }) });
    expect(res.status).toBe(200);
    const doc = await Comment.findById(comment._id);
    expect(doc!.isPinned).toBe(true);
  });

  it('student trying to pin → 403', async () => {
    const { student, course } = await setup();
    const comment = await Comment.create({ author: student._id, content: 'Try pin', course: course._id });

    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makePostReq(`http://localhost/api/comments/${comment._id}`, { isPinned: true });
    const res = await PATCH(req as never, { params: Promise.resolve({ id: comment._id.toString() }) });
    expect(res.status).toBe(403);
  });
});
