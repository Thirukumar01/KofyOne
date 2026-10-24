/**
 * KofyOne - Authenticated User Dashboard
 */

import Link from 'next/link';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Compass,
  Bookmark,
  Clock,
  User,
  Shield,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile();

  const role = profile?.role || 'student';
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User';

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome back, {displayName}
            </h1>
            <Badge
              variant={role === 'admin' ? 'default' : 'secondary'}
              className="capitalize text-xs font-semibold"
            >
              {role}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {profile?.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {role === 'admin' && (
            <Link href="/admin">
              <Button variant="primary" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700">
                <Shield className="h-4 w-4" />
                Admin Portal
              </Button>
            </Link>
          )}
          <Link href="/resources">
            <Button variant="outline" className="inline-flex items-center gap-2">
              <Compass className="h-4 w-4" />
              Explore Catalog
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Saved Favorites */}
        <Link href="/favorites">
          <Card className="h-full hover:border-orange-500 transition-colors group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                  <Bookmark className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <CardTitle className="text-lg mt-3">Saved Resources</CardTitle>
              <CardDescription className="text-xs">
                Your bookmarked Microsoft tools, documentation, and learning paths.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Recently Viewed */}
        <Link href="/recent">
          <Card className="h-full hover:border-orange-500 transition-colors group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Clock className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <CardTitle className="text-lg mt-3">Recently Viewed</CardTitle>
              <CardDescription className="text-xs">
                Jump back into learning tracks and platforms you explored recently.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Profile Settings */}
        <Link href="/profile">
          <Card className="h-full hover:border-orange-500 transition-colors group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <User className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <CardTitle className="text-lg mt-3">Profile Settings</CardTitle>
              <CardDescription className="text-xs">
                Manage your display name, avatar, and preferred learning ecosystem.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Security & Account */}
        <Link href="/settings/security">
          <Card className="h-full hover:border-orange-500 transition-colors group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Shield className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <CardTitle className="text-lg mt-3">Security & Account</CardTitle>
              <CardDescription className="text-xs">
                Change password, review authentication providers, or manage account data.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Microsoft Ecosystem */}
        <Link href="/platforms/microsoft">
          <Card className="h-full hover:border-orange-500 transition-colors group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <CardTitle className="text-lg mt-3">Microsoft Ecosystem</CardTitle>
              <CardDescription className="text-xs">
                Official learning tracks, certification guides, and student offers.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
