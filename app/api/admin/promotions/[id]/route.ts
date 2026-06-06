import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Promotion from '@/models/Promotion';

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
  const promotion = await Promotion.findByIdAndUpdate(
    id,
    { ...body, ...(body.validUntil ? { validUntil: new Date(body.validUntil) } : {}) },
    { returnDocument: 'after', runValidators: true }
  );

  if (!promotion) {
    return NextResponse.json({ success: false, error: 'Promotion not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: promotion });
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
  const promotion = await Promotion.findByIdAndDelete(id);

  if (!promotion) {
    return NextResponse.json({ success: false, error: 'Promotion not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Promotion deleted' });
}
