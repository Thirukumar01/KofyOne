import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedResourceBySlug } from '@/lib/supabase/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/shared/error-state';
import { FavoriteButton } from '@/components/resources/favorite-button';
import { RecentTracker } from '@/components/personalization/recent-tracker';
import { ResourceLogo } from '@/components/resources/resource-logo';
import { siteConfig } from '@/config/site';
import { ArrowLeft, ExternalLink } from 'lucide-react';

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
  if (!resource && error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 flex flex-col items-center gap-4">
        <ErrorState title="Resource unavailable" message={error.message} />
        <Link href={`/resources/${slug}`}>
          <Button variant="outline" size="sm">Retry</Button>
        </Link>
      </div>
    );
  }
  if (!resource) notFound();

  const views = Number(resource.view_count || 0);
  const clicks = Number(resource.click_count || 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
      <RecentTracker resourceId={resource.id} resourceSlug={resource.slug} />

      <Link
        href="/resources"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B94A50] hover:text-[#A13D43] dark:text-[#D98C91] dark:hover:text-[#C85A60] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to catalog
      </Link>

      <Card className="border-zinc-200 shadow-md dark:border-zinc-800">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {resource.categories.map((category) => (
                <Badge key={category.id} variant="brand">
                  {category.name}
                </Badge>
              ))}
              {resource.subcategory && (
                <Badge variant="outline">{resource.subcategory}</Badge>
              )}
            </div>

            {/* Formatted Views & Clicks Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                title="Resource page impressions"
              >
                👁️ {views.toLocaleString()} views
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-[#FCECEB] dark:bg-[#252429] px-2.5 py-0.5 text-xs font-semibold text-[#B94A50] dark:text-[#D98C91]"
                title="Outbound link referrals"
              >
                🔗 {clicks.toLocaleString()} clicks
              </span>
              <Badge variant="outline">{resource.platform?.name ?? 'Microsoft'}</Badge>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-2">
            <ResourceLogo
              slug={resource.slug}
              name={resource.name}
              logoUrl={resource.logo_url}
              size={56}
              containerClassName="rounded-2xl p-2 shadow-md shrink-0"
            />
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
                {resource.name}
              </CardTitle>
              <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {resource.description}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <a
            href={`/go/${resource.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button size="lg" className="shadow-sm gap-2">
              <span>Open Official Resource</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <FavoriteButton
            resourceId={resource.id}
            resourceSlug={resource.slug}
            resourceName={resource.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
