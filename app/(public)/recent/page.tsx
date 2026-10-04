import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

export default async function RecentPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/recent');
  const supabase = await createClient();
  const { data, error } = await supabase.from('user_recently_viewed').select('resource_id, resources(name, slug, description)').eq('user_id', user.id).order('viewed_at', { ascending: false });
  if (error) throw new Error(`Recently viewed resources could not be loaded: ${error.message}`);
  const items = (data ?? []) as Array<{ resource_id: string; resources: { name: string; slug: string; description: string } | null }>;
  return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8"><h1 className="text-3xl font-bold">Recently viewed</h1>{items.length === 0 ? <EmptyState className="mt-8" title="Nothing viewed yet" description="Open a resource and it will appear here." /> : <div className="mt-8 grid gap-5 sm:grid-cols-2">{items.map(({ resource_id, resources }) => resources && <Link key={resource_id} href={`/resources/${resources.slug}`}><Card className="h-full hover:border-orange-400"><CardHeader><CardTitle>{resources.name}</CardTitle></CardHeader><CardContent><p className="text-sm text-zinc-600 dark:text-zinc-400">{resources.description}</p></CardContent></Card></Link>)}</div>}</div>;
}
