import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedResourceBySlug } from '@/lib/supabase/db';
import { buildTrackedUrl } from '@/lib/tracking/url-builder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/shared/error-state';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getPublishedResourceBySlug(slug);
  if (!data) return { title: 'Resource not found', robots: { index: false, follow: false } };
  return { title: data.name, description: data.description, alternates: { canonical: `${siteConfig.url}/resources/${data.slug}` } };
}

export default async function ResourceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: resource, error } = await getPublishedResourceBySlug(slug);
  if (error) return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState title="Resource unavailable" message={error.message} /></div>;
  if (!resource) notFound();
  const destination = buildTrackedUrl(resource.official_url, resource.tracking_config);
  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"><Link href="/resources" className="text-sm text-orange-700 hover:underline">← Back to resources</Link><Card className="mt-6"><CardHeader><div className="flex flex-wrap gap-2">{resource.categories.map((category) => <Badge key={category.id} variant="brand">{category.name}</Badge>)}</div><CardTitle className="mt-4 text-3xl">{resource.name}</CardTitle><p className="text-base text-zinc-600 dark:text-zinc-400">{resource.description}</p></CardHeader><CardContent className="flex flex-wrap items-center gap-3"><a href={destination} target="_blank" rel="noreferrer"><Button size="lg">Open official resource</Button></a><Badge variant="outline">{resource.platform?.name ?? 'Microsoft'}</Badge></CardContent></Card></div>;
}
