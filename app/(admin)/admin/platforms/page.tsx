import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getActivePlatforms } from '@/lib/supabase/db';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminPlatformsClient } from './admin-platforms-client';

export const dynamic = 'force-dynamic';

export default async function AdminPlatformsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/platforms');
  if (profile.role !== 'admin') redirect('/');

  const { data: platforms } = await getActivePlatforms();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Platforms & Ecosystems"
        description="Official partner platforms, verified domains, and ecosystem configurations. Add, edit, or remove any platform."
      />

      <AdminPlatformsClient initialPlatforms={platforms} />
    </div>
  );
}
