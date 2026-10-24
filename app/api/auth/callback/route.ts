import { NextResponse } from 'next/server';

/**
 * KofyOne - OAuth & API Auth Callback Bridge
 *
 * Resolves 404 errors when third-party OAuth providers, developer consoles,
 * or NextAuth-style redirect configurations send callbacks to /api/auth/callback
 * rather than /auth/callback.
 *
 * Seamlessly forwards code, token_hash, type, error, and next parameters to
 * the primary SSR PKCE handler at /auth/callback.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL('/auth/callback', url.origin);
  url.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  return NextResponse.redirect(target, 307);
}
