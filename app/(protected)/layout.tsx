/**
 * KofyOne - Authenticated Route Group Layout Guard
 * Strictly verifies identity via getSessionUser() for all routes in this group.
 */

import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/auth';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  return <>{children}</>;
}
