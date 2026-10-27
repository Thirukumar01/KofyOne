'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavGroups } from '@/config/site';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

export function AdminHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
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
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
          >
            <span>View Live Site</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Admin Grouped Navigation Bar */}
      <div className="flex flex-wrap items-center gap-4 pt-2">
        {adminNavGroups.map((navGroup) => (
          <div
            key={navGroup.group}
            className="flex items-center gap-1 rounded-xl bg-zinc-100/80 p-1 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800"
          >
            <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              {navGroup.group}
            </span>
            <div className="flex items-center gap-0.5">
              {navGroup.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap',
                      isActive
                        ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
