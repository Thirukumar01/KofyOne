import Link from 'next/link';
import { MainNav } from '@/components/navigation/main-nav';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { getSiteBranding } from '@/lib/data/site-branding';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { BrandingLogo } from '@/components/branding/branding-logo';
import { ThemeToggle } from '@/components/common/theme-provider';
import { PresetAvatar } from '@/components/common/preset-avatar';
import { Bookmark, Clock, ShieldCheck } from 'lucide-react';

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
    <header className="sticky top-0 z-40 w-full border-b border-[#F0DCDD] bg-[#FFF5F4]/90 backdrop-blur-md dark:border-[#2E2C30] dark:bg-[#151517]/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <BrandingLogo branding={branding} variant="primary" />
          </Link>
          <MainNav profile={profile} />
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <div className="hidden sm:flex items-center gap-3">
            {profile ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/favorites"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#777171] hover:text-[#292526] hover:bg-[#FCECEB] dark:text-[#A8A2A2] dark:hover:text-[#F6F5F3] dark:hover:bg-[#252429] transition-colors"
                  title="Saved Resources"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>Saved</span>
                </Link>

                <Link
                  href="/recent"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#777171] hover:text-[#292526] hover:bg-[#FCECEB] dark:text-[#A8A2A2] dark:hover:text-[#F6F5F3] dark:hover:bg-[#252429] transition-colors"
                  title="Recently Viewed"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>History</span>
                </Link>

                {profile.role === 'admin' ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 rounded-full bg-[rgba(185,74,80,0.12)] px-2.5 py-1 text-xs font-semibold text-[#B94A50] hover:bg-[rgba(185,74,80,0.18)] dark:bg-[rgba(217,140,145,0.15)] dark:text-[#D98C91] border border-[rgba(185,74,80,0.20)] dark:border-[rgba(217,140,145,0.25)] transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Admin</span>
                  </Link>
                ) : null}

                <div className="h-4 w-px bg-[#F0DCDD] dark:bg-[#2E2C30] mx-1" />

                <Link
                  href="/settings"
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 bg-[#FCECEB]/80 dark:bg-[#252429] hover:bg-[#FCECEB] dark:hover:bg-[#2e2c34] border border-[#F0DCDD] dark:border-[#2E2C30] transition-colors"
                  title="Profile & Settings"
                >
                  <PresetAvatar avatarId={profile.avatar_url} size={24} />
                  <span className="text-xs font-semibold text-[#292526] dark:text-[#F6F5F3] truncate max-w-[110px]">
                    {displayName}
                  </span>
                </Link>

                <SignOutButton />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-xs font-medium text-[#777171] hover:text-[#292526] dark:text-[#A8A2A2] dark:hover:text-[#F6F5F3] px-2 py-1 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-[#B94A50] px-3 text-xs font-semibold text-white dark:text-[#F6F5F3] shadow-xs hover:bg-[#A13D43] dark:hover:bg-[#C85A60] active:bg-[#8D3338] transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <MobileNav profile={profile} branding={branding} />
        </div>
      </div>
    </header>
  );
}
