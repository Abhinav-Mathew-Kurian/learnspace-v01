import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const enquirySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = enquirySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  await connectDB();

  await Enquiry.create(parsed.data);

  return NextResponse.json(
    { success: true, message: "Thanks for reaching out! We'll get back to you soon." },
    { status: 201 }
  );
}
