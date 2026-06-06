import { GET, POST } from '@/app/api/progress/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
import Video from '@/models/Video';
import Enrollment from '@/models/Enrollment';
import Progress from '@/models/Progress';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
const mockAuth = auth as jest.MockedFunction<typeof auth>;

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function setup() {
  const student = await User.create({ name: 'Student', email: 'student@progress.api', password: 'hash', role: 'student' });
  const teacher = await User.create({ name: 'Teacher', email: 'teacher@progress.api', password: 'hash', role: 'teacher' });
  const admin = await User.create({ name: 'Admin', email: 'admin@progress.api', password: 'hash', role: 'admin' });
  const course = await Course.create({ title: 'Test Course', description: 'Course for progress API', teacher: teacher._id });
  const video = await Video.create({ course: course._id, title: 'Test Video', youtubeId: 'testvid1234', order: 1, duration: 300 });
  return { student, teacher, admin, course, video };
}

describe('POST /api/progress', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = makeRequest('POST', 'http://localhost/api/progress', {});
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 401 for teacher role (non-student)', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'tid', role: 'teacher' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/progress', {});
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 401 for admin role (non-student)', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'aid', role: 'admin' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/progress', {});
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 403 when student is not enrolled', async () => {
    const { student, course, video } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('POST', 'http://localhost/api/progress', {
      videoId: video._id.toString(),
      courseId: course._id.toString(),
      watchedSeconds: 100,
      totalSeconds: 300,
      lastPosition: 100,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it('returns 200 and upserts progress for enrolled student', async () => {
    const { student, teacher, course, video } = await setup();
    await Enrollment.create({ student: student._id, course: course._id, enrolledBy: teacher._id });
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);

    const req = makeRequest('POST', 'http://localhost/api/progress', {
      videoId: video._id.toString(),
      courseId: course._id.toString(),
      watchedSeconds: 150,
      totalSeconds: 300,
      lastPosition: 150,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; data: { watchedSeconds: number; percentComplete: number } };
    expect(json.success).toBe(true);
    expect(json.data.watchedSeconds).toBe(150);
    expect(json.data.percentComplete).toBeCloseTo(50);
  });

  it('caps watchedSeconds at totalSeconds', async () => {
    const { student, teacher, course, video } = await setup();
    await Enrollment.create({ student: student._id, course: course._id, enrolledBy: teacher._id });
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);

    const req = makeRequest('POST', 'http://localhost/api/progress', {
      videoId: video._id.toString(),
      courseId: course._id.toString(),
      watchedSeconds: 500, // more than 300 total
      totalSeconds: 300,
      lastPosition: 300,
    });
    const res = await POST(req as never);
    const json = await res.json() as { data: { watchedSeconds: number } };
    expect(json.data.watchedSeconds).toBe(300); // capped to totalSeconds
  });

  it('sets isCompleted to true when watchedSeconds >= 90% of totalSeconds', async () => {
    const { student, teacher, course, video } = await setup();
    await Enrollment.create({ student: student._id, course: course._id, enrolledBy: teacher._id });
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);

    const req = makeRequest('POST', 'http://localhost/api/progress', {
      videoId: video._id.toString(),
      courseId: course._id.toString(),
      watchedSeconds: 275, // 275/300 = 91.67% >= 90%
      totalSeconds: 300,
      lastPosition: 275,
    });
    const res = await POST(req as never);
    const json = await res.json() as { data: { isCompleted: boolean } };
    expect(json.data.isCompleted).toBe(true);
  });

  it('uses $max so lower subsequent value does not overwrite higher', async () => {
    const { student, teacher, course, video } = await setup();
    await Enrollment.create({ student: student._id, course: course._id, enrolledBy: teacher._id });

    // First request with high value
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    await POST(makeRequest('POST', 'http://localhost/api/progress', {
      videoId: video._id.toString(),
      courseId: course._id.toString(),
      watchedSeconds: 200,
      totalSeconds: 300,
      lastPosition: 200,
    }) as never);

    // Second request with lower value
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res2 = await POST(makeRequest('POST', 'http://localhost/api/progress', {
      videoId: video._id.toString(),
      courseId: course._id.toString(),
      watchedSeconds: 50, // lower value
      totalSeconds: 300,
      lastPosition: 50,
    }) as never);

    const json = await res2.json() as { data: { watchedSeconds: number } };
    expect(json.data.watchedSeconds).toBe(200); // still the higher value
  });
});

describe('GET /api/progress', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = makeRequest('GET', 'http://localhost/api/progress');
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-student role', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'tid', role: 'teacher' } } as never);
    const req = makeRequest('GET', 'http://localhost/api/progress');
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it('returns only current student progress with courseId filter', async () => {
    const { student, teacher, course, video } = await setup();
    await Progress.create({
      student: student._id,
      video: video._id,
      course: course._id,
      watchedSeconds: 100,
      totalSeconds: 300,
      percentComplete: 33,
    });

    // Another student's progress
    const other = await User.create({ name: 'Other', email: 'other@progress.test', password: 'h', role: 'student' });
    const otherVideo = await Video.create({ course: course._id, title: 'OV', youtubeId: 'otherVidXYZA', order: 9 });
    await Progress.create({
      student: other._id,
      video: otherVideo._id,
      course: course._id,
      watchedSeconds: 200,
      totalSeconds: 300,
      percentComplete: 66,
    });

    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const req = makeRequest('GET', `http://localhost/api/progress?courseId=${course._id.toString()}`);
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ student: string }> };
    expect(json.data).toHaveLength(1);
    expect(json.data[0].student.toString()).toBe(student._id.toString());
  });
});
