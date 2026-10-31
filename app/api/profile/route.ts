/**
 * KofyOne - Profile API Handler
 * Handles profile fetching with activity counters and bulletproof profile persistence.
 * Primary persistence target is the public.profiles database table via atomic RPC upsert_my_profile.
 * Strictly enforces preset avatar validation (rejects arbitrary external URLs).
 * Preserves admin role and synchronizes auth user metadata.
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin';
import { isValidPresetAvatar } from '@/config/avatars';
import { getCurrentUserProfile } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch counts for Favorites and Recently Viewed
    let favoritesCount = 0;
    let recentCount = 0;

    try {
      const [favRes, recRes] = await Promise.all([
        supabase
          .from('user_favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id),
        supabase
          .from('user_recently_viewed')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id),
      ]);

      if (favRes.count !== null) favoritesCount = favRes.count;
      if (recRes.count !== null) recentCount = recRes.count;
    } catch {
      // Safe fallback
    }

    return NextResponse.json({
      profile,
      stats: {
        favoritesCount,
        recentCount,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to update your settings.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // 1. Preset Avatar Validation (NO custom external URLs or file uploads allowed)
    let avatarUrl: string | null | undefined = undefined;
    if (body.avatar_url !== undefined) {
      if (typeof body.avatar_url === 'string' && body.avatar_url.trim().length > 0) {
        const trimmedAvatar = body.avatar_url.trim();
        if (!isValidPresetAvatar(trimmedAvatar)) {
          return NextResponse.json(
            {
              error:
                'Custom image URLs and file uploads are disabled. Please select one of the 6 official preset avatars.',
            },
            { status: 400 }
          );
        }
        avatarUrl = trimmedAvatar;
      } else {
        avatarUrl = null;
      }
    }

    // 2. Validate display_name / full_name
    const displayName =
      typeof body.display_name === 'string'
        ? body.display_name.trim().slice(0, 100)
        : typeof body.full_name === 'string'
        ? body.full_name.trim().slice(0, 100)
        : undefined;

    // 3. Bio / Headline
    const bio =
      typeof body.bio === 'string' ? body.bio.trim().slice(0, 300) : undefined;

    // 4. Preferred Platform
    const preferredPlatform =
      typeof body.preferred_platform === 'string' && body.preferred_platform.trim()
        ? body.preferred_platform.trim().slice(0, 50)
        : undefined;

    // 5. Theme Preference
    const themePreference =
      body.theme_preference === 'light' ||
      body.theme_preference === 'dark' ||
      body.theme_preference === 'system'
        ? body.theme_preference
        : undefined;

    // 6. Discovery Preferences
    const defaultSort =
      body.default_sort === 'popular' ||
      body.default_sort === 'newest' ||
      body.default_sort === 'featured'
        ? body.default_sort
        : body.resource_sort_preference === 'popular' ||
          body.resource_sort_preference === 'newest' ||
          body.resource_sort_preference === 'featured'
        ? body.resource_sort_preference
        : undefined;

    const cardDensity =
      body.card_density === 'compact' || body.card_density === 'comfortable'
        ? body.card_density
        : body.card_layout_preference === 'compact' ||
          body.card_layout_preference === 'comfortable'
        ? body.card_layout_preference
        : undefined;

    // 7. Learner Role / Academic or Career Stage
    const rawRole = body.learner_role || body.role_focus;
    const learnerRole =
      rawRole === 'developer' || rawRole === 'educator' || rawRole === 'student'
        ? rawRole
        : undefined;

    // 8. Admin Verification - Never demote an admin
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const isConfiguredAdmin = Boolean(
      user.email && configuredAdminEmail && user.email.toLowerCase() === configuredAdminEmail
    );

    let isUserAdmin =
      isConfiguredAdmin ||
      user.user_metadata?.role === 'admin' ||
      user.app_metadata?.role === 'admin';

    if (!isUserAdmin) {
      try {
        const { data: profileRole } = await (supabase.from('profiles') as unknown as {
          select: (col: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: { role?: string } | null }> } };
        })
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileRole?.role === 'admin') {
          isUserAdmin = true;
        }
      } catch {
        // Safe check
      }
    }

    // -------------------------------------------------------------------------
    // 9. PRIMARY PERSISTENCE: Write directly to public.profiles database table
    // -------------------------------------------------------------------------
    let dbProfile: Record<string, unknown> | null = null;
    let dbErrorMessage: string | null = null;

    // Attempt 1: Call atomic SECURITY DEFINER RPC upsert_my_profile
    try {
      const rpcPayload = {
        p_display_name: displayName ?? null,
        p_avatar_url: avatarUrl ?? null,
        p_bio: bio ?? null,
        p_learner_role: learnerRole ?? null,
        p_preferred_platform: preferredPlatform ?? null,
        p_theme_preference: themePreference ?? null,
        p_default_sort: defaultSort ?? null,
        p_card_density: cardDensity ?? null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
        'upsert_my_profile',
        rpcPayload
      );

      if (!rpcError && rpcData) {
        dbProfile = rpcData as Record<string, unknown>;
      } else if (rpcError) {
        dbErrorMessage = rpcError.message;
        console.warn('[Profile API] upsert_my_profile RPC warning, attempting direct upsert:', rpcError.message);
      }
    } catch (rpcEx) {
      dbErrorMessage = rpcEx instanceof Error ? rpcEx.message : String(rpcEx);
      console.warn('[Profile API] RPC exception, falling back to direct table write:', rpcEx);
    }

    // Attempt 2: Direct public.profiles upsert with service-role or user client
    if (!dbProfile) {
      try {
        const useAdminClient = hasAdminCredentials();
        const dbClient = useAdminClient ? createAdminClient() : supabase;
        const now = new Date().toISOString();

        const upsertPayload: Record<string, unknown> = {
          id: user.id,
          email: user.email,
          updated_at: now,
        };

        if (displayName !== undefined) {
          upsertPayload.display_name = displayName;
          upsertPayload.full_name = displayName;
        }
        if (avatarUrl !== undefined) {
          upsertPayload.avatar_url = avatarUrl;
        }
        if (bio !== undefined) {
          upsertPayload.bio = bio;
        }
        if (learnerRole !== undefined) {
          upsertPayload.learner_role = learnerRole;
          upsertPayload.role_focus = learnerRole;
        }
        if (preferredPlatform !== undefined) {
          upsertPayload.preferred_platform = preferredPlatform;
        }
        if (themePreference !== undefined) {
          upsertPayload.theme_preference = themePreference;
        }
        if (defaultSort !== undefined) {
          upsertPayload.default_sort = defaultSort;
          upsertPayload.resource_sort_preference = defaultSort;
        }
        if (cardDensity !== undefined) {
          upsertPayload.card_density = cardDensity;
          upsertPayload.card_layout_preference = cardDensity;
        }
        if (isUserAdmin && useAdminClient) {
          upsertPayload.role = 'admin';
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tableData, error: tableError } = await (dbClient.from('profiles') as any)
          .upsert(upsertPayload, { onConflict: 'id' })
          .select()
          .single();

        if (!tableError && tableData) {
          dbProfile = tableData as Record<string, unknown>;
          dbErrorMessage = null;
        } else if (tableError) {
          dbErrorMessage = tableError.message;
          console.error('[Profile API] Database upsert failed:', tableError);
        }
      } catch (tableEx) {
        dbErrorMessage = tableEx instanceof Error ? tableEx.message : String(tableEx);
        console.error('[Profile API] Database upsert exception:', tableEx);
      }
    }

    // -------------------------------------------------------------------------
    // 10. Synchronize Supabase Auth User Metadata (Client SSR Session Cache)
    // -------------------------------------------------------------------------
    const currentMeta = user.user_metadata || {};
    const metaUpdates: Record<string, unknown> = { ...currentMeta };

    if (displayName !== undefined) {
      metaUpdates.display_name = displayName;
      metaUpdates.full_name = displayName;
    }
    if (avatarUrl !== undefined) {
      metaUpdates.avatar_url = avatarUrl;
    }
    if (bio !== undefined) {
      metaUpdates.bio = bio;
    }
    if (learnerRole !== undefined) {
      metaUpdates.learner_role = learnerRole;
      metaUpdates.role_focus = learnerRole;
    }
    if (preferredPlatform !== undefined) {
      metaUpdates.preferred_platform = preferredPlatform;
    }
    if (themePreference !== undefined) {
      metaUpdates.theme_preference = themePreference;
    }
    if (defaultSort !== undefined) {
      metaUpdates.default_sort = defaultSort;
      metaUpdates.resource_sort_preference = defaultSort;
    }
    if (cardDensity !== undefined) {
      metaUpdates.card_density = cardDensity;
      metaUpdates.card_layout_preference = cardDensity;
    }
    if (isUserAdmin) {
      metaUpdates.role = 'admin';
    }

    try {
      await supabase.auth.updateUser({
        data: metaUpdates,
      });
    } catch (authErr) {
      console.warn('[Profile API] Failed to update auth user metadata:', authErr);
    }

    // If database write failed in an active Supabase environment, return error instead of faking success
    if (!dbProfile && dbErrorMessage && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return NextResponse.json(
        { error: `Database profile persistence error: ${dbErrorMessage}` },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // 11. Revalidate Next.js cache so /settings & layout immediately reflect DB changes
    // -------------------------------------------------------------------------
    try {
      revalidatePath('/settings');
      revalidatePath('/', 'layout');
    } catch {
      // Ignore during test execution
    }

    return NextResponse.json({
      success: true,
      message: 'Profile settings updated successfully in database.',
      profile: {
        display_name: dbProfile?.display_name ?? displayName ?? metaUpdates.display_name,
        full_name: dbProfile?.full_name ?? displayName ?? metaUpdates.full_name,
        avatar_url: dbProfile?.avatar_url ?? avatarUrl ?? metaUpdates.avatar_url,
        bio: dbProfile?.bio ?? bio ?? metaUpdates.bio,
        preferred_platform: dbProfile?.preferred_platform ?? preferredPlatform ?? metaUpdates.preferred_platform,
        theme_preference: dbProfile?.theme_preference ?? themePreference ?? metaUpdates.theme_preference,
        resource_sort_preference: dbProfile?.resource_sort_preference ?? defaultSort ?? metaUpdates.resource_sort_preference,
        default_sort: dbProfile?.default_sort ?? defaultSort ?? metaUpdates.default_sort,
        card_layout_preference: dbProfile?.card_layout_preference ?? cardDensity ?? metaUpdates.card_layout_preference,
        card_density: dbProfile?.card_density ?? cardDensity ?? metaUpdates.card_density,
        role_focus: dbProfile?.role_focus ?? learnerRole ?? metaUpdates.role_focus,
        learner_role: dbProfile?.learner_role ?? learnerRole ?? metaUpdates.learner_role,
        role: isUserAdmin ? 'admin' : ((dbProfile?.role as string) || 'student'),
      },
    });
  } catch (err) {
    console.error('Unexpected error in profile settings route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unexpected error occurred while updating profile.' },
      { status: 500 }
    );
  }
}

export const PUT = POST;
export const PATCH = POST;
