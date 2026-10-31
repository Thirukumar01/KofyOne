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
    <div className="space-y-4 pb-4 border-b border-[#F0DCDD] dark:border-[#2E2C30]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-[11px] font-semibold text-[#B94A50] hover:text-[#A13D43] dark:text-[#D98C91] uppercase tracking-wider"
            >
              Admin Portal
            </Link>
            <span className="text-[#777171] dark:text-[#A8A2A2] text-xs">/</span>
            <span className="text-xs font-medium text-[#777171] dark:text-[#A8A2A2]">{title}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#292526] dark:text-[#F6F5F3]">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-xs text-[#777171] dark:text-[#A8A2A2]">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/resources"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#F0DCDD] dark:border-[#2E2C30] bg-[#FFF5F4] dark:bg-[#151517] px-3 text-xs font-medium text-[#292526] dark:text-[#F6F5F3] hover:bg-[#FCECEB] dark:hover:bg-[#252429] transition-colors"
          >
            <span>Live Site</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Sleek single-row horizontal scrollable navigation tab bar */}
      <div className="relative flex items-center overflow-x-auto no-scrollbar border-t border-[#F0DCDD]/60 dark:border-[#2E2C30]/60 pt-2 gap-4 sm:gap-6 text-xs">
        {adminNavGroups.map((navGroup) => (
          <div key={navGroup.group} className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#777171]/70 dark:text-[#A8A2A2]/70 mr-0.5 hidden lg:inline">
              {navGroup.group}:
            </span>
            {navGroup.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap rounded-md',
                    isActive
                      ? 'text-[#B94A50] dark:text-[#D98C91] font-semibold bg-[#FCECEB] dark:bg-[#252429]'
                      : 'text-[#777171] hover:text-[#292526] dark:text-[#A8A2A2] dark:hover:text-[#F6F5F3] hover:bg-[#FCECEB]/50 dark:hover:bg-[#252429]/50'
                  )}
                >
                  {item.title}
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-2 h-0.5 rounded-full bg-[#B94A50] dark:bg-[#D98C91]" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
