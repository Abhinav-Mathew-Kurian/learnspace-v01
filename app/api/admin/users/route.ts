import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import CourseInstallment from '@/models/CourseInstallment';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['teacher', 'student']),
  phone: z.string().optional(),
  subscriptionType: z.enum(['1month', '3month', '6month', '1year']).optional().nullable(),
  subscriptionExpiry: z.string().optional().nullable(),
  installmentPending: z.boolean().optional(),
  installmentAmount: z.number().optional().nullable(),
  installmentDueDate: z.string().optional().nullable(),
  bio: z.string().optional(),
  specialization: z.string().optional(),
  isGuestLecturer: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { searchParams } = req.nextUrl;
  const role = searchParams.get('role');
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;

  const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

  // Attach course-installment summary (only for student queries to keep it cheap)
  if (role === 'student' && users.length > 0) {
    const ids = users.map(u => u._id);
    const summary = await CourseInstallment.aggregate([
      { $match: { student: { $in: ids }, status: { $ne: 'paid' } } },
      { $group: { _id: '$student', pendingCount: { $sum: 1 }, nextDue: { $min: '$dueDate' }, nextAmount: { $first: '$amount' } } },
    ]);
    const summaryMap = new Map(summary.map((s: { _id: { toString(): string }; pendingCount: number; nextDue: Date; nextAmount: number }) => [s._id.toString(), s]));
    const enriched = users.map(u => {
      const obj = u.toObject() as unknown as Record<string, unknown>;
      obj.courseInstallmentSummary = summaryMap.get(u._id.toString()) ?? null;
      return obj;
    });
    return NextResponse.json({ success: true, data: enriched });
  }

  return NextResponse.json({ success: true, data: users });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  await connectDB();

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 409 });
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12);

  const user = await User.create({
    ...parsed.data,
    password: hashed,
    subscriptionExpiry: parsed.data.subscriptionExpiry
      ? new Date(parsed.data.subscriptionExpiry)
      : null,
    installmentDueDate: parsed.data.installmentDueDate
      ? new Date(parsed.data.installmentDueDate)
      : null,
    createdBy: session.user.id,
  });

  const userObj = user.toObject();
  delete (userObj as { password?: string }).password;

  return NextResponse.json({ success: true, data: userObj }, { status: 201 });
}
