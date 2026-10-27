/**
 * KofyOne - User Profile Update Route Handler
 * Strictly restricts updates to user-editable fields (full_name, avatar_url, preferred_platform, bio, etc.).
 * Strictly enforces official preset avatar keys; arbitrary external URLs are rejected.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    let avatarUrl: string | null = null;
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
    }

    const fullName =
      typeof body.full_name === 'string'
        ? body.full_name.trim().slice(0, 100)
        : typeof body.display_name === 'string'
        ? body.display_name.trim().slice(0, 100)
        : null;

    const preferredPlatform =
      typeof body.preferred_platform === 'string'
        ? body.preferred_platform.trim().slice(0, 50)
        : 'microsoft';

    const bio =
      typeof body.bio === 'string' ? body.bio.trim().slice(0, 300) : null;

    // Strictly limit updated columns - NEVER accept role or email from request!
    const { error: updateError } = await (supabase.from('profiles') as unknown as {
      update: (vals: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    })
      .update({
        full_name: fullName,
        display_name: fullName,
        avatar_url: avatarUrl,
        bio,
        preferred_platform: preferredPlatform,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
    });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
