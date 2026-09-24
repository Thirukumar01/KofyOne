/**
 * KofyOne - Supabase Authentication Helpers
 * Server-side authentication utilities and role guards.
 */

import { createClient } from './server';
import { UserProfile, UserRole } from '@/types/user';

/**
 * Retrieves the current authenticated user session from Supabase Auth.
 */
export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Retrieves the profile of the currently signed-in user.
 * (Placeholder for Phase 2 user profile table linkage).
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getSessionUser();
  if (!user) return null;

  // Derive initial user profile from Supabase auth user object
  const role = (user.app_metadata?.role as UserRole) || 'student';

  return {
    id: user.id,
    email: user.email || '',
    role,
    full_name: (user.user_metadata?.full_name as string) || null,
    avatar_url: (user.user_metadata?.avatar_url as string) || null,
    preferred_platform: (user.user_metadata?.preferred_platform as string) || 'microsoft',
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  };
}

/**
 * Checks whether the current user holds the required role.
 */
export async function checkUserRole(requiredRole: UserRole): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  if (profile.role === 'admin') return true; // Admins satisfy all role checks
  return profile.role === requiredRole;
}
