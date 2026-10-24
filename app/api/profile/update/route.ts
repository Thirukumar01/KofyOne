/**
 * KofyOne - User Profile Update Route Handler
 * Strictly restricts updates to user-editable fields (full_name, avatar_url, preferred_platform).
 * Prevents self-promotion or email tampering.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 100) : null;
    const avatarUrl = typeof body.avatar_url === 'string' && body.avatar_url.trim().startsWith('http')
      ? body.avatar_url.trim().slice(0, 500)
      : null;
    const preferredPlatform = typeof body.preferred_platform === 'string'
      ? body.preferred_platform.trim().slice(0, 50)
      : 'microsoft';

    // Strictly limit updated columns - NEVER accept role or email from request!
    const { error: updateError } = await (supabase.from('profiles') as unknown as {
      update: (vals: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
    })
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
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
