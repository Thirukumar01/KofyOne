import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { Badge } from '@/components/ui/badge';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {siteConfig.name}
            </span>
            <Badge variant="brand" className="hidden sm:inline-flex">
              Microsoft Ecosystem
            </Badge>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {siteConfig.mainNav.slice(0, 4).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Sign In
          </Link>
          <Link
            href="/resources"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Explore Resources
          </Link>
        </div>
      </div>
    </header>
  );
}
