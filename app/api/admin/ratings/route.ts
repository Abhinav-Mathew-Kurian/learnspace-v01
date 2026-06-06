import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Rating from '@/models/Rating';

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const ratings = await Rating.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, data: ratings });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id, isApproved } = await req.json();

  if (!id || typeof isApproved !== 'boolean') {
    return NextResponse.json({ success: false, error: 'id and isApproved are required' }, { status: 400 });
  }

  await connectDB();
  const rating = await Rating.findByIdAndUpdate(id, { isApproved }, { returnDocument: 'after' });

  if (!rating) {
    return NextResponse.json({ success: false, error: 'Rating not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: rating });
}
