'use client';

/**
 * KofyOne - Streamlined Username & Password / PIN Authentication
 *
 * Implements:
 * - Simple Username and Password/PIN credentials flow (zero email required from user).
 * - Internal dummy email formatting (`${username.toLowerCase().trim()}@myapp.local`).
 * - Single unified "Enter App" button:
 *     1. Attempts `signInWithPassword` first.
 *     2. On invalid credentials, checks for new user via 1-click Sign Up / auto-register.
 *     3. Immediately logs user in without waiting for email confirmation.
 * - Persistent sessions: automatically preserves and resumes existing sessions.
 */

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TurnstileWidget, type TurnstileWidgetRef } from '@/components/auth/turnstile-widget';

type AuthMode = 'signin' | 'signup';
type AuthStatus = 'idle' | 'loading' | 'error' | 'success';

/**
 * Converts a username into internal dummy email format.
 * If an email was already entered (e.g. admin email), keeps it as is.
 */
function toDummyEmail(username: string): string {
  const clean = username.toLowerCase().trim();
  if (clean.includes('@')) {
    return clean;
  }
  return `${clean}@myapp.local`;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const nextTarget = searchParams.get('next') || '/dashboard';
  const inFlight = useRef(false);

  const [mode, setMode] = useState<AuthMode>('signin');
  const [status, setStatus] = useState<AuthStatus>(errorParam ? 'error' : 'idle');
  const [message, setMessage] = useState<string>(
    errorParam ? decodeURIComponent(errorParam) : ''
  );
  const [suggestSignUp, setSuggestSignUp] = useState(false);

  // Form Fields: Username and Password/PIN
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Cloudflare Turnstile Human Verification (if enabled in env)
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  // Check for existing persistent session on mount
  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!error && session) {
          setStatus('success');
          setMessage('Welcome back! Resuming your session...');
          window.location.assign(nextTarget);
        }
      });
    } catch {
      // Ignore if client is initializing
    }
  }, [nextTarget]);

  // Unified "Enter App" Submit Handler
  async function handleEnterApp(e?: FormEvent, targetMode?: AuthMode) {
    if (e) e.preventDefault();
    if (inFlight.current || status === 'loading') return;

    const cleanUsername = username.trim().toLowerCase();
    const rawPassword = password;
    const currentMode = targetMode || mode;

    if (!cleanUsername) {
      setStatus('error');
      setMessage('Please enter your username.');
      return;
    }

    if (cleanUsername.length < 2) {
      setStatus('error');
      setMessage('Username must be at least 2 characters.');
      return;
    }

    if (!rawPassword) {
      setStatus('error');
      setMessage('Please enter your password or PIN.');
      return;
    }

    if (rawPassword.length < 3) {
      setStatus('error');
      setMessage('Password or PIN must be at least 3 characters.');
      return;
    }

    const isTurnstileConfigured = Boolean(
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
    );
    if (isTurnstileConfigured && !turnstileToken) {
      setStatus('error');
      setMessage('Please complete the human verification check below.');
      return;
    }

    inFlight.current = true;
    setStatus('loading');
    setMessage('');
    setSuggestSignUp(false);

    const supabase = createClient();
    const dummyEmail = toDummyEmail(cleanUsername);

    try {
      // ----------------------------------------------------------------------
      // Explicit Sign Up Tab Flow
      // ----------------------------------------------------------------------
      if (currentMode === 'signup') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: dummyEmail,
          password: rawPassword,
          options: {
            data: {
              username: cleanUsername,
              full_name: cleanUsername,
            },
          },
        });

        if (signUpError) {
          const errMsg = signUpError.message || '';
          if (/already registered|user_already_exists|email exists/i.test(errMsg)) {
            setStatus('error');
            setMessage(
              `Username '@${cleanUsername}' already exists. Switch to Sign In to enter.`
            );
            return;
          }
          if (/confirmation email/i.test(errMsg)) {
            setStatus('error');
            setMessage(
              `Please verify your account or contact support if you need assistance logging in.`
            );
            return;
          }
          throw new Error(errMsg);
        }

        // Immediate session active
        if (signUpData?.session) {
          setStatus('success');
          setMessage(`Account created for @${cleanUsername}! Entering app...`);
          setTimeout(() => {
            window.location.assign(nextTarget);
          }, 600);
          return;
        }

        // Try immediate signInWithPassword if session wasn't returned in signUp body
        const { data: signInAfter, error: signInAfterErr } =
          await supabase.auth.signInWithPassword({
            email: dummyEmail,
            password: rawPassword,
          });

        if (signInAfter?.session) {
          setStatus('success');
          setMessage(`Welcome, @${cleanUsername}! Entering app...`);
          setTimeout(() => {
            window.location.assign(nextTarget);
          }, 600);
          return;
        }

        if (signInAfterErr && /email not confirmed/i.test(signInAfterErr.message)) {
          setStatus('error');
          setMessage(
            `Account created! Please sign in with your username and password or PIN.`
          );
          return;
        }

        setStatus('success');
        setMessage(`Account created! Entering app...`);
        setTimeout(() => {
          window.location.assign(nextTarget);
        }, 600);
        return;
      }

      // ----------------------------------------------------------------------
      // Unified "Enter App" Flow (Sign In first -> Auto-Register if new)
      // ----------------------------------------------------------------------
      let { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: dummyEmail,
          password: rawPassword,
        });

      // Special fallback: Check admin email if username is 'admin' or matches configured admin
      if (
        signInError &&
        (cleanUsername === 'admin' || cleanUsername.includes('admin'))
      ) {
        const adminFallbackEmail = 'tthirukumar847@gmail.com';
        const adminRes = await supabase.auth.signInWithPassword({
          email: adminFallbackEmail,
          password: rawPassword,
        });
        if (adminRes.data?.session) {
          signInData = adminRes.data;
          signInError = null;
        }
      }

      // 1. Success on signInWithPassword
      if (!signInError && signInData?.session) {
        setStatus('success');
        setMessage(`Signed in successfully! Entering app...`);
        setTimeout(() => {
          window.location.assign(nextTarget);
        }, 500);
        return;
      }

      // 2. If signInWithPassword returns invalid credentials error:
      const isInvalidCredentials = Boolean(
        signInError?.message &&
          (/invalid login credentials|invalid credentials/i.test(signInError.message) ||
            signInError.status === 400)
      );

      if (isInvalidCredentials) {
        // Try auto-registering the user immediately with the entered credentials
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: dummyEmail,
          password: rawPassword,
          options: {
            data: {
              username: cleanUsername,
              full_name: cleanUsername,
            },
          },
        });

        // 2a. If auto-registration succeeds with an active session:
        if (signUpData?.session) {
          setStatus('success');
          setMessage(`New account created for @${cleanUsername}! Entering app...`);
          setTimeout(() => {
            window.location.assign(nextTarget);
          }, 600);
          return;
        }

        // 2b. If user is already registered in auth, credentials were simply wrong:
        const alreadyExists =
          Boolean(
            signUpError &&
              /already registered|user_already_exists|email exists/i.test(
                signUpError.message
              )
          ) ||
          Boolean(
            signUpData?.user &&
              (!signUpData.user.identities || signUpData.user.identities.length === 0)
          );

        if (alreadyExists) {
          setStatus('error');
          setMessage(
            `Incorrect password or PIN for username '@${cleanUsername}'. Please try again.`
          );
          setSuggestSignUp(false);
          return;
        }

        // 2c. If user was created but no session immediately returned:
        if (signUpData?.user && !signUpData?.session) {
          // Attempt immediate sign in
          const { data: retrySignIn } = await supabase.auth.signInWithPassword({
            email: dummyEmail,
            password: rawPassword,
          });

          if (retrySignIn?.session) {
            setStatus('success');
            setMessage(`Account created for @${cleanUsername}! Entering app...`);
            setTimeout(() => {
              window.location.assign(nextTarget);
            }, 600);
            return;
          }

          setStatus('error');
          setMessage(
            `Account created! Please sign in with your username and password.`
          );
          return;
        }

        if (signUpError && /confirmation email/i.test(signUpError.message)) {
          setStatus('error');
          setMessage(
            `Account created! Please sign in with your credentials.`
          );
          setSuggestSignUp(true);
          return;
        }

        // Fallback: Provide clean 1-click Sign Up prompt
        setStatus('error');
        setMessage(
          `No account found for '@${cleanUsername}', or invalid credentials.`
        );
        setSuggestSignUp(true);
        return;
      }

      // Any other auth error
      setStatus('error');
      setMessage(signInError?.message || 'Unable to sign in. Please try again.');
      setTurnstileToken('');
      turnstileRef.current?.reset();
    } catch (err: unknown) {
      setStatus('error');
      setMessage(
        err instanceof Error ? err.message : 'An error occurred during authentication.'
      );
      setTurnstileToken('');
      turnstileRef.current?.reset();
    } finally {
      inFlight.current = false;
      setStatus((current) => (current === 'loading' ? 'idle' : current));
    }
  }

  return (
    <div className="space-y-5">
      {/* 1-Click Clean Mode Switcher Tabs */}
      <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setMessage('');
            setStatus('idle');
            setSuggestSignUp(false);
          }}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs sm:text-sm font-semibold transition-all duration-150 ${
            mode === 'signin'
              ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setMessage('');
            setStatus('idle');
            setSuggestSignUp(false);
          }}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs sm:text-sm font-semibold transition-all duration-150 ${
            mode === 'signup'
              ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Sign Up</span>
        </button>
      </div>

      {/* Status & Feedback Messages */}
      {status === 'error' && message && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="leading-snug">{message}</p>

              {/* Clean 1-Click Sign Up action if invalid credentials for new user */}
              {suggestSignUp && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      handleEnterApp(undefined, 'signup');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
                  >
                    <UserPlus className="h-3 w-3" />
                    <span>Create account as &quot;{username.trim()}&quot; &amp; Enter</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {status === 'success' && message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs sm:text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="font-medium leading-snug">{message}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={(e) => handleEnterApp(e)} className="space-y-4">
        {/* Username Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="username-input"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
          >
            Username
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 dark:text-zinc-500">
              <User className="h-4 w-4" />
            </div>
            <Input
              id="username-input"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              required
              placeholder="e.g. alex or student01"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              className="pl-10 h-11 text-sm bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
              disabled={status === 'loading'}
            />
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            No email address needed. Use your username to enter.
          </p>
        </div>

        {/* Password / PIN Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password-input"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
            >
              Password / PIN
            </label>
            <span className="text-[11px] text-zinc-400">Min 3 characters</span>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 dark:text-zinc-500">
              <Lock className="h-4 w-4" />
            </div>
            <Input
              id="password-input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              placeholder="Enter password or numeric PIN"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              className="pl-10 pr-10 h-11 text-sm bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 font-mono tracking-tight"
              disabled={status === 'loading'}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Cloudflare Turnstile Human Verification (if enabled) */}
        {Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) && (
          <div className="pt-1 flex justify-center">
            <TurnstileWidget
              ref={turnstileRef}
              action={mode === 'signup' ? 'signup' : 'login'}
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken('')}
              onError={() => setTurnstileToken('')}
            />
          </div>
        )}

        {/* Unified "Enter App" Primary Action Button */}
        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={status === 'loading'}
            className="w-full h-11 text-sm sm:text-base font-semibold shadow-md transition-all duration-150 hover:opacity-95 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {mode === 'signup' ? 'Creating account…' : 'Entering App…'}
                </span>
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Create Account &amp; Enter</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Enter App</span>
                <ArrowRight className="h-4 w-4 ml-0.5 opacity-80" />
              </>
            )}
          </Button>
        </div>

        {/* Helpful Session Note */}
        <div className="pt-1 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>Stay signed in securely on this device</span>
        </div>
      </form>
    </div>
  );
}
