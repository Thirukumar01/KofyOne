/**
 * KofyOne - Security & Account Settings Page
 *
 * Includes:
 * 1. Password update with strength analysis.
 * 2. Identity provider details (OAuth / Email).
 * 3. Irreversible Account Deletion with explicit confirmation & reauthentication.
 */

'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  KeyRound,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/auth/password';
import type { User } from '@supabase/supabase-js';

export default function SecuritySettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Password Update State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [passwordMessage, setPasswordMessage] = useState('');

  // Account Deletion State
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await createClient().auth.getUser();
        setUser(data.user);
      } catch (err) {
        console.error('Error loading user session:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadUser();
  }, []);

  const strength = validatePassword(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isEmailUser = user?.app_metadata?.provider === 'email';

  async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (strength.errors.length > 0 || !passwordsMatch || updatingPassword) return;

    setUpdatingPassword(true);
    setPasswordStatus('idle');
    setPasswordMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setPasswordStatus('success');
      setPasswordMessage('Your password has been changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus('error');
      setPasswordMessage(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleDeleteAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (deleteConfirmation !== 'DELETE' || deleting) return;

    setDeleting(true);
    setDeleteMessage('');

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          password: deletePassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account.');
      }

      window.location.assign(data.redirect || '/account-deleted');
    } catch (err) {
      setDeleteMessage(err instanceof Error ? err.message : 'Error deleting account.');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-zinc-500">
        Loading security settings…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-50 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <span>/</span>
        <span>Security & Account</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Security & Account Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your credentials, authentication providers, and account data.
        </p>
      </div>

      {/* Connected Authentication Provider */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Authentication Provider</CardTitle>
              <CardDescription className="text-xs">
                Active sign-in identity connected to this account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-4 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block capitalize">
                {user?.app_metadata?.provider || 'Email'}
              </span>
              <span className="text-zinc-500">{user?.email}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Password Management */}
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription className="text-xs">
                Update your account password with a secure new combination.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="new-pwd" className="text-sm font-medium">New Password</label>
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
                id="new-pwd"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={updatingPassword}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
              />

              {newPassword.length > 0 && (
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

            <div className="space-y-2">
              <label htmlFor="confirm-pwd" className="text-sm font-medium">Confirm New Password</label>
              <Input
                id="confirm-pwd"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={updatingPassword}
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
              disabled={updatingPassword || strength.errors.length > 0 || !passwordsMatch}
            >
              {updatingPassword ? 'Updating…' : 'Update Password'}
            </Button>

            {passwordMessage && (
              <p
                role={passwordStatus === 'error' ? 'alert' : 'status'}
                className={
                  passwordStatus === 'error'
                    ? 'rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                    : 'rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                }
              >
                {passwordMessage}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Irreversible Account Deletion */}
      <Card className="border-red-200 dark:border-red-950/60 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base text-red-600 dark:text-red-400">
                Danger Zone: Delete Account
              </CardTitle>
              <CardDescription className="text-xs">
                Permanently delete your KofyOne account and all associated personal data.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4 mb-4 text-xs text-red-800 dark:text-red-200 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-red-900 dark:text-red-100">
              <AlertTriangle className="h-4 w-4" />
              This action is permanent and cannot be undone.
            </div>
            <p>
              Deleting your account will remove your saved bookmarks, history, and profile data from our servers.
            </p>
          </div>

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            {isEmailUser && (
              <div className="space-y-2">
                <label htmlFor="delete-password" className="text-sm font-medium">
                  Current Password (Reauthentication)
                </label>
                <Input
                  id="delete-password"
                  type="password"
                  required
                  disabled={deleting}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your current password"
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="confirm-delete" className="text-sm font-medium">
                Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm
              </label>
              <Input
                id="confirm-delete"
                type="text"
                required
                disabled={deleting}
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
              />
            </div>

            <Button
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting || deleteConfirmation !== 'DELETE' || (isEmailUser && !deletePassword)}
            >
              {deleting ? 'Deleting account…' : 'Permanently Delete Account'}
            </Button>

            {deleteMessage && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
              >
                {deleteMessage}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
