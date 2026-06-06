import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';
import Enquiry from '@/models/Enquiry';
import AppShell from '@/components/shared/AppShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/login');

  await connectDB();
  const [upcomingEventCount, unreadEnquiryCount] = await Promise.all([
    Event.countDocuments({ date: { $gte: new Date() } }),
    Enquiry.countDocuments({ isRead: false }),
  ]);

  return (
    <AppShell role="admin" userName={session.user.name ?? ''} upcomingEventCount={upcomingEventCount} unreadEnquiryCount={unreadEnquiryCount}>
      {children}
    </AppShell>
  );
}
