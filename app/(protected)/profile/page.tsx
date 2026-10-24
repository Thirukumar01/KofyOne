/**
 * KofyOne - User Profile Settings Page
 */

'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/types/user';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preferredPlatform, setPreferredPlatform] = useState('microsoft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profRow } = await (supabase.from('profiles') as unknown as {
          select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
        })
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        const prof = profRow as Partial<UserProfile> | null;

        const { data: roleRow } = await (supabase.from('user_roles') as unknown as {
          select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
        })
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        const role = (roleRow as { role?: UserProfile['role'] } | null)?.role || prof?.role || 'student';

        const profileObj: UserProfile = {
          id: user.id,
          email: user.email || '',
          role,
          full_name: prof?.full_name || (user.user_metadata?.full_name as string) || '',
          avatar_url: prof?.avatar_url || (user.user_metadata?.avatar_url as string) || '',
          preferred_platform: prof?.preferred_platform || 'microsoft',
          created_at: user.created_at,
          updated_at: prof?.updated_at || user.created_at,
        };

        setProfile(profileObj);
        setFullName(profileObj.full_name || '');
        setAvatarUrl(profileObj.avatar_url || '');
        setPreferredPlatform(profileObj.preferred_platform || 'microsoft');
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchProfile();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setStatus('idle');
    setMessage('');

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          avatar_url: avatarUrl,
          preferred_platform: preferredPlatform,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      setStatus('success');
      setMessage('Profile updated successfully.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-zinc-500">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-6">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-50 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <span>/</span>
        <span>Profile Settings</span>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                <User className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Profile Settings</CardTitle>
                <CardDescription className="text-xs">
                  Manage your personal details and preferences.
                </CardDescription>
              </div>
            </div>
            <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
              {profile?.role || 'student'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Read-only Account Information */}
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 p-4 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                System Identity (Read-Only)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-400 block">Email Address</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{profile?.email}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Assigned Role</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
                    {profile?.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-2">
              <label htmlFor="full-name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Johnson"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="avatar-url" className="text-sm font-medium">
                Avatar Image URL (Optional)
              </label>
              <Input
                id="avatar-url"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="preferred-platform" className="text-sm font-medium">
                Primary Ecosystem Focus
              </label>
              <select
                id="preferred-platform"
                value={preferredPlatform}
                onChange={(e) => setPreferredPlatform(e.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <option value="microsoft">Microsoft (Azure, Learn, AI, Developer)</option>
              </select>
            </div>

            <Button className="w-full" disabled={saving}>
              {saving ? 'Saving changes…' : 'Save Profile Changes'}
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
        </CardContent>
      </Card>
    </div>
  );
}
