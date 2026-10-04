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
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return null;
  }
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

  let role: UserRole = 'student';
  let fullName: string | null = null;
  let avatarUrl: string | null = null;
  let preferredPlatform = 'microsoft';
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('profiles').select('role, full_name, avatar_url, preferred_platform').eq('id', user.id).maybeSingle();
    const profileData = data as unknown as {
      role: UserRole;
      full_name: string | null;
      avatar_url: string | null;
      preferred_platform: string | null;
    } | null;
    role = profileData?.role ?? role;
    fullName = profileData?.full_name ?? fullName;
    avatarUrl = profileData?.avatar_url ?? avatarUrl;
    preferredPlatform = profileData?.preferred_platform ?? preferredPlatform;
  } catch {
    return null;
  }

  return {
    id: user.id,
    email: user.email || '',
    role,
    full_name: fullName,
    avatar_url: avatarUrl,
    preferred_platform: preferredPlatform,
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
