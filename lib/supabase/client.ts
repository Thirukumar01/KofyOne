/**
 * KofyOne - Supabase Browser Client
 * For use in React Client Components.
 */

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { clientEnv } from '@/config/env';

export function createClient() {
  if (!clientEnv.supabase.isConfigured) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return createBrowserClient<Database>(
    clientEnv.supabase.url,
    clientEnv.supabase.anonKey
  );
}
