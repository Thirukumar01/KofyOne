import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getActiveCategories, getActivePlatforms } from '@/lib/supabase/db';
import { AdminHeader } from '@/components/admin/admin-header';
import { ResourceForm } from '@/components/admin/resource-form';

export default async function NewResourcePage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/resources/new');
  if (profile.role !== 'admin') redirect('/');

  const [{ data: categories }, { data: platforms }] = await Promise.all([
    getActiveCategories(),
    getActivePlatforms(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Add New Resource"
        description="Add and publish student technology resources across Microsoft, AWS, Google, and other platforms."
      />

      <ResourceForm categories={categories} platforms={platforms} />
    </div>
  );
}
