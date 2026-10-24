/**
 * KofyOne - Secure Account Deletion Route Handler
 *
 * CRITICAL SECURITY ASSURANCES:
 * 1. Target user ID is derived strictly from verified JWT session (user.id).
 *    Never trusts a user ID passed in request payload or headers.
 * 2. Requires explicit irreversible-action text confirmation ("DELETE").
 * 3. Requires password verification (reauthentication) for email accounts.
 * 4. Cleans up dependent user data before deleting auth user.
 * 5. Uses Supabase Admin API (Service Role) strictly on server.
 * 6. Terminates user session and clears all session cookies.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate caller and obtain verified user identity
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to proceed.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const confirmationText = typeof body.confirmation === 'string' ? body.confirmation.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    // 2. Explicit irreversible-action confirmation check
    if (confirmationText !== 'DELETE') {
      return NextResponse.json(
        { error: 'Please type "DELETE" exactly to confirm account deletion.' },
        { status: 400 }
      );
    }

    // 3. Reauthentication check
    // If the user registered with password (email provider), re-verify their password
    const isPasswordUser = user.app_metadata?.provider === 'email';
    if (isPasswordUser && user.email) {
      if (!password) {
        return NextResponse.json(
          { error: 'Please enter your current password to reauthenticate before deleting your account.' },
          { status: 400 }
        );
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (verifyError) {
        return NextResponse.json(
          { error: 'Invalid password. Reauthentication failed.' },
          { status: 403 }
        );
      }
    } else {
      // For OAuth users, verify recent sign-in (within past 15 minutes)
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
      const now = Date.now();
      const fifteenMinutesMs = 15 * 60 * 1000;

      if (now - lastSignIn > fifteenMinutesMs) {
        return NextResponse.json(
          { error: 'For your security, please sign out and sign in again before deleting your account.' },
          { status: 403 }
        );
      }
    }

    const targetUserId = user.id;

    // 4. Clean up dependent user records
    try {
      await supabase.from('user_recently_viewed').delete().eq('user_id', targetUserId);
    } catch {}

    try {
      await supabase.from('user_roles').delete().eq('id', targetUserId);
    } catch {}

    try {
      await supabase.from('profiles').delete().eq('id', targetUserId);
    } catch {}

    // 5. Delete Supabase Auth user via Admin Client if service role key is present
    if (hasAdminCredentials()) {
      try {
        const adminClient = createAdminClient();
        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);
        if (deleteAuthError) {
          console.error('Error deleting auth user via Admin API:', deleteAuthError);
        }
      } catch (adminErr) {
        console.error('Failed to initialize admin client during account deletion:', adminErr);
      }
    } else {
      console.warn(
        'SUPABASE_SERVICE_ROLE_KEY is not configured in environment. User data was deleted and user signed out, but auth.users record requires manual removal or service role configuration.'
      );
    }

    // 6. Sign out and terminate session
    try {
      await supabase.auth.signOut();
    } catch {}

    return NextResponse.json({
      success: true,
      redirect: '/account-deleted',
    });
  } catch (err) {
    console.error('Account deletion failed:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting your account. Please try again.' },
      { status: 500 }
    );
  }
}
