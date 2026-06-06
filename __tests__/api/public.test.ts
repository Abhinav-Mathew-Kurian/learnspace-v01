import { GET as getWebinars } from '@/app/api/public/webinars/route';
import { GET as getPromotions } from '@/app/api/public/promotions/route';
import { GET as getPublicCourses } from '@/app/api/public/courses/route';
import { GET as getRatings, POST as postRating } from '@/app/api/ratings/route';
import { POST as postEnquiry } from '@/app/api/enquiries/route';
import User from '@/models/User';
import Course from '@/models/Course';
import PublicWebinar from '@/models/PublicWebinar';
import Promotion from '@/models/Promotion';
import Rating from '@/models/Rating';

function makeRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/public/webinars', () => {
  it('returns only future webinars sorted ASC', async () => {
    const futureDate1 = new Date(Date.now() + 3600000 * 2);
    const futureDate2 = new Date(Date.now() + 3600000 * 5);
    const pastDate = new Date(Date.now() - 3600000 * 2);

    await PublicWebinar.create([
      { title: 'Past Webinar', description: 'Past', date: pastDate, duration: 60, meetingUrl: 'https://x.com', instructor: 'A', topic: 'Past', isActive: true },
      { title: 'Future Webinar 2', description: 'Far', date: futureDate2, duration: 90, meetingUrl: 'https://x.com', instructor: 'B', topic: 'Far' },
      { title: 'Future Webinar 1', description: 'Near', date: futureDate1, duration: 60, meetingUrl: 'https://x.com', instructor: 'C', topic: 'Near' },
      { title: 'Inactive Webinar', description: 'Off', date: futureDate1, duration: 30, meetingUrl: 'https://x.com', instructor: 'D', topic: 'Off', isActive: false },
    ]);

    const req = makeRequest('GET', 'http://localhost/api/public/webinars');
    const res = await getWebinars();
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ title: string; date: string }> };
    const titles = json.data.map((w) => w.title);
    expect(titles).not.toContain('Past Webinar');
    expect(titles).not.toContain('Inactive Webinar');
    expect(titles).toContain('Future Webinar 1');
    expect(titles).toContain('Future Webinar 2');
    // Sorted ASC: nearest first
    const idx1 = titles.indexOf('Future Webinar 1');
    const idx2 = titles.indexOf('Future Webinar 2');
    expect(idx1).toBeLessThan(idx2);
  });
});

describe('GET /api/public/promotions', () => {
  it('returns only active promotions, no auth required', async () => {
    await Promotion.create([
      { title: 'Active Promo', description: 'Active', isActive: true },
      { title: 'Inactive Promo', description: 'Inactive', isActive: false },
    ]);

    const res = await getPromotions();
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ title: string }> };
    const titles = json.data.map((p) => p.title);
    expect(titles).toContain('Active Promo');
    expect(titles).not.toContain('Inactive Promo');
  });
});

describe('GET /api/public/courses', () => {
  it('returns only published courses with teacher name', async () => {
    const teacher = await User.create({ name: 'Public Teacher', email: 'pub@teacher.test', password: 'hash', role: 'teacher' });
    await Course.create({ title: 'Published Course', description: 'A published course', teacher: teacher._id, isPublished: true });
    await Course.create({ title: 'Unpublished Course', description: 'Not published', teacher: teacher._id, isPublished: false });

    const res = await getPublicCourses();
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ title: string; teacher: { name: string } }> };
    const titles = json.data.map((c) => c.title);
    expect(titles).toContain('Published Course');
    expect(titles).not.toContain('Unpublished Course');
    // Teacher info is populated
    const published = json.data.find((c) => c.title === 'Published Course');
    expect(published?.teacher?.name).toBe('Public Teacher');
  });
});

describe('POST /api/ratings', () => {
  it('returns 400 for rating of 0', async () => {
    const req = makeRequest('POST', 'http://localhost/api/ratings', {
      name: 'Test User',
      rating: 0,
      comment: 'This is a long enough comment',
    });
    const res = await postRating(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 201 with isApproved=false for valid rating with long comment', async () => {
    const req = makeRequest('POST', 'http://localhost/api/ratings', {
      name: 'Happy Student',
      email: 'happy@rating.test',
      rating: 5,
      comment: 'Excellent course! Really enjoyed it.',
      role: 'student',
    });
    const res = await postRating(req as never);
    expect(res.status).toBe(201);
    const json = await res.json() as { success: boolean };
    expect(json.success).toBe(true);

    // Verify isApproved is false in DB
    const saved = await Rating.findOne({ name: 'Happy Student' });
    expect(saved?.isApproved).toBe(false);
  });

  it('returns 400 when comment is too short', async () => {
    const req = makeRequest('POST', 'http://localhost/api/ratings', {
      name: 'Test',
      rating: 4,
      comment: 'Short',
    });
    const res = await postRating(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is too short', async () => {
    const req = makeRequest('POST', 'http://localhost/api/ratings', {
      name: 'A', // too short (min 2)
      rating: 4,
      comment: 'This is a long enough comment',
    });
    const res = await postRating(req as never);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/ratings', () => {
  it('returns only approved ratings', async () => {
    await Rating.create([
      { name: 'Approved', rating: 5, comment: 'Excellent course content here!', isApproved: true },
      { name: 'Pending', rating: 4, comment: 'Good course but needs work!', isApproved: false },
    ]);

    const res = await getRatings();
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Array<{ name: string }> };
    const names = json.data.map((r) => r.name);
    expect(names).toContain('Approved');
    expect(names).not.toContain('Pending');
  });
});

describe('POST /api/enquiries', () => {
  it('returns 400 when name is missing', async () => {
    const req = makeRequest('POST', 'http://localhost/api/enquiries', {
      email: 'x@x.com',
      subject: 'Test Subject',
      message: 'This is a test message for the enquiry',
    });
    const res = await postEnquiry(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 201 for valid enquiry', async () => {
    const req = makeRequest('POST', 'http://localhost/api/enquiries', {
      name: 'Enquiry Person',
      email: 'enquiry@test.com',
      subject: 'Course Information',
      message: 'I would like to know more about your courses.',
    });
    const res = await postEnquiry(req as never);
    expect(res.status).toBe(201);
    const json = await res.json() as { success: boolean };
    expect(json.success).toBe(true);
  });

  it('returns 400 when email is invalid', async () => {
    const req = makeRequest('POST', 'http://localhost/api/enquiries', {
      name: 'Test Person',
      email: 'notanemail',
      subject: 'Course info',
      message: 'This is a test message for the enquiry',
    });
    const res = await postEnquiry(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when message is too short', async () => {
    const req = makeRequest('POST', 'http://localhost/api/enquiries', {
      name: 'Test Person',
      email: 'test@test.com',
      subject: 'Test',
      message: 'Short',
    });
    const res = await postEnquiry(req as never);
    expect(res.status).toBe(400);
  });
});
