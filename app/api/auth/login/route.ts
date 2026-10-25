/**
 * KofyOne - Secure Authentication Login Route Handler
 *
 * Supports sign-in with either:
 * - Email address + password
 * - Username + password
 *
 * Preserves admin authentication, session cookie establishment,
 * and role-based redirect destinations.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDynamicClient } from '@/lib/supabase/rpc-helper';
import { getSafeRedirectUrl } from '@/lib/auth/redirect';
import { verifyTurnstileToken } from '@/lib/auth/turnstile';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier =
      typeof body.identifier === 'string'
        ? body.identifier.trim()
        : typeof body.email === 'string'
        ? body.email.trim()
        : typeof body.username === 'string'
        ? body.username.trim()
        : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const nextParam = typeof body.next === 'string' ? body.next : null;
    const turnstileToken =
      typeof body.turnstile_token === 'string'
        ? body.turnstile_token
        : typeof body.turnstileToken === 'string'
        ? body.turnstileToken
        : '';

    // Enforce Turnstile Human Verification Gate before processing credentials
    const remoteIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null;

    const turnstileVerification = await verifyTurnstileToken(turnstileToken, remoteIp, 'login');
    if (!turnstileVerification.success) {
      return NextResponse.json(
        { error: turnstileVerification.error || 'Human verification failed.' },
        { status: turnstileVerification.errorCode === 'missing-server-secret' ? 500 : 403 }
      );
    }

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { error: 'Email or username and password are required.' },
        { status: 400 }
      );
    }

    const dynamicClient = await getDynamicClient();
    let loginEmail = rawIdentifier.toLowerCase();

    // If identifier is not an email, resolve username to registered email
    if (!rawIdentifier.includes('@')) {
      // 1. Try RPC resolver first
      const { data: resolvedEmail, error: rpcError } = await dynamicClient.rpc(
        'get_email_by_identifier',
        { p_identifier: rawIdentifier.toLowerCase() }
      );

      if (!rpcError && resolvedEmail && typeof resolvedEmail === 'string') {
        loginEmail = resolvedEmail.toLowerCase();
      } else {
        // 2. Direct profiles lookup fallback
        const { data: profile } = await dynamicClient
          .from('profiles')
          .select('email')
          .ilike('username', rawIdentifier.toLowerCase())
          .maybeSingle();

        const profileData = profile as { email?: string | null } | null;
        if (profileData?.email) {
          loginEmail = profileData.email.toLowerCase();
        } else if (rawIdentifier.toLowerCase() === 'admin' && (process.env.ADMIN_EMAIL || '').trim()) {
          loginEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
        } else {
          loginEmail = `${rawIdentifier.toLowerCase()}@myapp.local`;
        }
      }
    }

    // Check if credentials match the configured admin in .env.local
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const configuredAdminPassword = (process.env.ADMIN_PASSWORD || '').trim();
    const isConfiguredAdmin =
      Boolean(configuredAdminEmail) &&
      Boolean(configuredAdminPassword) &&
      loginEmail === configuredAdminEmail &&
      password === configuredAdminPassword;

    let authUser: { id: string } | null = null;
    let authError: Error | { message?: string } | null = null;

    try {
      // Authenticate with Supabase Auth
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error || !data.user) {
        authError = error || new Error('Authentication failed');
      } else {
        authUser = data.user;
      }
    } catch (err: unknown) {
      authError = err instanceof Error ? err : new Error(String(err));
    }

    // If Supabase authentication succeeded
    if (authUser) {
      let role = 'student';
      try {
        const { data: roleRow } = await dynamicClient
          .from('user_roles')
          .select('role')
          .eq('id', authUser.id)
          .maybeSingle();

        const typedRole = (roleRow as { role?: string } | null)?.role;

        if (typedRole) {
          role = typedRole;
        } else {
          const { data: profileRow } = await dynamicClient
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .maybeSingle();
          const profileRole = (profileRow as { role?: string } | null)?.role;
          if (profileRole) {
            role = profileRole;
          }
        }
      } catch (roleErr) {
        console.warn('[Login Handler] Role query warning:', roleErr);
      }

      if (configuredAdminEmail && loginEmail === configuredAdminEmail) {
        role = 'admin';
      }

      const defaultDestination = role === 'admin' ? '/admin' : '/dashboard';
      const redirectUrl = getSafeRedirectUrl(nextParam, defaultDestination);

      const response = NextResponse.json({
        success: true,
        role,
        redirectTo: redirectUrl,
      });

      if (role === 'admin' && configuredAdminEmail && loginEmail === configuredAdminEmail) {
        const token = Buffer.from(configuredAdminEmail).toString('base64');
        response.cookies.set('kofyone_admin_session', token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        });
      }

      return response;
    }

    // If Supabase authentication failed or was unreachable:
    // If the credentials match the configured administrator from .env.local, grant admin access
    if (isConfiguredAdmin) {
      const redirectUrl = getSafeRedirectUrl(nextParam, '/admin');
      const response = NextResponse.json({
        success: true,
        role: 'admin',
        redirectTo: redirectUrl,
      });

      const token = Buffer.from(configuredAdminEmail).toString('base64');
      response.cookies.set('kofyone_admin_session', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    const errorMessage = authError && 'message' in authError ? authError.message || '' : '';
    const isEmailNotConfirmed = /email not confirmed/i.test(errorMessage);
    if (isEmailNotConfirmed) {
      return NextResponse.json(
        {
          error:
            'Your email address has not been confirmed yet. Please check your inbox for the verification email.',
        },
        { status: 403 }
      );
    }

    const isFetchFailed = /fetch failed/i.test(errorMessage);
    if (isFetchFailed) {
      return NextResponse.json(
        {
          error:
            'The database service is unreachable or paused. Please sign in with your administrator credentials or unpause your project in the Supabase Dashboard.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid email or password. Please verify and try again.' },
      { status: 401 }
    );
  } catch (err) {
    console.error('[Login Handler Exception]:', err);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
