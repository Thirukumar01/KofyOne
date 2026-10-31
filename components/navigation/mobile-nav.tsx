'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { BrandingLogo } from '@/components/branding/branding-logo';
import { ThemeToggle } from '@/components/common/theme-provider';
import { PresetAvatar } from '@/components/common/preset-avatar';
import type { UserProfile } from '@/types/user';
import type { SiteBranding } from '@/types/branding';

export function MobileNav({
  profile,
  branding,
}: {
  profile?: UserProfile | null;
  branding?: Partial<SiteBranding> | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    (profile?.email ? profile.email.split('@')[0] : '');

  const learnerStage = profile?.learner_role || profile?.role_focus || 'student';
  const platform = profile?.preferred_platform || 'microsoft';

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-label="Toggle mobile menu"
        className="px-2"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </Button>

      {isOpen && (
        <div
          className="fixed inset-x-0 top-16 z-50 border-b border-[#F0DCDD] bg-[#FFF5F4]/95 p-6 shadow-lg backdrop-blur-md dark:border-[#2E2C30] dark:bg-[#151517]/95"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          <div className="mb-4 pb-4 border-b border-[#F0DCDD] dark:border-[#2E2C30] flex items-center justify-between">
            <BrandingLogo branding={branding} />
            <ThemeToggle />
          </div>

          <nav className="flex flex-col space-y-4">
            {siteConfig.mainNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'text-base font-medium transition-colors',
                    isActive
                      ? 'font-semibold text-[#B94A50] dark:text-[#D98C91]'
                      : 'text-[#777171] hover:text-[#292526] dark:text-[#A8A2A2] dark:hover:text-[#F6F5F3]'
                  )}
                >
                  {item.title}
                </Link>
              );
            })}

            {profile && (
              <div className="pt-2 border-t border-[#F0DCDD] dark:border-[#2E2C30] flex flex-col space-y-2 text-sm">
                <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-[#FCECEB] dark:bg-[#252429]">
                  <PresetAvatar avatarId={profile.avatar_url} size={28} />
                  <div className="truncate min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-[#292526] dark:text-[#F6F5F3] truncate">
                      {displayName}
                    </span>
                    <span className="block text-[10px] text-[#777171] dark:text-[#A8A2A2] truncate">
                      {profile.email}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#777171]">
                      <span className="font-medium text-[#B94A50] dark:text-[#D98C91] capitalize">
                        {learnerStage}
                      </span>
                      {platform ? (
                        <>
                          <span>•</span>
                          <span className="capitalize">{platform}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  onClick={close}
                  className="font-medium text-[#292526] dark:text-[#F6F5F3] hover:text-[#B94A50] dark:hover:text-[#D98C91]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  onClick={close}
                  className="font-medium text-[#292526] dark:text-[#F6F5F3] hover:text-[#B94A50] dark:hover:text-[#D98C91]"
                >
                  User Settings & Profile
                </Link>
                <Link
                  href="/settings/security"
                  onClick={close}
                  className="font-medium text-[#292526] dark:text-[#F6F5F3] hover:text-[#B94A50] dark:hover:text-[#D98C91]"
                >
                  Security & Account
                </Link>
                {profile.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={close}
                    className="font-semibold text-[#B94A50] dark:text-[#D98C91]"
                  >
                    Admin Portal
                  </Link>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
              {profile ? (
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-zinc-500 truncate max-w-[200px]">
                    {displayName}
                  </span>
                  <SignOutButton />
                </div>
              ) : (
                <Link href="/login" onClick={close}>
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
              )}
              <Link href="/resources" onClick={close}>
                <Button variant="primary" className="w-full">
                  Explore Resources
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
