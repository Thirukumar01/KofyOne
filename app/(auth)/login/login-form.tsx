'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Check, HelpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TurnstileWidget, type TurnstileWidgetRef } from '@/components/auth/turnstile-widget';
import { validatePassword } from '@/lib/auth/password';
import { validateUsername } from '@/lib/auth/username';
import { PREDEFINED_SECURITY_QUESTIONS } from '@/lib/auth/security-questions';

const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_QUOTA_COOLDOWN_SECONDS = 90;

type AuthMode = 'signin' | 'signup' | 'otp';
type AuthStep = 'request' | 'verify';
type AuthStatus = 'idle' | 'loading' | 'error' | 'success';

function authErrorMessage(error: unknown) {
  const authError = error as { status?: number; code?: string; message?: string };
  const code = authError.code ?? '';
  const message = authError.message ?? '';

  if (code === 'email_provider_disabled' || /email logins are disabled/i.test(message)) {
    return 'Email logins are disabled in your Supabase project. Enable Email provider under Authentication → Providers.';
  }
  if (authError.status === 429 || /rate limit|too many requests/i.test(message)) {
    return 'Rate limit reached. Please wait a minute or try signing in with Google or Microsoft.';
  }
  if (code === 'otp_expired') return 'This verification code has expired. Please request a new one.';
  if (/token|otp/i.test(code) || /token|otp/i.test(message)) return 'Incorrect verification code. Please check and try again.';
  if (code === 'user_already_exists' || /already registered/i.test(message)) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Invalid email/username or password. Please verify and try again.';
  }
  if (/network|fetch|failed to fetch/i.test(message)) {
    return 'Unable to connect right now. Please check your internet connection.';
  }
  return message || 'An unexpected error occurred. Please try again.';
}

