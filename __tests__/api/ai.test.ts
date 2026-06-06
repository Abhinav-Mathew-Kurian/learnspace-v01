import { POST } from '@/app/api/ai/ask/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import AiRequest from '@/models/AiRequest';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Mock openrouter to return a fake SSE stream
jest.mock('@/lib/openrouter', () => ({
  askOpenRouter: jest.fn().mockImplementation(() => {
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(enc.encode('data: "Hello"\n\n'));
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return Promise.resolve(stream);
  }),
}));

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function setup() {
  const admin = await User.create({ name: 'Admin', email: 'admin@ai.api', password: 'hash', role: 'admin' });
  const teacher = await User.create({ name: 'Teacher', email: 'teacher@ai.api', password: 'hash', role: 'teacher' });
  const student = await User.create({ name: 'Student', email: 'student@ai.api', password: 'hash', role: 'student' });
  const course = await Course.create({ title: 'AI Course', description: 'Course for AI tests', teacher: teacher._id });
  await Enrollment.create({ student: student._id, course: course._id, enrolledBy: admin._id });
  return { admin, teacher, student, course };
}

describe('POST /api/ai/ask', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ question: 'Hello', courseId: 'x' }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 401 for admin role', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'aid', role: 'admin' } } as never);
    const res = await POST(makeRequest({ question: 'Hello', courseId: 'x' }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 when question is missing', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'sid', role: 'student' } } as never);
    const res = await POST(makeRequest({ courseId: 'x' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when courseId is missing', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'sid', role: 'student' } } as never);
    const res = await POST(makeRequest({ question: 'What is React?' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 403 when student is not enrolled', async () => {
    const { course } = await setup();
    const stranger = await User.create({ name: 'Stranger', email: 'stranger@ai.api', password: 'hash', role: 'student' });
    mockAuth.mockResolvedValueOnce({ user: { id: stranger._id.toString(), role: 'student' } } as never);
    const res = await POST(makeRequest({ question: 'What is React?', courseId: course._id.toString() }) as never);
    expect(res.status).toBe(403);
  });

  it('returns 429 when student hits rate limit (16th request)', async () => {
    const { student, course } = await setup();
    // Pre-populate 15 AI requests (the limit)
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push({ user: student._id, createdAt: new Date() });
    }
    await AiRequest.insertMany(requests);

    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res = await POST(makeRequest({ question: 'What is React?', courseId: course._id.toString() }) as never);
    expect(res.status).toBe(429);
  });

  it('returns SSE stream for valid enrolled student request', async () => {
    const { student, course } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res = await POST(makeRequest({ question: 'What is JavaScript?', courseId: course._id.toString() }) as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
  });

  it('teacher can ask AI without enrollment check', async () => {
    const { teacher, course } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const res = await POST(makeRequest({ question: 'Explain this course', courseId: course._id.toString() }) as never);
    expect(res.status).toBe(200);
  });
});
