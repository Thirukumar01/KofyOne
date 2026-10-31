import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getAllAdminResources, getActivePlatforms, getActiveCategories } from '@/lib/supabase/db';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminResourcesClient } from './admin-resources-client';

export const dynamic = 'force-dynamic';

export default async function AdminResourcesPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/resources');
  if (profile.role !== 'admin') redirect('/');

  const [resources, { data: platforms }, { data: categories }] = await Promise.all([
    getAllAdminResources(),
    getActivePlatforms(),
    getActiveCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Resources Catalog & CMS"
        description="View, search, edit, preview, and manage learning resources across Microsoft, AWS, Google, and other platforms."
      />

      <AdminResourcesClient
        initialResources={resources}
        platforms={platforms}
        categories={categories}
      />
    </div>
  );
}
