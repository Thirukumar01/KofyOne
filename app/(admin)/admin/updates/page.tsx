import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { AdminHeader } from '@/components/admin/admin-header';
import { getAllAdminUpdates } from '@/lib/data/events-and-updates';
import { UpdatesManager } from '@/components/admin/updates-manager';

export const dynamic = 'force-dynamic';

export default async function AdminUpdatesPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/updates');
  if (profile.role !== 'admin') redirect('/');

  const updates = await getAllAdminUpdates();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Ecosystem Updates & Announcements"
        description="Publish, manage, and announce platform release notes, multi-provider catalogue additions, and student credit offers."
      />

      <UpdatesManager initialUpdates={updates} />
    </div>
  );
}
