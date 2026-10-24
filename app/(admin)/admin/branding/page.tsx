import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getSiteBranding } from '@/lib/data/site-branding';
import { AdminHeader } from '@/components/admin/admin-header';
import { BrandingForm } from './branding-form';

export default async function AdminBrandingPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/branding');
  if (profile.role !== 'admin') redirect('/');

  const branding = await getSiteBranding();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Branding & Site Identity"
        description="Upload and customize the KofyOne logo, app icons, and platform branding across desktop, mobile, and browser contexts."
      />

      <BrandingForm initialBranding={branding} />
    </div>
  );
}
