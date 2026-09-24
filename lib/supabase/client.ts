/**
 * KofyOne - Supabase Browser Client
 * For use in React Client Components.
 */

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // In build or preview environments without Supabase configured, return null-safe dummy or warn
    if (process.env.NODE_ENV === 'development') {
      console.warn('Supabase URL or Anon Key is missing in environment variables.');
    }
  }

  return createBrowserClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key'
  );
}
