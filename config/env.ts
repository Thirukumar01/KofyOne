/**
 * KofyOne - Centralized Environment Configuration
 * Safe, typed environment access layer.
 *
 * Enforces strict separation:
 * - clientEnv: Safe for browser and server consumption
 * - getServerEnv(): Throws if accessed on client; strictly server-only
 */

export const clientEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  appEnv: (process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production'
    | 'test',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Supabase Client Settings
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    isConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  },

  // PostHog Analytics Client Settings (Optional)
  analytics: {
    posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    isConfigured: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
  },

  // Cloudflare R2 Media CDN (Optional)
  storage: {
    publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://media.kofyone.com',
  },
} as const;

export interface ServerEnv {
  supabaseServiceRoleKey: string;
  cloudflareAccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2BucketName: string;
}

/**
 * Access sensitive server-side credentials with strict browser-execution guards.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY CRITICAL: Attempted to access server environment variables on the client.'
    );
  }

  return {
    supabaseServiceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      '',
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2BucketName: process.env.R2_BUCKET_NAME || 'kofyone-media',
  };
}
