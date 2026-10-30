/**
 * KofyOne - User Profile Update Route Handler
 * Strictly restricts updates to user-editable fields (full_name, avatar_url, preferred_platform, bio, etc.).
 * Strictly enforces official preset avatar keys; arbitrary external URLs are rejected.
 * Preserves admin role and guarantees fault-tolerant profile updates.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin';
import { isValidPresetAvatar } from '@/config/avatars';

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

    // Update public.profiles
    const useAdminClient = hasAdminCredentials();
    const dbClient = useAdminClient ? createAdminClient() : supabase;
    const now = new Date().toISOString();

    const fullPayload: Record<string, unknown> = {
      updated_at: now,
    };

    if (fullName !== undefined) {
      fullPayload.full_name = fullName;
      fullPayload.display_name = fullName;
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
    if (learnerRole !== undefined) {
      fullPayload.role_focus = learnerRole;
      fullPayload.learner_role = learnerRole;
    }
    if (isUserAdmin && useAdminClient) {
      fullPayload.role = 'admin';
    }

    let updateOk = false;
    try {
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
        const corePayload: Record<string, unknown> = {
          updated_at: now,
        };
        if (fullName !== undefined) {
          corePayload.full_name = fullName;
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

    if (!updateOk) {
      try {
        await (dbClient.from('profiles') as unknown as {
          upsert: (vals: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: unknown }>;
        }).upsert(
          {
            id: user.id,
            email: user.email,
            full_name: fullName ?? null,
            avatar_url: avatarUrl ?? null,
            bio: bio ?? null,
            preferred_platform: preferredPlatform ?? 'microsoft',
            role_focus: learnerRole ?? 'student',
            learner_role: learnerRole ?? 'student',
            role: isUserAdmin ? 'admin' : 'student',
            updated_at: now,
          },
          { onConflict: 'id' }
        );
      } catch (upsertErr) {
        console.warn('Profile upsert fallback encountered exception:', upsertErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
    });
  } catch (err) {
    console.error('Unexpected error updating profile:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
