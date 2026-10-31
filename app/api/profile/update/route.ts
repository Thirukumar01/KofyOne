/**
 * KofyOne - User Profile Update Route Handler
 * Strictly restricts updates to user-editable fields (full_name, avatar_url, preferred_platform, bio, etc.).
 * Directly persists into public.profiles database table via atomic RPC upsert_my_profile.
 * Strictly enforces official preset avatar keys; arbitrary external URLs are rejected.
 * Preserves admin role and synchronizes auth user metadata.
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin';
import { isValidPresetAvatar } from '@/config/avatars';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to update your profile.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // 1. Preset Avatar Validation
    let avatarUrl: string | null | undefined = undefined;
    if (body.avatar_url !== undefined) {
      if (typeof body.avatar_url === 'string' && body.avatar_url.trim().length > 0) {
        const trimmed = body.avatar_url.trim();
        if (!isValidPresetAvatar(trimmed)) {
          return NextResponse.json(
            {
              error:
                'Custom image URLs and file uploads are disabled. Please select one of the 6 official preset avatars.',
            },
            { status: 400 }
          );
        }
        avatarUrl = trimmed;
      } else {
        avatarUrl = null;
      }
    }

    const fullName =
      typeof body.full_name === 'string'
        ? body.full_name.trim().slice(0, 100)
        : typeof body.display_name === 'string'
        ? body.display_name.trim().slice(0, 100)
        : undefined;

    const preferredPlatform =
      typeof body.preferred_platform === 'string' && body.preferred_platform.trim()
        ? body.preferred_platform.trim().slice(0, 50)
        : undefined;

    const bio =
      typeof body.bio === 'string' ? body.bio.trim().slice(0, 300) : undefined;

    const rawRole = body.learner_role || body.role_focus;
    const learnerRole =
      rawRole === 'developer' || rawRole === 'educator' || rawRole === 'student'
        ? rawRole
        : undefined;

    // Admin Verification - Never demote an admin
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
    // Primary Persistence: Write directly to public.profiles via RPC
    // -------------------------------------------------------------------------
    let dbProfile: Record<string, unknown> | null = null;
    let dbErrorMessage: string | null = null;

    try {
      const rpcPayload = {
        p_display_name: fullName ?? null,
        p_avatar_url: avatarUrl ?? null,
        p_bio: bio ?? null,
        p_learner_role: learnerRole ?? null,
        p_preferred_platform: preferredPlatform ?? null,
        p_theme_preference: body.theme_preference ?? null,
        p_default_sort: body.default_sort ?? null,
        p_card_density: body.card_density ?? null,
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
        console.warn('[Profile Update API] upsert_my_profile RPC warning:', rpcError.message);
      }
    } catch (rpcEx) {
      dbErrorMessage = rpcEx instanceof Error ? rpcEx.message : String(rpcEx);
      console.warn('[Profile Update API] RPC exception:', rpcEx);
    }

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

        if (fullName !== undefined) {
          upsertPayload.full_name = fullName;
          upsertPayload.display_name = fullName;
        }
        if (avatarUrl !== undefined) {
          upsertPayload.avatar_url = avatarUrl;
        }
        if (bio !== undefined) {
          upsertPayload.bio = bio;
        }
        if (preferredPlatform !== undefined) {
          upsertPayload.preferred_platform = preferredPlatform;
        }
        if (learnerRole !== undefined) {
          upsertPayload.role_focus = learnerRole;
          upsertPayload.learner_role = learnerRole;
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
        }
      } catch (tableEx) {
        dbErrorMessage = tableEx instanceof Error ? tableEx.message : String(tableEx);
      }
    }

    // Save fields to Auth User Metadata
    const currentMeta = user.user_metadata || {};
    const metaUpdates: Record<string, unknown> = { ...currentMeta };

    if (fullName !== undefined) {
      metaUpdates.full_name = fullName;
      metaUpdates.display_name = fullName;
    }
    if (avatarUrl !== undefined) {
      metaUpdates.avatar_url = avatarUrl;
    }
    if (bio !== undefined) {
      metaUpdates.bio = bio;
    }
    if (preferredPlatform !== undefined) {
      metaUpdates.preferred_platform = preferredPlatform;
    }
    if (learnerRole !== undefined) {
      metaUpdates.learner_role = learnerRole;
      metaUpdates.role_focus = learnerRole;
    }
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

    if (!dbProfile && dbErrorMessage && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return NextResponse.json(
        { error: `Database profile persistence error: ${dbErrorMessage}` },
        { status: 500 }
      );
    }

    try {
      revalidatePath('/settings');
      revalidatePath('/', 'layout');
    } catch {
      // Ignore during test execution
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully in database.',
    });
  } catch (err) {
    console.error('Unexpected error updating profile:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
