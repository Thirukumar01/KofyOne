/**
 * KofyOne - Admin Layout Server-Side Authorization Guard
 *
 * CRITICAL DEFENSE-IN-DEPTH:
 * Ensures all /admin/* routes are strictly protected at the Server Component level.
 * Any unauthenticated user is redirected to /login with next=/admin.
 * Any authenticated non-admin user is redirected to /access-denied.
 */

import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login?next=/admin');
  }

  if (profile.role !== 'admin') {
    redirect('/access-denied');
  }

  return <>{children}</>;
}
