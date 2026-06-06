import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import CourseInstallment from '@/models/CourseInstallment';
import Course from '@/models/Course';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  if (!studentId) return NextResponse.json({ success: false, error: 'studentId required' }, { status: 400 });

  await connectDB();

  const installments = await CourseInstallment.find({ student: studentId })
    .populate('course', 'title currency')
    .sort({ course: 1, installmentNumber: 1 })
    .lean();

  return NextResponse.json({ success: true, data: installments });
}

// Generate a full installment schedule for a student + course
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { studentId, courseId, startDate } = body;
  if (!studentId || !courseId) {
    return NextResponse.json({ success: false, error: 'studentId and courseId required' }, { status: 400 });
  }

  await connectDB();

  const course = await Course.findById(courseId).lean();
  if (!course || course.pricingType !== 'installment' || !course.installmentMonths) {
    return NextResponse.json({ success: false, error: 'Course is not an installment course' }, { status: 400 });
  }

  // Check not already generated
  const existing = await CourseInstallment.findOne({ student: studentId, course: courseId });
  if (existing) {
    return NextResponse.json({ success: false, error: 'Schedule already generated for this course' }, { status: 409 });
  }

  const start = startDate ? new Date(startDate) : new Date();
  const docs = Array.from({ length: course.installmentMonths }, (_, i) => {
    const due = new Date(start);
    due.setMonth(due.getMonth() + i);
    return {
      student: studentId,
      course: courseId,
      installmentNumber: i + 1,
      amount: course.price,
      currency: course.currency ?? 'INR',
      dueDate: due,
      status: 'pending' as const,
      paidAt: null,
      notes: '',
    };
  });

  const created = await CourseInstallment.insertMany(docs);
  return NextResponse.json({ success: true, data: created });
}
