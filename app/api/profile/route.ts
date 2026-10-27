/**
 * KofyOne - Profile API Handler
 * Handles profile fetching with activity counters and profile preference updates.
 * Strictly enforces preset avatar validation (rejects arbitrary external URLs).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    let avatarUrl: string | null = null;
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
    }

    // 2. Validate display_name / full_name
    const displayName =
      typeof body.display_name === 'string'
        ? body.display_name.trim().slice(0, 100)
        : typeof body.full_name === 'string'
        ? body.full_name.trim().slice(0, 100)
        : null;

    // 3. Bio / Headline
    const bio =
      typeof body.bio === 'string' ? body.bio.trim().slice(0, 300) : null;

    // 4. Preferred Platform
    const preferredPlatform =
      typeof body.preferred_platform === 'string'
        ? body.preferred_platform.trim().slice(0, 50)
        : 'microsoft';

    // 5. Theme Preference
    const themePreference =
      body.theme_preference === 'light' ||
      body.theme_preference === 'dark' ||
      body.theme_preference === 'system'
        ? body.theme_preference
        : 'dark';

    // 6. Discovery Preferences
    const resourceSortPreference =
      body.resource_sort_preference === 'popular' ||
      body.resource_sort_preference === 'newest' ||
      body.resource_sort_preference === 'featured'
        ? body.resource_sort_preference
        : 'featured';

    const cardLayoutPreference =
      body.card_layout_preference === 'compact' ? 'compact' : 'comfortable';

    const roleFocus =
      body.role_focus === 'developer' || body.role_focus === 'educator'
        ? body.role_focus
        : 'student';

    // Strictly limit updated columns - NEVER accept role or email from request!
    const { error: updateError } = await (supabase.from('profiles') as unknown as {
      update: (vals: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    })
      .update({
        full_name: displayName,
        display_name: displayName,
        avatar_url: avatarUrl,
        bio,
        preferred_platform: preferredPlatform,
        theme_preference: themePreference,
        resource_sort_preference: resourceSortPreference,
        card_layout_preference: cardLayoutPreference,
        role_focus: roleFocus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile settings. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile settings updated successfully.',
      profile: {
        display_name: displayName,
        avatar_url: avatarUrl,
        bio,
        preferred_platform: preferredPlatform,
        theme_preference: themePreference,
        resource_sort_preference: resourceSortPreference,
        card_layout_preference: cardLayoutPreference,
        role_focus: roleFocus,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating profile.' },
      { status: 500 }
    );
  }
}
