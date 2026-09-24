'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

export function MainNav() {
  const pathname = usePathname();

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
              'transition-colors hover:text-zinc-900 dark:hover:text-zinc-50',
              isActive
                ? 'font-semibold text-blue-600 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400'
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
