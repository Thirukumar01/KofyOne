import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { AdminHeader } from '@/components/admin/admin-header';
import { getAdminSettings } from '@/lib/data/admin-settings';
import { createClient } from '@/lib/supabase/server';
import { AdminSettingsClient } from './admin-settings-client';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/settings');
  if (profile.role !== 'admin') redirect('/');

  const initialSettings = await getAdminSettings();

  let dbConnected = true;
  let publishedCount = 0;
  let storageBucketActive = true;

  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    if (error) {
      dbConnected = false;
    } else if (count !== null) {
      publishedCount = count;
    }

    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (!bucketError && buckets) {
      storageBucketActive = buckets.some((b) => b.name === 'kofyone-media');
    }
  } catch {
    dbConnected = false;
  }

  const systemHealth = {
    dbConnected,
    publishedCount,
    storageBucketActive,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    nodeEnv: process.env.NODE_ENV || 'development',
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Platform Settings & Attribution"
        description="Configure contributor tracking parameters, catalog discovery defaults, system connectivity, and on-demand cache revalidation."
      />

      <AdminSettingsClient
        initialSettings={initialSettings}
        systemHealth={systemHealth}
      />
    </div>
  );
}
