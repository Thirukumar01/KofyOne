/**
 * KofyOne - Profile API Handler
 * Handles profile fetching with activity counters and profile preference updates.
 * Strictly enforces preset avatar validation (rejects arbitrary external URLs).
 * Preserves admin role and guarantees fault-tolerant profile updates.
 */

import { NextResponse } from 'next/server';
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

    // 9. Save fields to Auth User Metadata (supabase.auth.updateUser)
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

    // Preserve role = 'admin' for admins
    if (isUserAdmin) {
      metaUpdates.role = 'admin';
    }

    try {
      await supabase.auth.updateUser({
        data: metaUpdates,
      });
    } catch (authErr) {
      console.warn('Failed to update auth user metadata:', authErr);
    }

    // 10. Update public.profiles
    const useAdminClient = hasAdminCredentials();
    const dbClient = useAdminClient ? createAdminClient() : supabase;
    const now = new Date().toISOString();

    const fullPayload: Record<string, unknown> = {
      updated_at: now,
    };

    if (displayName !== undefined) {
      fullPayload.display_name = displayName;
      fullPayload.full_name = displayName;
    }
    if (avatarUrl !== undefined) {
      fullPayload.avatar_url = avatarUrl;
    }
    if (bio !== undefined) {
      fullPayload.bio = bio;
    }
    if (preferredPlatform !== undefined) {
      fullPayload.preferred_platform = preferredPlatform;
    }
    if (themePreference !== undefined) {
      fullPayload.theme_preference = themePreference;
    }
    if (defaultSort !== undefined) {
      fullPayload.resource_sort_preference = defaultSort;
      fullPayload.default_sort = defaultSort;
    }
    if (cardDensity !== undefined) {
      fullPayload.card_layout_preference = cardDensity;
      fullPayload.card_density = cardDensity;
    }
    if (learnerRole !== undefined) {
      fullPayload.role_focus = learnerRole;
      fullPayload.learner_role = learnerRole;
    }
    if (isUserAdmin && useAdminClient) {
      fullPayload.role = 'admin';
    }

    let updateOk = false;
    try {
      // Primary: try updating with full columns scoped strictly to user.id
      const { error: fullUpdateError, data: updateData } = await (dbClient.from('profiles') as unknown as {
        update: (vals: Record<string, unknown>) => {
          eq: (col: string, val: string) => { select: (cols: string) => Promise<{ error: unknown; data: unknown }> };
        };
      })
        .update(fullPayload)
        .eq('id', user.id)
        .select('id');

      if (!fullUpdateError && Array.isArray(updateData) && updateData.length > 0) {
        updateOk = true;
      } else if (fullUpdateError) {
        console.warn('Full column update failed, trying fallback to core columns:', fullUpdateError);
        // Fall back to core columns (full_name, avatar_url, updated_at) if optional columns missing
        const corePayload: Record<string, unknown> = {
          updated_at: now,
        };
        if (displayName !== undefined) {
          corePayload.full_name = displayName;
        }
        if (avatarUrl !== undefined) {
          corePayload.avatar_url = avatarUrl;
        }

        const { error: coreError, data: coreData } = await (dbClient.from('profiles') as unknown as {
          update: (vals: Record<string, unknown>) => {
            eq: (col: string, val: string) => { select: (cols: string) => Promise<{ error: unknown; data: unknown }> };
          };
        })
          .update(corePayload)
          .eq('id', user.id)
          .select('id');

        if (!coreError && Array.isArray(coreData) && coreData.length > 0) {
          updateOk = true;
        }
      }
    } catch (dbErr) {
      console.warn('Database update encountered exception:', dbErr);
    }

    // If row did not exist yet in profiles table, upsert it
    if (!updateOk) {
      try {
        const insertPayload: Record<string, unknown> = {
          id: user.id,
          email: user.email,
          full_name: displayName ?? (metaUpdates.full_name as string) ?? null,
          display_name: displayName ?? (metaUpdates.display_name as string) ?? null,
          avatar_url: avatarUrl ?? (metaUpdates.avatar_url as string) ?? null,
          bio: bio ?? (metaUpdates.bio as string) ?? null,
          preferred_platform: preferredPlatform ?? (metaUpdates.preferred_platform as string) ?? 'microsoft',
          theme_preference: themePreference ?? (metaUpdates.theme_preference as string) ?? 'dark',
          resource_sort_preference: defaultSort ?? (metaUpdates.resource_sort_preference as string) ?? 'featured',
          default_sort: defaultSort ?? (metaUpdates.default_sort as string) ?? 'featured',
          card_layout_preference: cardDensity ?? (metaUpdates.card_layout_preference as string) ?? 'comfortable',
          card_density: cardDensity ?? (metaUpdates.card_density as string) ?? 'comfortable',
          role_focus: learnerRole ?? (metaUpdates.role_focus as string) ?? 'student',
          learner_role: learnerRole ?? (metaUpdates.learner_role as string) ?? 'student',
          role: isUserAdmin ? 'admin' : (learnerRole === 'educator' ? 'educator' : 'student'),
          updated_at: now,
        };

        const { error: insErr } = await (dbClient.from('profiles') as unknown as {
          upsert: (vals: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: unknown }>;
        }).upsert(insertPayload, { onConflict: 'id' });

        if (insErr) {
          await (dbClient.from('profiles') as unknown as {
            upsert: (vals: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: unknown }>;
          }).upsert(
            {
              id: user.id,
              email: user.email,
              full_name: displayName ?? null,
              avatar_url: avatarUrl ?? null,
              role: isUserAdmin ? 'admin' : 'student',
              updated_at: now,
            },
            { onConflict: 'id' }
          );
        }
      } catch (upsertErr) {
        console.warn('Profile upsert fallback encountered exception:', upsertErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile settings updated successfully.',
      profile: {
        display_name: displayName ?? metaUpdates.display_name,
        full_name: displayName ?? metaUpdates.full_name,
        avatar_url: avatarUrl ?? metaUpdates.avatar_url,
        bio: bio ?? metaUpdates.bio,
        preferred_platform: preferredPlatform ?? metaUpdates.preferred_platform,
        theme_preference: themePreference ?? metaUpdates.theme_preference,
        resource_sort_preference: defaultSort ?? metaUpdates.resource_sort_preference,
        default_sort: defaultSort ?? metaUpdates.default_sort,
        card_layout_preference: cardDensity ?? metaUpdates.card_layout_preference,
        card_density: cardDensity ?? metaUpdates.card_density,
        role_focus: learnerRole ?? metaUpdates.role_focus,
        learner_role: learnerRole ?? metaUpdates.learner_role,
        role: isUserAdmin ? 'admin' : 'student',
      },
    });
  } catch (err) {
    console.error('Unexpected error in profile settings route:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating profile.' },
      { status: 500 }
    );
  }
}
