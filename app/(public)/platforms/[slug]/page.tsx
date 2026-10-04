import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getActivePlatforms, getPublishedResources } from '@/lib/supabase/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PlatformPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ data: platforms }, { data: resources }] = await Promise.all([getActivePlatforms(), getPublishedResources()]);
  const platform = platforms.find((item) => item.slug === slug);
  if (!platform) notFound();
  const platformResources = resources.filter((resource) => resource.platform_id === platform.id);
  return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8"><Link href="/platforms" className="text-sm text-orange-700 hover:underline">← All platforms</Link><h1 className="mt-6 text-3xl font-bold">{platform.name}</h1><p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">{platform.description}</p><div className="mt-8 grid gap-5 sm:grid-cols-2">{platformResources.map((resource) => <Link key={resource.id} href={`/resources/${resource.slug}`}><Card className="h-full hover:border-orange-400"><CardHeader><CardTitle>{resource.name}</CardTitle></CardHeader><CardContent><p className="text-sm text-zinc-600 dark:text-zinc-400">{resource.description}</p></CardContent></Card></Link>)}</div></div>;
}
