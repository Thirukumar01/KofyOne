import Link from 'next/link';
import { getActivePlatforms, getPublishedResources } from '@/lib/supabase/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/shared/error-state';

export const metadata = { title: 'Platforms', description: 'Browse ecosystems supported by KofyOne.' };

export default async function PlatformsPage() {
  const [{ data: platforms, error: platformError }, { data: resources, error: resourceError }] =
    await Promise.all([getActivePlatforms(), getPublishedResources()]);
  const error = platforms.length === 0 ? (platformError ?? resourceError) : null;
  if (error && platforms.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 flex flex-col items-center gap-4">
        <ErrorState title="Platforms are unavailable" message={error.message} />
        <Link href="/platforms">
          <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-700">
            Retry
          </button>
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">Platforms</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">KofyOne currently focuses on official Microsoft destinations.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {platforms.map((platform) => (
          <Link key={platform.id} href={`/platforms/${platform.slug}`}>
            <Card className="h-full transition-colors hover:border-[#B94A50] dark:hover:border-[#D98C91]">
              <CardHeader>
                <CardTitle>{platform.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{platform.description}</p>
                <p className="mt-4 text-sm font-medium text-[#B94A50] dark:text-[#D98C91]">
                  {resources.filter((resource) => resource.platform_id === platform.id).length} resources
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
