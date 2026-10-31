import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getActiveCategories } from '@/lib/supabase/db';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminCategoriesClient } from './admin-categories-client';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/categories');
  if (profile.role !== 'admin') redirect('/');

  const { data: categories } = await getActiveCategories();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Categories & Learning Tracks"
        description="Organize resources into curated discovery tracks and student domains. Add, edit, or remove any category."
      />

      <AdminCategoriesClient initialCategories={categories} />
    </div>
  );
}
