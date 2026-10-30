import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { AdminHeader } from '@/components/admin/admin-header';
import { getAllAdminEvents } from '@/lib/data/events-and-updates';
import { EventsManager } from '@/components/admin/events-manager';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/events');
  if (profile.role !== 'admin') redirect('/');

  const events = await getAllAdminEvents();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Events & Community Workshops"
        description="Schedule, manage, and publish student hackathons, certification challenge sprints, and developer conferences."
      />

      <EventsManager initialEvents={events} />
    </div>
  );
}
