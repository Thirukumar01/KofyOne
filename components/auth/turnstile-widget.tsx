'use client';

/**
 * KofyOne - Cloudflare Turnstile Human Verification Component
 *
 * Implements Managed Mode verification with:
 * - Responsive mobile, tablet, and desktop sizing.
 * - Explicit loading, verified, expired, and error states.
 * - Interactive retry and challenge refresh capabilities.
 * - Safe development configuration notice when keys are absent.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ShieldCheck, AlertCircle, RefreshCw, Loader2, Info } from 'lucide-react';

export interface TurnstileWidgetRef {
  reset: () => void;
  getResponse: () => string | undefined;
}

export interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
  onReset?: () => void;
  action?: 'login' | 'signup' | 'otp';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

type WidgetStatus = 'unconfigured' | 'loading' | 'ready' | 'verified' | 'expired' | 'error';

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  function TurnstileWidget(
    { onVerify, onExpire, onError, onReset, action = 'login', theme = 'auto', className = '' },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const renderWidgetRef = useRef<(() => void) | null>(null);
    const [status, setStatus] = useState<WidgetStatus>('loading');
    const [statusMessage, setStatusMessage] = useState<string>('');

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

    // Reset helper: completely tear down existing widget and recreate if errored
    const handleReset = useCallback(() => {
      if (typeof window !== 'undefined' && window.turnstile) {
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Safe ignore
          }
          widgetIdRef.current = null;
        }
        setStatus('loading');
        setStatusMessage('');
        onReset?.();
        // Give the DOM a tick to clear before rendering fresh challenge
        setTimeout(() => {
          renderWidgetRef.current?.();
        }, 50);
      }
    }, [onReset]);

    // Expose imperative API for parent form
    useImperativeHandle(
      ref,
      () => ({
        reset: handleReset,
        getResponse: () => {
          if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current) {
            return window.turnstile.getResponse(widgetIdRef.current);
          }
          return undefined;
        },
      }),
      [handleReset]
    );

    useEffect(() => {
      // 1. Check for missing configuration
      if (!siteKey) {
        setStatus('unconfigured');
        return;
      }

      let isMounted = true;
      setStatus('loading');

      // Helper to render the Turnstile widget
      const renderWidget = () => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;

        // Clean up previous widget instance if container already rendered
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Safe ignore
          }
          widgetIdRef.current = null;
        }

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action,
            theme,
            size: 'normal',
            retry: 'auto',
            callback: (token: string) => {
              if (!isMounted) return;
              setStatus('verified');
              setStatusMessage('Human verification confirmed.');
              onVerify(token);
            },
            'error-callback': (errorCode?: string) => {
              if (!isMounted) return;
              setStatus('error');
              let message = 'Verification could not be completed. Please click Retry.';
              if (errorCode === '110200') {
                message = 'Domain not authorized (110200). Ensure this domain is registered in Cloudflare Turnstile dashboard.';
              } else if (errorCode?.startsWith('300') || errorCode?.startsWith('600') || errorCode === 'crashed') {
                message = 'Unable to connect to verification website. If using an AdBlocker, VPN, or Private DNS, please disable it and click Retry.';
              } else if (errorCode) {
                message = `Verification error (${errorCode}). If using an AdBlocker or Private DNS, please disable it and click Retry.`;
              }
              setStatusMessage(message);
              onError?.(errorCode);
            },
            'expired-callback': () => {
              if (!isMounted) return;
              setStatus('expired');
              setStatusMessage('Verification session expired. Please refresh the challenge.');
              onExpire?.();
            },
          });

          widgetIdRef.current = id;
          if (isMounted) {
            setStatus((current) => (current === 'loading' ? 'ready' : current));
          }
        } catch (renderError) {
          console.warn('[Turnstile] Render error:', renderError);
          if (isMounted) {
            setStatus('error');
            setStatusMessage('Failed to initialize verification challenge. Please click Retry.');
          }
        }
      };

      renderWidgetRef.current = renderWidget;

      // 2. Load Cloudflare Turnstile script if not present
      const scriptId = 'cf-turnstile-script';
      let scriptElement = document.getElementById(scriptId) as HTMLScriptElement | null;

      if (window.turnstile) {
        renderWidget();
      } else if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = scriptId;
        scriptElement.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        scriptElement.async = true;
        scriptElement.defer = true;
        scriptElement.onload = () => {
          renderWidget();
        };
        scriptElement.onerror = () => {
          if (isMounted) {
            setStatus('error');
            setStatusMessage('Unable to load security verification script. Check your internet connection.');
          }
        };
        document.head.appendChild(scriptElement);
      } else {
        // Script is already in DOM; poll briefly for window.turnstile availability
        const pollInterval = window.setInterval(() => {
          if (window.turnstile) {
            window.clearInterval(pollInterval);
            renderWidget();
          }
        }, 100);

        const timeoutId = window.setTimeout(() => {
          window.clearInterval(pollInterval);
          if (isMounted && !window.turnstile) {
            setStatus('error');
            setStatusMessage('Security verification script timed out.');
          }
        }, 8000);

        return () => {
          window.clearInterval(pollInterval);
          window.clearTimeout(timeoutId);
        };
      }

      return () => {
        isMounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore removal errors on unmount
          }
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, action, theme, onVerify, onError, onExpire]);

    // Unconfigured Development Alert View
    if (status === 'unconfigured') {
      return (
        <div
          className={`rounded-xl border border-amber-300/80 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200 ${className}`}
        >
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950 dark:text-amber-100">
                Cloudflare Turnstile Verification Notice
              </p>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                Human verification is currently unconfigured. To enable Cloudflare bot protection, configure{' '}
                <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">
                  NEXT_PUBLIC_TURNSTILE_SITE_KEY
                </code>{' '}
                and{' '}
                <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">
                  TURNSTILE_SECRET_KEY
                </code>{' '}
                in your environment.
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                Testing key: <code className="font-mono">1x00000000000000000000AA</code> (Always passes)
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`space-y-2 ${className}`}>
        {/* Turnstile Container (responsive mobile & desktop) */}
        <div className="min-h-[66px] w-full flex items-center justify-center overflow-hidden rounded-lg bg-zinc-50/50 py-1 transition-all dark:bg-zinc-900/40">
          <div ref={containerRef} className="w-full max-w-full flex justify-center" />
        </div>

        {/* Loading State Feedback */}
        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
            <span>Verifying browser security environment…</span>
          </div>
        )}

        {/* Success / Verified State Feedback */}
        {status === 'verified' && (
          <div className="flex items-center justify-center gap-1.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Human verification confirmed</span>
          </div>
        )}

        {/* Expired State Feedback with Refresh Action */}
        {status === 'expired' && (
          <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Verification expired</span>
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 font-semibold text-amber-900 hover:underline dark:text-amber-100"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        )}

        {/* Error State Feedback with Retry Action */}
        {status === 'error' && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-start gap-1.5 leading-relaxed">
                <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                <span>{statusMessage || 'Verification failed'}</span>
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 font-semibold text-red-900 hover:underline dark:text-red-100 shrink-0 mt-0.5"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
