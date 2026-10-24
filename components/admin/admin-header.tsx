'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

export function AdminHeader({ title, description }: { title: string; description?: string }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 uppercase tracking-wider"
            >
              Admin Portal
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-xs font-medium text-zinc-500">{title}</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/resources"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            View Live Site
          </Link>
        </div>
      </div>

      {/* Admin Subnav Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {siteConfig.adminNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60'
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