function formatCooldown(seconds: number) {
  return seconds > 60 ? `${Math.ceil(seconds / 60)}m` : `${seconds}s`;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const inFlight = useRef(false);

  const [mode, setMode] = useState<AuthMode>('signin');
  const [step, setStep] = useState<AuthStep>('request');
  const [status, setStatus] = useState<AuthStatus>(errorParam ? 'error' : 'idle');
  const [message, setMessage] = useState(errorParam ? decodeURIComponent(errorParam) : '');

  // Sign In Field: Email or Username
  const [loginIdentifier, setLoginIdentifier] = useState('');

  // Cloudflare Turnstile Human Verification
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  // Sign Up Fields
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [username, setUsername] = useState('');
  const [securityQuestionId, setSecurityQuestionId] = useState(PREDEFINED_SECURITY_QUESTIONS[0].id);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);

  // Common Fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Cooldown timers for email OTP
  const [resendSeconds, setResendSeconds] = useState(0);
  const [quotaSeconds, setQuotaSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0 && quotaSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
      setQuotaSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds, quotaSeconds]);

  const passwordStrength = validatePassword(password);
  const usernameCheck = validateUsername(username);
  const passwordsMatch = mode !== 'signup' || (password.length > 0 && password === confirmPassword);
  const isBlocked = status === 'loading' || quotaSeconds > 0;

  // 1. Sign In (Email or Username + Password)
  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || isBlocked) return;

    const identifier = loginIdentifier.trim();
    if (!identifier || !password) {
      setStatus('error');
      setMessage('Please enter your email address or username and password.');
      return;
    }

    const isTurnstileConfigured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
    if (isTurnstileConfigured && !turnstileToken) {
      setStatus('error');
      setMessage('Please complete the human verification challenge before signing in.');
      return;
    }

    inFlight.current = true;
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          password,
          next: searchParams.get('next'),
          turnstile_token: turnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      window.location.assign(data.redirectTo || '/dashboard');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Invalid login credentials.');
      // Reset Turnstile on submission failure so user can obtain a fresh token
      setTurnstileToken('');
      turnstileRef.current?.reset();
    } finally {
      inFlight.current = false;
      setStatus((curr) => (curr === 'loading' ? 'idle' : curr));
    }
  }

  // 2. User Registration (Email, Unique Username, Password, Predefined Question & Answer)
  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || isBlocked) return;

    const normalizedEmail = signupEmail.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanAnswer = securityAnswer.trim();

    if (!normalizedEmail || !cleanUsername || !password || !cleanAnswer) {
      setStatus('error');
      setMessage('Please fill in all required fields.');
      return;
    }

    if (!usernameCheck.isValid) {
      setStatus('error');
      setMessage(usernameCheck.error || 'Invalid username format.');
      return;
    }

    if (passwordStrength.errors.length > 0) {
      setStatus('error');
      setMessage(passwordStrength.errors[0]);
      return;
    }

    if (!passwordsMatch) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    if (cleanAnswer.length < 2) {
      setStatus('error');
      setMessage('Security answer must be at least 2 characters.');
      return;
    }

    const isTurnstileConfigured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
    if (isTurnstileConfigured && !turnstileToken) {
      setStatus('error');
      setMessage('Please complete the human verification challenge before creating an account.');
      return;
    }

    inFlight.current = true;
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          username: cleanUsername,
          password,
          full_name: fullName.trim(),
          security_question_id: securityQuestionId,
          security_answer: cleanAnswer,
          turnstile_token: turnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      setStatus('success');
      setMessage(data.message || 'Account created successfully!');

      if (!data.requiresEmailVerification) {
        // Immediate login succeeded
        setTimeout(() => {
          window.location.assign('/dashboard');
        }, 1500);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Registration failed.');
      // Reset Turnstile on failure so user can obtain a fresh token
      setTurnstileToken('');
      turnstileRef.current?.reset();
    } finally {
      inFlight.current = false;
      setStatus((curr) => (curr === 'loading' ? 'idle' : curr));
    }
  }

  // 3. Email Link / Code (OTP)
  async function sendOtp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (inFlight.current || isBlocked || resendSeconds > 0) return;
    const normalizedEmail = (mode === 'signin' ? loginIdentifier : signupEmail).trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setStatus('error');
      setMessage('Enter a valid email address to continue.');
      return;
    }

    inFlight.current = true;
    setStatus('loading');
    setMessage('');

    const next = searchParams.get('next');
    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next || '/dashboard')}`
        : undefined;

    try {
      const { error } = await createClient().auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      setSignupEmail(normalizedEmail);
      setStep('verify');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setMessage('Verification link sent! Check your inbox, or enter the 6-digit code below.');
    } catch (error) {
      const authError = error as { status?: number; message?: string };
      if (authError.status === 429 || /rate limit|too many requests/i.test(authError.message ?? '')) {
        setQuotaSeconds(EMAIL_QUOTA_COOLDOWN_SECONDS);
      }
      setStatus('error');
      setMessage(authErrorMessage(error));
    } finally {
      inFlight.current = false;
      setStatus((current) => (current === 'loading' ? 'idle' : current));
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || isBlocked) return;
    const token = otp.replace(/\s/g, '');
    if (!/^\d{6}$/.test(token)) {
      setStatus('error');
      setMessage('Enter the six-digit verification code from your email.');
      return;
    }

    inFlight.current = true;
    setStatus('loading');
    setMessage('');

    try {
      const { error } = await createClient().auth.verifyOtp({ email: signupEmail, token, type: 'email' });
      if (error) throw error;
      const next = searchParams.get('next');
      window.location.assign(next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
    } catch (error) {
      setStatus('error');
      setMessage(authErrorMessage(error));
    } finally {
      inFlight.current = false;
      setStatus((current) => (current === 'loading' ? 'idle' : current));
    }
  }

  // OTP Verification View
  if (mode === 'otp' && step === 'verify') {
    return (
      <form onSubmit={verifyOtp} className="space-y-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-center dark:border-blue-900/50 dark:bg-blue-950/20">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Check your inbox</p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            Click the link sent to <span className="font-semibold">{signupEmail}</span> or enter the code.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="otp" className="text-sm font-medium">Six-digit code</label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            disabled={isBlocked}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
            placeholder="123456"
          />
        </div>

        <Button className="w-full" disabled={isBlocked || otp.length < 6} aria-busy={status === 'loading'}>
          {status === 'loading' ? 'Verifying…' : 'Verify and Sign In'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isBlocked || resendSeconds > 0}
          onClick={() => void sendOtp()}
        >
          {resendSeconds > 0 ? `Resend code in ${formatCooldown(resendSeconds)}` : 'Resend code'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={isBlocked}
          onClick={() => {
            setStep('request');
            setOtp('');
            setMessage('');
          }}
        >
          Use a different email
        </Button>

        {message && (
          <p
            role={status === 'error' ? 'alert' : 'status'}
            className={
              status === 'error'
                ? 'rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                : 'rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
            }
          >
            {message}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-3 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setMessage('');
            setStatus('idle');
            setTurnstileToken('');
          }}
          className={`py-1.5 rounded-md transition-all ${
            mode === 'signin'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setMessage('');
            setStatus('idle');
            setTurnstileToken('');
          }}
          className={`py-1.5 rounded-md transition-all ${
            mode === 'signup'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          Create Account
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('otp');
            setMessage('');
            setStatus('idle');
            setTurnstileToken('');
          }}
          className={`py-1.5 rounded-md transition-all ${
            mode === 'otp'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          Magic Link
        </button>
      </div>

      {/* Mode 1: Sign In (Email or Username + Password) */}
      {mode === 'signin' && (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="login-identifier" className="text-sm font-medium">
              Email address or Username
            </label>
            <Input
              id="login-identifier"
              type="text"
              required
              autoComplete="username"
              disabled={isBlocked}
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="you@example.com or your_username"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                disabled={isBlocked}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Cloudflare Turnstile Human Verification Widget */}
          <TurnstileWidget
            ref={turnstileRef}
            action="login"
            onVerify={(token) => {
              setTurnstileToken(token);
              setStatus((curr) => {
                if (curr === 'error') {
                  setMessage((msg) => (msg.toLowerCase().includes('verification') ? '' : msg));
                  return 'idle';
                }
                return curr;
              });
            }}
            onExpire={() => setTurnstileToken('')}
            onError={() => setTurnstileToken('')}
            onReset={() => {
              setTurnstileToken('');
              setStatus((curr) => {
                if (curr === 'error') {
                  setMessage((msg) => (msg.toLowerCase().includes('verification') ? '' : msg));
                  return 'idle';
                }
                return curr;
              });
            }}
          />

          <Button className="w-full" disabled={isBlocked} aria-busy={status === 'loading'}>
            {status === 'loading' ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      )}

      {/* Mode 2: Sign Up (Registration with Unique Username and Security Question) */}
      {mode === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="full-name" className="text-sm font-medium">Full Name (optional)</label>
            <Input
              id="full-name"
              type="text"
              autoComplete="name"
              disabled={isBlocked}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Johnson"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="signup-email" className="text-sm font-medium">Email address</label>
            <Input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              disabled={isBlocked}
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {/* Unique Username */}
          <div className="space-y-2">
            <label htmlFor="signup-username" className="text-sm font-medium">
              Username
            </label>
            <Input
              id="signup-username"
              type="text"
              required
              autoComplete="username"
              disabled={isBlocked}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alex_johnson"
            />
            {username.length > 0 && !usernameCheck.isValid && (
              <p className="text-[11px] text-red-500">
                • {usernameCheck.error}
              </p>
            )}
            {username.length >= 3 && usernameCheck.isValid && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> Valid username format
              </p>
            )}
          </div>

          {/* Security Question Selection */}
          <div className="space-y-2">
            <label htmlFor="security-question" className="text-sm font-medium flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-orange-500" />
              Security Question (for self-service recovery)
            </label>
            <select
              id="security-question"
              required
              disabled={isBlocked}
              value={securityQuestionId}
              onChange={(e) => setSecurityQuestionId(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {PREDEFINED_SECURITY_QUESTIONS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          {/* Security Answer (Masked by default) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="security-answer" className="text-sm font-medium">
                Security Answer
              </label>
              <button
                type="button"
                onClick={() => setShowSecurityAnswer(!showSecurityAnswer)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center gap-1"
              >
                {showSecurityAnswer ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showSecurityAnswer ? 'Hide' : 'Show'}
              </button>
            </div>
            <Input
              id="security-answer"
              type={showSecurityAnswer ? 'text' : 'password'}
              required
              autoComplete="off"
              disabled={isBlocked}
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Your private answer"
            />
            <p className="text-[11px] text-zinc-500">
              Answers are securely hashed with bcrypt. Never shared or stored in plaintext.
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="signup-password" className="text-sm font-medium">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              disabled={isBlocked}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />

            {/* Real-time Strength Meter */}
            {password.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Strength:</span>
                  <span className={`font-semibold ${passwordStrength.color.split(' ')[0]}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 h-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`rounded-full transition-colors ${
                        passwordStrength.score >= step
                          ? passwordStrength.color.split(' ')[1]
                          : 'bg-zinc-200 dark:bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
                {passwordStrength.errors.length > 0 && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    • {passwordStrength.errors[0]}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</label>
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              disabled={isBlocked}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
            />
            {confirmPassword.length > 0 && (
              <p
                className={`text-[11px] flex items-center gap-1 ${
                  passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                }`}
              >
                {passwordsMatch ? (
                  <>
                    <Check className="h-3 w-3" /> Passwords match
                  </>
                ) : (
                  'Passwords do not match'
                )}
              </p>
            )}
          </div>

          {/* Cloudflare Turnstile Human Verification Widget */}
          <TurnstileWidget
            ref={turnstileRef}
            action="signup"
            onVerify={(token) => {
              setTurnstileToken(token);
              setStatus((curr) => {
                if (curr === 'error') {
                  setMessage((msg) => (msg.toLowerCase().includes('verification') ? '' : msg));
                  return 'idle';
                }
                return curr;
              });
            }}
            onExpire={() => setTurnstileToken('')}
            onError={() => setTurnstileToken('')}
            onReset={() => {
              setTurnstileToken('');
              setStatus((curr) => {
                if (curr === 'error') {
                  setMessage((msg) => (msg.toLowerCase().includes('verification') ? '' : msg));
                  return 'idle';
                }
                return curr;
              });
            }}
          />

          <Button
            className="w-full"
            disabled={
              isBlocked ||
              !usernameCheck.isValid ||
              passwordStrength.errors.length > 0 ||
              !passwordsMatch ||
              securityAnswer.trim().length < 2
            }
            aria-busy={status === 'loading'}
          >
            {status === 'loading' ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>
      )}

      {/* Mode 3: Magic Link */}
      {mode === 'otp' && step === 'request' && (
        <form onSubmit={sendOtp} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="otp-email" className="text-sm font-medium">Email address</label>
            <Input
              id="otp-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              disabled={isBlocked}
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <Button className="w-full" disabled={isBlocked || !signupEmail.trim()} aria-busy={status === 'loading'}>
            {status === 'loading' ? 'Sending link…' : 'Send Magic Link / OTP'}
          </Button>
        </form>
      )}

      {/* Status Messages */}
      {message && (
        <p
          role={status === 'error' ? 'alert' : 'status'}
          className={
            status === 'error'
              ? 'rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
              : 'rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
          }
        >
          {message}
        </p>
      )}

      <p className="text-center text-xs text-zinc-500">
        By continuing, you agree to KofyOne&apos;s{' '}
        <Link href="/terms" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          Privacy Policy
        </Link>.
      </p>
    </div>
  );
}
