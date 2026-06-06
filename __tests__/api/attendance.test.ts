import { GET, POST } from '@/app/api/attendance/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Course from '@/models/Course';
import Batch from '@/models/Batch';
import LiveSession from '@/models/LiveSession';
import Attendance from '@/models/Attendance';
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
  const admin   = await User.create({ name: 'Admin',    email: 'admin@att.test',   password: 'h', role: 'admin'   });
  const teacher1 = await User.create({ name: 'Teacher1', email: 'teacher1@att.test', password: 'h', role: 'teacher' });
  const teacher2 = await User.create({ name: 'Teacher2', email: 'teacher2@att.test', password: 'h', role: 'teacher' });
  const student  = await User.create({ name: 'Student',  email: 'student@att.test',  password: 'h', role: 'student' });
  const student2 = await User.create({ name: 'Student2', email: 'student2@att.test', password: 'h', role: 'student' });

  const course = await Course.create({ title: 'Att Course', description: 'For attendance tests', teacher: teacher1._id });
  const batch  = await Batch.create({
    name: 'Att Batch',
    teacher: teacher1._id,
    course: course._id,
    students: [student._id],
  });
  const session = await LiveSession.create({
    batch: batch._id,
    teacher: teacher1._id,
    course: course._id,
    title: 'Live Session',
    scheduledAt: new Date(Date.now() - 3600_000), // 1 hour ago
    duration: 60,
    meetLink: 'https://meet.google.com/att',
    status: 'ended',
  });

  return { admin, teacher1, teacher2, student, student2, course, batch, session };
}

// ─── POST /api/attendance ────────────────────────────────────────────────────

describe('POST /api/attendance', () => {
  it('returns 403 for unauthenticated request', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeReq('POST', 'http://localhost/api/attendance', { sessionId: 'x', records: [{ studentId: 'y', status: 'present' }] }));
    expect(res.status).toBe(403);
  });

  it('returns 403 for student role (cannot mark attendance)', async () => {
    const { student, session } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/attendance', {
      sessionId: session._id.toString(),
      records: [{ studentId: student._id.toString(), status: 'present' }],
    }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when records array is missing', async () => {
    const { teacher1 } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/attendance', { sessionId: 'x' }));
    expect(res.status).toBe(400);
  });

  it('teacher marks student present → attendance saved', async () => {
    const { teacher1, student, session } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/attendance', {
      sessionId: session._id.toString(),
      records: [{ studentId: student._id.toString(), status: 'present' }],
    }));
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; data: Array<{ status: string }> };
    expect(json.success).toBe(true);
    expect(json.data[0].status).toBe('present');
  });

  it('teacher marks student absent → status stored as absent', async () => {
    const { teacher1, student, session } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/attendance', {
      sessionId: session._id.toString(),
      records: [{ studentId: student._id.toString(), status: 'absent' }],
    }));
    expect(res.status).toBe(200);
    const att = await Attendance.findOne({ session: session._id, student: student._id });
    expect(att?.status).toBe('absent');
  });

  it('duplicate mark upserts — does NOT create a second document', async () => {
    const { teacher1, student, session } = await setup();

    // First mark: absent
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    await POST(makeReq('POST', 'http://localhost/api/attendance', {
      sessionId: session._id.toString(),
      records: [{ studentId: student._id.toString(), status: 'absent' }],
    }));

    // Second mark: present (upsert)
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    await POST(makeReq('POST', 'http://localhost/api/attendance', {
      sessionId: session._id.toString(),
      records: [{ studentId: student._id.toString(), status: 'present' }],
    }));

    const count = await Attendance.countDocuments({ session: session._id, student: student._id });
    expect(count).toBe(1); // upserted, not duplicated

    const att = await Attendance.findOne({ session: session._id, student: student._id });
    expect(att?.status).toBe('present'); // updated to latest
  });

  it('teacher cannot mark attendance for another teacher session → 403', async () => {
    const { teacher2, student, session } = await setup();
    // session belongs to teacher1; teacher2 tries to mark
    mockAuth.mockResolvedValueOnce({ user: { id: teacher2._id.toString(), role: 'teacher' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/attendance', {
      sessionId: session._id.toString(),
      records: [{ studentId: student._id.toString(), status: 'present' }],
    }));
    expect(res.status).toBe(403);
  });

  it('admin can mark attendance for any session', async () => {
    const { admin, student, session } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/attendance', {
      sessionId: session._id.toString(),
      records: [{ studentId: student._id.toString(), status: 'late' }],
    }));
    expect(res.status).toBe(200);
  });

  it('marks multiple students in one call', async () => {
    const { teacher1, student, student2, session } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await POST(makeReq('POST', 'http://localhost/api/attendance', {
      sessionId: session._id.toString(),
      records: [
        { studentId: student._id.toString(),  status: 'present' },
        { studentId: student2._id.toString(), status: 'absent'  },
      ],
    }));
    expect(res.status).toBe(200);
    const count = await Attendance.countDocuments({ session: session._id });
    expect(count).toBe(2);
  });
});

