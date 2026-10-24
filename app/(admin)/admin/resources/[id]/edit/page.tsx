import { redirect, notFound } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getResourceByIdOrSlug, getActiveCategories, getActivePlatforms } from '@/lib/supabase/db';
import { AdminHeader } from '@/components/admin/admin-header';
import { ResourceForm } from '@/components/admin/resource-form';

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/resources');
  if (profile.role !== 'admin') redirect('/');

  const { id } = await params;
  const [resource, { data: categories }, { data: platforms }] = await Promise.all([
    getResourceByIdOrSlug(id),
    getActiveCategories(),
    getActivePlatforms(),
  ]);

  if (!resource) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title={`Edit: ${resource.name}`}
        description="Update resource information, platform attribution, categories, images, or draft status."
      />

      <ResourceForm
        initialResource={resource}
        categories={categories}
        platforms={platforms}
      />
    </div>
  );
}
