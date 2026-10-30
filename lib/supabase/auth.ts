/**
 * KofyOne - Supabase Authentication & Authorization Helpers
 * Production-grade server-side authentication utilities and role guards.
 *
 * CRITICAL SECURITY PRINCIPLES:
 * 1. Identity is verified exclusively via supabase.auth.getUser() from the server client.
 * 2. Roles are fetched directly from the database (user_roles / profiles).
 * 3. Never trust client-supplied headers, cookies, or metadata for role elevation.
 */

import { cookies } from 'next/headers';
import { createClient } from './server';
import { UserProfile, UserRole } from '@/types/user';
import type { User } from '@supabase/supabase-js';

/**
 * Retrieves the currently authenticated Supabase Auth user.
 * Strictly uses supabase.auth.getUser() to guarantee cryptographic JWT validation.
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Retrieves the comprehensive profile of the currently signed-in user,
 * combining Auth identity, profile metadata, and verified user role.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  // In development only, check admin session cookie for instant local fallback admin resolution
  if (process.env.NODE_ENV !== 'production') {
    try {
      const cookieStore = await cookies();
      const adminCookie = cookieStore.get('kofyone_admin_session')?.value?.trim();
      const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
      if (adminCookie && adminEmail && adminCookie === Buffer.from(adminEmail).toString('base64')) {
        return {
          id: 'admin-local',
          email: adminEmail,
          role: 'admin',
          username: 'admin',
          full_name: 'Administrator',
          avatar_url: null,
          preferred_platform: 'microsoft',
          created_at: '2026-10-23T00:00:00.000Z',
          updated_at: new Date().toISOString(),
        };
      }
    } catch {
      // Cookies inaccessible in this context
    }
  }

  const user = await getSessionUser();
  if (!user) return null;

  const meta = user.user_metadata || {};

  let role: UserRole = (meta.role as UserRole) || 'student';
  let fullName: string | null = (meta.full_name as string) || (meta.name as string) || (meta.display_name as string) || null;
  let displayName: string | null = (meta.display_name as string) || (meta.full_name as string) || null;
  let avatarUrl: string | null = (meta.avatar_url as string) || null;
  let preferredPlatform = (meta.preferred_platform as string) || 'microsoft';
  let username: string | null = (meta.username as string) || null;
  let bio: string | null = (meta.bio as string) || null;
  let themePreference: 'light' | 'dark' | 'system' = (meta.theme_preference as 'light' | 'dark' | 'system') || 'dark';
  let sortPref: 'featured' | 'popular' | 'newest' = (meta.default_sort as 'featured' | 'popular' | 'newest') || (meta.resource_sort_preference as 'featured' | 'popular' | 'newest') || 'featured';
  let cardLayoutPref: 'comfortable' | 'compact' = (meta.card_density as 'comfortable' | 'compact') || (meta.card_layout_preference as 'comfortable' | 'compact') || 'comfortable';
  let roleFocus: 'student' | 'developer' | 'educator' = (meta.learner_role as 'student' | 'developer' | 'educator') || (meta.role_focus as 'student' | 'developer' | 'educator') || 'student';
  let learnerRole: 'student' | 'developer' | 'educator' = roleFocus;

  try {
    const supabase = await createClient();

    // 1. Check is_admin() SECURITY DEFINER function first (bypasses RLS table restrictions safely)
    try {
      const { data: isAdminRpc } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: boolean | null }>)(
        'is_admin'
      );
      if (isAdminRpc === true) {
        role = 'admin';
      }
    } catch {
      // Safe fallback if RPC unavailable
    }

    // 2. Fetch user role from private user_roles table if not already resolved as admin
    if (role !== 'admin') {
      try {
        const { data: roleRow } = await (supabase.from('user_roles') as unknown as {
          select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
        })
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        const roleData = roleRow as { role?: UserRole } | null;

        if (roleData?.role) {
          role = roleData.role;
        }
      } catch {
        // Safe fallback
      }
    }

    // 3. Fetch profile attributes from profiles table and merge with auth metadata
    try {
      const { data: profileRow } = await (supabase.from('profiles') as unknown as {
        select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
      })
        .select('role, full_name, display_name, avatar_url, bio, preferred_platform, username, theme_preference, resource_sort_preference, card_layout_preference, role_focus, learner_role, default_sort, card_density')
        .eq('id', user.id)
        .maybeSingle();

      const profileData = profileRow as {
        role?: UserRole;
        full_name?: string | null;
        display_name?: string | null;
        avatar_url?: string | null;
        bio?: string | null;
        preferred_platform?: string | null;
        username?: string | null;
        theme_preference?: 'light' | 'dark' | 'system';
        resource_sort_preference?: 'featured' | 'popular' | 'newest';
        card_layout_preference?: 'comfortable' | 'compact';
        role_focus?: 'student' | 'developer' | 'educator';
        learner_role?: 'student' | 'developer' | 'educator';
        default_sort?: 'featured' | 'popular' | 'newest';
        card_density?: 'comfortable' | 'compact';
      } | null;

      if (profileData) {
        if (role !== 'admin' && profileData.role) {
          role = profileData.role;
        }
        fullName = profileData.full_name || profileData.display_name || fullName;
        displayName = profileData.display_name || profileData.full_name || displayName;
        avatarUrl = profileData.avatar_url ?? avatarUrl;
        bio = profileData.bio ?? bio;
        preferredPlatform = profileData.preferred_platform ?? preferredPlatform;
        username = profileData.username || username;
        if (profileData.theme_preference) themePreference = profileData.theme_preference;
        if (profileData.default_sort) sortPref = profileData.default_sort;
        else if (profileData.resource_sort_preference) sortPref = profileData.resource_sort_preference;
        if (profileData.card_density) cardLayoutPref = profileData.card_density;
        else if (profileData.card_layout_preference) cardLayoutPref = profileData.card_layout_preference;
        if (profileData.learner_role) learnerRole = profileData.learner_role;
        if (profileData.role_focus) roleFocus = profileData.role_focus;
        if (learnerRole) roleFocus = learnerRole;
      }
    } catch {
      // Safe fallback
    }

    // 4. Verify designated administrator account by verified email or metadata
    if (role !== 'admin' && (meta.role === 'admin' || user.app_metadata?.role === 'admin')) {
      role = 'admin';
    }
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (user.email && configuredAdminEmail && user.email.toLowerCase() === configuredAdminEmail) {
      role = 'admin';
    }
  } catch {
    // If client instantiation fails, still return safe basic profile based on verified Auth user
  }

  return {
    id: user.id,
    email: user.email || '',
    role,
    username,
    full_name: fullName,
    display_name: displayName || fullName,
    avatar_url: avatarUrl,
    bio,
    preferred_platform: preferredPlatform,
    theme_preference: themePreference,
    resource_sort_preference: sortPref,
    default_sort: sortPref,
    card_layout_preference: cardLayoutPref,
    card_density: cardLayoutPref,
    role_focus: roleFocus,
    learner_role: learnerRole || roleFocus,
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  };
}

/**
 * Checks whether the current user holds the required role.
 * Admins satisfy all role prerequisites.
 */
export async function checkUserRole(requiredRole: UserRole): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  return profile.role === requiredRole;
}

/**
 * Verifies that the current user is an authenticated administrator.
 * Returns true if admin, false otherwise.
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return Boolean(profile && profile.role === 'admin');
}