// ─── GET /api/attendance ─────────────────────────────────────────────────────

describe('GET /api/attendance', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(makeReq('GET', 'http://localhost/api/attendance'));
    expect(res.status).toBe(401);
  });

  it('admin gets all attendance records', async () => {
    const { admin, teacher1, student, student2, session } = await setup();

    // Seed two records
    await Attendance.create([
      { session: session._id, student: student._id,  batch: session.batch, markedBy: teacher1._id, status: 'present' },
      { session: session._id, student: student2._id, batch: session.batch, markedBy: teacher1._id, status: 'absent'  },
    ]);

    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await GET(makeReq('GET', 'http://localhost/api/attendance'));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: unknown[] };
    expect(json.data.length).toBeGreaterThanOrEqual(2);
  });

  it('teacher gets only records from their own sessions', async () => {
    const { teacher1, teacher2, student, student2, session, course, batch } = await setup();

    // Session owned by teacher2
    const otherSession = await LiveSession.create({
      batch: batch._id,
      teacher: teacher2._id,
      course: course._id,
      title: 'Other Session',
      scheduledAt: new Date(),
      duration: 60,
      meetLink: 'https://meet.google.com/other',
      status: 'ended',
    });

    await Attendance.create([
      { session: session._id,      student: student._id,  batch: session.batch, markedBy: teacher1._id, status: 'present' },
      { session: otherSession._id, student: student2._id, batch: session.batch, markedBy: teacher2._id, status: 'absent'  },
    ]);

    mockAuth.mockResolvedValueOnce({ user: { id: teacher1._id.toString(), role: 'teacher' } } as never);
    const res = await GET(makeReq('GET', 'http://localhost/api/attendance'));
    const json = await res.json() as { data: Array<{ session: { _id: string } | string }> };

    // Only teacher1's session should appear
    for (const rec of json.data) {
      const sessId = typeof rec.session === 'object' ? rec.session._id : rec.session;
      expect(sessId.toString()).toBe(session._id.toString());
    }
  });

  it('student gets only their own attendance records', async () => {
    const { student, student2, teacher1, session } = await setup();

    await Attendance.create([
      { session: session._id, student: student._id,  batch: session.batch, markedBy: teacher1._id, status: 'present' },
      { session: session._id, student: student2._id, batch: session.batch, markedBy: teacher1._id, status: 'absent'  },
    ]);

    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res = await GET(makeReq('GET', 'http://localhost/api/attendance'));
    const json = await res.json() as { data: Array<{ student: { _id: string } | string }> };

    for (const rec of json.data) {
      const stuId = typeof rec.student === 'object' ? rec.student._id : rec.student;
      expect(stuId.toString()).toBe(student._id.toString());
    }
  });
});
