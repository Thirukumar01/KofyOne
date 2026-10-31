'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types/user';

const NAV_ITEMS = [
  { title: 'Resources', href: '/resources' },
  { title: 'Platforms', href: '/platforms' },
  { title: 'Categories', href: '/categories' },
  { title: 'Events', href: '/events' },
];

export function MainNav(props: { profile?: UserProfile | null } = {}) {
  const pathname = usePathname();
  void props.profile;

  return (
    <nav className="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Main Navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative py-1 transition-colors hover:text-[#292526] dark:hover:text-[#F6F5F3]',
              isActive
                ? 'font-semibold text-[#B94A50] dark:text-[#D98C91]'
                : 'text-[#777171] dark:text-[#A8A2A2]'
            )}
          >
            {item.title}
            {isActive && (
              <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-[#B94A50] dark:bg-[#D98C91]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
