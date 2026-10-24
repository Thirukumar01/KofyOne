/**
 * KofyOne - OAuth Authentication Buttons
 * Supports Google and Microsoft Entra ID (provider: 'azure')
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { getSafeRedirectUrl } from '@/lib/auth/redirect';

export function OAuthButtons({
  disabled = false,
  onError,
}: {
  disabled?: boolean;
  onError?: (message: string) => void;
}) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'azure' | null>(null);
  const [localError, setLocalError] = useState<string>('');
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const safeNext = getSafeRedirectUrl(nextParam, '/dashboard');

  async function handleOAuth(provider: 'google' | 'azure') {
    if (loadingProvider || disabled) return;
    setLoadingProvider(provider);
    setLocalError('');

    try {
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes: provider === 'azure' ? 'email profile openid' : undefined,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('OAuth initiation failed:', err);
      const rawMsg = err instanceof Error ? err.message : 'Unable to connect to authentication provider.';
      let userFriendlyMsg = rawMsg;
      if (/not enabled/i.test(rawMsg)) {
        userFriendlyMsg = `${provider === 'google' ? 'Google' : 'Microsoft'} sign-in is not yet enabled in the Supabase Authentication dashboard.`;
      } else if (/fetch failed|network|dns/i.test(rawMsg)) {
        userFriendlyMsg = 'Unable to reach the authentication service. Please check your internet connection or verify the project status.';
      }
      setLocalError(userFriendlyMsg);
      onError?.(userFriendlyMsg);
      setLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-2.5">
      {localError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {localError}
        </div>
      )}
      {/* Microsoft Entra ID / Microsoft Account */}
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleOAuth('azure')}
        disabled={disabled || Boolean(loadingProvider)}
        className="w-full relative flex items-center justify-center gap-3 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors py-5"
        aria-label="Sign in with Microsoft"
      >
        <svg className="h-4 w-4" viewBox="0 0 21 21" fill="none">
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          {loadingProvider === 'azure' ? 'Connecting to Microsoft…' : 'Continue with Microsoft'}
        </span>
      </Button>

      {/* Google Sign-in */}
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleOAuth('google')}
        disabled={disabled || Boolean(loadingProvider)}
        className="w-full relative flex items-center justify-center gap-3 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors py-5"
        aria-label="Sign in with Google"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          {loadingProvider === 'google' ? 'Connecting to Google…' : 'Continue with Google'}
        </span>
      </Button>
    </div>
  );
}
