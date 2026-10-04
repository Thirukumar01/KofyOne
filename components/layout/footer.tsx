import Link from 'next/link';
import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {siteConfig.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {siteConfig.tagline}
            </p>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Independent resource discovery for the Microsoft ecosystem
          </p>
          <div className="flex gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/admin" className="hover:underline">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
