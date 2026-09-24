import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { siteConfig } from '@/config/site';

export function AdminHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="font-bold text-zinc-900 dark:text-zinc-50">
            {siteConfig.name} Admin
          </Link>
          <Badge variant="outline" className="text-xs">
            Foundation
          </Badge>
        </div>

        <Link
          href="/"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          &larr; Exit to Public Platform
        </Link>
      </div>
    </header>
  );
}
