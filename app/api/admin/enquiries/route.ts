import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const enquiries = await Enquiry.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, data: enquiries });
}
