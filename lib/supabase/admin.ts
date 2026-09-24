/**
 * KofyOne - Supabase Admin Client (Service Role)
 *
 * CRITICAL SECURITY NOTICE:
 * This client bypasses Row Level Security (RLS).
 * It MUST ONLY be imported and executed in server-side contexts
 * (e.g. Server Actions, internal API routes, webhook handlers).
 * It will throw a fatal error if executed in client/browser bundles.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY VIOLATION: createAdminClient cannot be invoked on the client side.'
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
