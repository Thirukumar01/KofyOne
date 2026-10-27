import Link from 'next/link';
import { MainNav } from '@/components/navigation/main-nav';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getSiteBranding } from '@/lib/data/site-branding';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { BrandingLogo } from '@/components/branding/branding-logo';
import { ThemeToggle } from '@/components/common/theme-provider';
import { PresetAvatar } from '@/components/common/preset-avatar';
import { LayoutDashboard } from 'lucide-react';

export async function Header() {
  const [profile, branding] = await Promise.all([
    getCurrentUserProfile(),
    getSiteBranding(),
  ]);

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    (profile?.email ? profile.email.split('@')[0] : '');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <BrandingLogo branding={branding} variant="primary" />
          </Link>
          <MainNav />
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <div className="hidden sm:flex items-center gap-4">
            {profile ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 rounded-full py-1 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                  title="User Settings & Profile"
                >
                  <PresetAvatar avatarId={profile.avatar_url} size={26} />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate max-w-[120px]">
                    {displayName}
                  </span>
                </Link>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Link>

                {profile.role === 'admin' ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/60 transition-colors"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Admin Portal
                  </Link>
                ) : null}

                <SignOutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Sign In
              </Link>
            )}

            <Link
              href="/resources"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-orange-700 transition-colors"
            >
              Explore Resources
            </Link>
          </div>

          <MobileNav profile={profile} branding={branding} />
        </div>
      </div>
    </header>
  );
}
