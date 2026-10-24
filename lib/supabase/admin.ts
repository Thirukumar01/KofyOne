/**
 * KofyOne - Supabase Admin Client (Service Role / Secret Key)
 *
 * CRITICAL SECURITY NOTICE:
 * This client bypasses Row Level Security (RLS).
 * It MUST ONLY be imported and executed in server-side contexts
 * (e.g. account deletion, privileged background jobs, admin user operations).
 * It will throw a fatal error if executed in client/browser bundles.
 */

import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export function hasAdminCredentials(): boolean {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && serviceKey);
}

export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY VIOLATION: createAdminClient cannot be invoked on the client side.'
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in server environment variables. Required for privileged operations.'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
