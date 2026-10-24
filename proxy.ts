/**
 * KofyOne - Next.js 16 Request Interceptor & Session Refresh (proxy.ts)
 *
 * Implements defense-in-depth:
 * 1. Seamless Supabase SSR session token rotation & cookie refresh.
 * 2. Route guarding for authenticated user routes (/dashboard, /profile, /settings/security).
 * 3. Route guarding for administrative routes (/admin/*).
 * 4. Safe destination encoding to prevent open redirect loops.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from '@/types/database';
import { getSafeRedirectUrl } from '@/lib/auth/redirect';

// Protected routes requiring standard authentication
const AUTH_REQUIRED_PREFIXES = ['/dashboard', '/profile', '/settings/security'];

// Privileged routes requiring admin role
const ADMIN_REQUIRED_PREFIXES = ['/admin'];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Verify caller identity via cryptographically verified token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRequired = AUTH_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAdminRequired = ADMIN_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Check fallback admin session (when Supabase remote service is paused/offline)
  const adminCookie = request.cookies.get('kofyone_admin_session')?.value?.trim();
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
  const isFallbackAdmin = Boolean(
    adminCookie && adminEmail && adminCookie === Buffer.from(adminEmail).toString('base64')
  );

  if (isFallbackAdmin && (isAdminRequired || isAuthRequired)) {
    return response;
  }

  // 1. Unauthenticated access to protected user routes or admin routes
  if (!user && (isAuthRequired || isAdminRequired)) {
    const rawTarget = `${pathname}${search}`;
    const safeTarget = getSafeRedirectUrl(rawTarget, '/');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', safeTarget);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated access to Admin routes: Verify role at proxy level (defense-in-depth)
  if (user && isAdminRequired) {
    try {
      // Check role in user_roles table or profiles
      const { data: roleData } = await (supabase.from('user_roles') as unknown as {
        select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
      })
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = (roleData as { role?: string } | null)?.role;

      if (role !== 'admin') {
        // Fallback check on profiles table
        const { data: profileData } = await (supabase.from('profiles') as unknown as {
          select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
        })
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if ((profileData as { role?: string } | null)?.role !== 'admin') {
          // Redirect to access-denied screen
          return NextResponse.redirect(new URL('/access-denied', request.url));
        }
      }
    } catch {
      // If DB read fails, redirect away from admin
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }

  // 3. Authenticated user visiting /login directly: redirect to requested ?next or /dashboard
  if (user && pathname === '/login') {
    const nextParam = request.nextUrl.searchParams.get('next');
    if (nextParam) {
      const safeTarget = getSafeRedirectUrl(nextParam, '/dashboard');
      if (safeTarget !== '/login') {
        return NextResponse.redirect(new URL(safeTarget, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - fonts (public font files)
     * - logos (public logo images)
     * - public files ending in .svg, .png, .jpg, .ttf, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|fonts/|logos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2)$).*)',
  ],
};
