import { GET } from '@/app/api/admin/enquiries/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Enquiry from '@/models/Enquiry';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
const mockAuth = auth as jest.MockedFunction<typeof auth>;

async function setup() {
  const admin = await User.create({ name: 'Admin', email: 'admin@enquiries.test', password: 'hash', role: 'admin' });
  const teacher = await User.create({ name: 'Teacher', email: 'teacher@enquiries.test', password: 'hash', role: 'teacher' });
  const student = await User.create({ name: 'Student', email: 'student@enquiries.test', password: 'hash', role: 'student' });
  return { admin, teacher, student };
}

describe('GET /api/admin/enquiries', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 401 for teacher role', async () => {
    const { teacher } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: teacher._id.toString(), role: 'teacher' } } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 401 for student role', async () => {
    const { student } = await setup();
    mockAuth.mockResolvedValueOnce({ user: { id: student._id.toString(), role: 'student' } } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('admin GET returns all enquiries sorted by createdAt DESC', async () => {
    const { admin } = await setup();

    // Create two enquiries with distinct timestamps
    const first = await Enquiry.create({
      name: 'First Person',
      email: 'first@test.com',
      subject: 'First Subject',
      message: 'This is the first enquiry message',
    });

    // Ensure second has a later createdAt
    await new Promise((r) => setTimeout(r, 10));
    const second = await Enquiry.create({
      name: 'Second Person',
      email: 'second@test.com',
      subject: 'Second Subject',
      message: 'This is the second enquiry message',
    });

    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ name: string }> };
    expect(json.data.length).toBeGreaterThanOrEqual(2);

    const names = json.data.map((e) => e.name);
    expect(names).toContain('First Person');
    expect(names).toContain('Second Person');

    // Most recent (second) should come first due to sort DESC
    const secondIdx = json.data.findIndex((e) => e.name === 'Second Person');
    const firstIdx = json.data.findIndex((e) => e.name === 'First Person');
    expect(secondIdx).toBeLessThan(firstIdx);
  });

  it('enquiry fields include name, email, subject, message, isRead', async () => {
    const { admin } = await setup();
    await Enquiry.create({
      name: 'Field Check',
      email: 'field@test.com',
      subject: 'Field Test Subject',
      message: 'Checking that all required fields are returned',
    });
    mockAuth.mockResolvedValueOnce({ user: { id: admin._id.toString(), role: 'admin' } } as never);
    const res = await GET();
    const json = await res.json() as { data: Array<Record<string, unknown>> };
    const enquiry = json.data.find((e) => e.name === 'Field Check');
    expect(enquiry).toBeDefined();
    expect(enquiry!.email).toBe('field@test.com');
    expect(enquiry!.subject).toBe('Field Test Subject');
    expect(enquiry!.isRead).toBe(false); // defaults to false
  });
});
