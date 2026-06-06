import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PublicWebinar from '@/models/PublicWebinar';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  await connectDB();
  const webinar = await PublicWebinar.findByIdAndUpdate(
    id,
    { ...body, ...(body.date ? { date: new Date(body.date) } : {}) },
    { returnDocument: 'after', runValidators: true }
  );

  if (!webinar) {
    return NextResponse.json({ success: false, error: 'Webinar not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: webinar });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await connectDB();
  const webinar = await PublicWebinar.findByIdAndDelete(id);

  if (!webinar) {
    return NextResponse.json({ success: false, error: 'Webinar not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Webinar deleted' });
}
