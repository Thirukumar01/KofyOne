/**
 * KofyOne - Supabase SSR PKCE & OAuth Callback Route Handler
 *
 * Handles:
 * 1. OAuth code exchange (Google, Microsoft Entra ID).
 * 2. Magic Link & OTP code verification.
 * 3. Password recovery redirects (/reset-password).
 * 4. OAuth cancellation and provider errors without leaking sensitive stack traces.
 * 5. Safe destination redirection via allowlist.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirectUrl } from '@/lib/auth/redirect';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const nextParam = url.searchParams.get('next');

  // Handle OAuth provider cancellation or error parameters
  const errorParam = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (errorParam) {
    const isCancelled =
      errorParam === 'access_denied' ||
      /cancel/i.test(errorDescription || '');
    const userMessage = isCancelled
      ? 'Sign-in was cancelled. Please try again when ready.'
      : 'Authentication failed. Please verify your credentials or try a different method.';

    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(userMessage)}`, request.url)
    );
  }

  // Determine default destination
  const isRecovery = type === 'recovery';
  const defaultDestination = isRecovery ? '/reset-password' : '/dashboard';
  const destination = getSafeRedirectUrl(nextParam, defaultDestination);

  // 1. PKCE Authorization Code Exchange (OAuth / Email OTP with PKCE)
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent('The authentication link has expired or has already been used. Please request a new one.')}`,
            request.url
          )
        );
      }

      // If this exchange was for a password recovery, route directly to reset password page
      if (isRecovery) {
        return NextResponse.redirect(new URL('/reset-password', request.url));
      }

      return NextResponse.redirect(new URL(destination, request.url));
    } catch {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent('Failed to complete authentication. Please try again.')}`,
          request.url
        )
      );
    }
  }

  // 2. Token Hash verification (Email confirmation links)
  if (token_hash && type) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash, type });

      if (error) {
        return NextResponse.redirect(
          new URL(
            `/login?error=${encodeURIComponent('Verification link expired or invalid. Please request a new verification link.')}`,
            request.url
          )
        );
      }

      if (isRecovery) {
        return NextResponse.redirect(new URL('/reset-password', request.url));
      }

      return NextResponse.redirect(new URL(destination, request.url));
    } catch {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent('An unexpected error occurred during verification.')}`,
          request.url
        )
      );
    }
  }

  // Fallback if neither code nor token_hash is present
  return NextResponse.redirect(new URL(destination, request.url));
}
