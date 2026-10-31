/**
 * KofyOne - Set New Password Page
 */

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ShieldCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { validatePassword } from '@/lib/auth/password';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const strength = validatePassword(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (strength.errors.length > 0) {
      setStatus('error');
      setMessage(strength.errors[0]);
      return;
    }

    if (!passwordsMatch) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setStatus('success');
      setMessage('Password updated successfully! You can now sign in with your new credentials.');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <Card className="shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(185,74,80,0.12)] dark:bg-[rgba(217,140,145,0.15)] text-[#B94A50] dark:text-[#D98C91]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription className="text-sm mt-1">
            Choose a strong, secure password for your KofyOne account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'success' ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 text-sm">
                {message}
              </div>
              <p className="text-xs text-zinc-500">Redirecting to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="new-password" className="text-sm font-medium">
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                />

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Strength:</span>
                      <span className={`font-semibold ${strength.color.split(' ')[0]}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full transition-colors ${
                            strength.score >= step
                              ? strength.color.split(' ')[1]
                              : 'bg-zinc-200 dark:bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>
                    {strength.errors.length > 0 && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        • {strength.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
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

              <Button
                className="w-full"
                disabled={loading || strength.errors.length > 0 || !passwordsMatch}
              >
                {loading ? 'Updating password…' : 'Update Password'}
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

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
