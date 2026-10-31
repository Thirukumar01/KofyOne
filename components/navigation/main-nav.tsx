'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types/user';

export function MainNav(props: { profile?: UserProfile | null } = {}) {
  const pathname = usePathname();
  void props.profile;

  return (
    <nav className="hidden md:flex items-center gap-6 text-sm font-medium" aria-label="Main Navigation">
      {siteConfig.mainNav.slice(0, 5).map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'transition-colors hover:text-[#292526] dark:hover:text-[#F6F5F3]',
              isActive
                ? 'font-semibold text-[#B94A50] dark:text-[#D98C91]'
                : 'text-[#777171] dark:text-[#A8A2A2]'
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
