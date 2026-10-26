/**
 * KofyOne - Self-Service Password Recovery Page
 *
 * Implements:
 * 1. Registered email or username identification
 * 2. Selection of predefined security question & masked security answer verification
 * 3. Rolling 1-hour rate limiting with 2-failure account lockout
 * 4. In-session new password entry and confirmation upon verification
 * 5. Session termination and redirect to login
 * Zero email / OTP dependency. 100% free, self-contained architecture.
 */

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, KeyRound, ShieldCheck, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PREDEFINED_SECURITY_QUESTIONS } from '@/lib/auth/security-questions';
import { validatePassword } from '@/lib/auth/password';

type FlowStage = 'verify_security' | 'set_new_password' | 'completed';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<FlowStage>('verify_security');

  // Stage 1 Fields
  const [identifier, setIdentifier] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState(PREDEFINED_SECURITY_QUESTIONS[0].id);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  // Stage 2 Fields
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLockedOut, setIsLockedOut] = useState(false);

  const passwordStrength = validatePassword(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Step 1: Verify Identity & Security Answer
  async function handleVerifySecurity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanIdentifier = identifier.trim();
    const cleanAnswer = securityAnswer.trim();

    if (!cleanIdentifier || !cleanAnswer) {
      setErrorMessage('Please fill in both your email/username and your security answer.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanIdentifier,
          security_question_id: selectedQuestionId,
          security_answer: cleanAnswer,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 || data.error?.includes('Maximum verification attempts reached')) {
          setIsLockedOut(true);
        }
        throw new Error(data.error || 'Security verification failed.');
      }

      if (!data.resetToken) {
        throw new Error('Verification completed but no reset token was returned.');
      }

      setResetToken(data.resetToken);
      setStage('set_new_password');
      setSuccessMessage('Security answer verified successfully. You may now set your new password.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Set New Password
  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (passwordStrength.errors.length > 0) {
      setErrorMessage(passwordStrength.errors[0]);
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          password: newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setStage('completed');
      setSuccessMessage('Password updated successfully! Redirecting you to sign in…');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <Card className="shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
            {stage === 'set_new_password' || stage === 'completed' ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <KeyRound className="h-6 w-6" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {stage === 'set_new_password'
              ? 'Set New Password'
              : stage === 'completed'
              ? 'Password Reset Complete'
              : 'Forgot Password'}
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            {stage === 'set_new_password'
              ? 'Enter and confirm your new secure password.'
              : stage === 'completed'
              ? 'Your password has been successfully updated.'
              : 'Verify your account using your security question to set a new password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stage 1: Identity & Security Question Verification */}
          {stage === 'verify_security' && (
            <form onSubmit={handleVerifySecurity} className="space-y-4">
              {/* Account Identifier */}
              <div className="space-y-2">
                <label htmlFor="identifier" className="text-sm font-medium">
                  Email address or Username
                </label>
                <Input
                  id="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  disabled={loading || isLockedOut}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or your_username"
                />
              </div>

              {/* Security Question Selection */}
              <div className="space-y-2">
                <label htmlFor="security-question-select" className="text-sm font-medium">
                  Select your Security Question
                </label>
                <select
                  id="security-question-select"
                  required
                  disabled={loading || isLockedOut}
                  value={selectedQuestionId}
                  onChange={(e) => setSelectedQuestionId(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {PREDEFINED_SECURITY_QUESTIONS.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500">
                  Select the same question chosen during registration.
                </p>
              </div>

              {/* Masked Security Answer */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="security-answer-input" className="text-sm font-medium">
                    Security Answer
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center gap-1"
                  >
                    {showAnswer ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showAnswer ? 'Hide' : 'Show'}
                  </button>
                </div>
                <Input
                  id="security-answer-input"
                  type={showAnswer ? 'text' : 'password'}
                  required
                  autoComplete="off"
                  disabled={loading || isLockedOut}
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Your answer"
                />
              </div>

              <Button
                className="w-full"
                disabled={loading || isLockedOut || !identifier.trim() || !securityAnswer.trim()}
              >
                {loading ? 'Verifying answer…' : 'Verify Security Answer'}
              </Button>
            </form>
          )}

          {/* Stage 2: Set New Password */}
          {stage === 'set_new_password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="reset-new-password" className="text-sm font-medium">
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center gap-1"
                  >
                    {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <Input
                  id="reset-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
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
                <label htmlFor="reset-confirm-password" className="text-sm font-medium">
                  Confirm New Password
                </label>
                <Input
                  id="reset-confirm-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
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
                disabled={loading || passwordStrength.errors.length > 0 || !passwordsMatch}
              >
                {loading ? 'Updating password…' : 'Update Password'}
              </Button>
            </form>
          )}

          {/* Stage 3: Completed */}
          {stage === 'completed' && (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Check className="h-6 w-6" />
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Your password has been changed. You will be redirected to the sign-in page in a few seconds.
              </p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-orange-700 transition-colors"
              >
                Go to Sign In
              </Link>
            </div>
          )}

          {/* Feedback & Error Alerts */}
          {errorMessage && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="space-y-1">
                <p className="font-medium">{errorMessage}</p>
                {isLockedOut && (
                  <p className="text-[11px] text-red-700/80 dark:text-red-300/80">
                    For your account security, verification is temporarily paused following multiple failed attempts.
                  </p>
                )}
              </div>
            </div>
          )}

          {successMessage && stage !== 'completed' && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
              {successMessage}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
