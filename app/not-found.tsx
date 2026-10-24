import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
        404 error
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
        Resource not found
      </h1>
      <p className="mt-4 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        The page or resource you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/">
          <Button variant="primary">Return Home</Button>
        </Link>
        <Link href="/resources">
          <Button variant="outline">Browse Resources</Button>
        </Link>
      </div>
    </div>
  );
}
