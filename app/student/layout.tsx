import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';
import AppShell from '@/components/shared/AppShell';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== 'student') redirect('/login');

  await connectDB();
  const upcomingEventCount = await Event.countDocuments({
    date: { $gte: new Date() },
    audience: { $in: ['all', 'students'] },
  });

  return (
    <AppShell role="student" userName={session.user.name ?? ''} upcomingEventCount={upcomingEventCount}>
      {children}
    </AppShell>
  );
}
