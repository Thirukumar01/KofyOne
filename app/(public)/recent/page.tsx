import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

export default async function RecentPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/recent');

  let items: Array<{
    resource_id: string;
    resources: { name: string; slug: string; description: string } | null;
  }> = [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_recently_viewed')
      .select('resource_id, resources(name, slug, description)')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false });

    if (!error && data) {
      items = data as typeof items;
    }
  } catch {
    // Graceful fallback if database connection is pending
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Recently Viewed</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Resources, portals, and developer paths you recently explored.
      </p>

      {items.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Nothing viewed yet"
          description="Open any official resource and it will automatically appear here for quick revisit."
        />
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {items.map(
            ({ resource_id, resources }) =>
              resources && (
                <Link key={resource_id} href={`/resources/${resources.slug}`}>
                  <Card className="h-full hover:border-orange-400 transition-all hover:shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">{resources.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                        {resources.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
          )}
        </div>
      )}
    </div>
  );
}
