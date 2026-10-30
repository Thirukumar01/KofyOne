'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResourceLogo } from '@/components/resources/resource-logo';
import { FavoriteButton } from '@/components/resources/favorite-button';
import { cn } from '@/lib/utils';
import type { ResourceWithRelations } from '@/types/resource';

export function ResourceCard({
  resource,
  layout,
  density = 'comfortable',
}: {
  resource: ResourceWithRelations;
  layout?: 'comfortable' | 'compact';
  density?: 'comfortable' | 'compact';
}) {
  const activeDensity = layout || density;
  const views = Number(resource.view_count || 0);
  const clicks = Number(resource.click_count || 0);

  return (
    <Card
      className={cn(
        'group flex flex-col justify-between border-zinc-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:hover:border-zinc-700',
        activeDensity === 'compact' ? 'gap-1 p-3' : ''
      )}
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <ResourceLogo
            slug={resource.slug}
            name={resource.name}
            logoUrl={resource.logo_url}
            size={42}
            containerClassName="shadow-xs"
          />
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {resource.platform?.name ?? 'Microsoft'}
            </span>
            {resource.featured && <Badge variant="success">Featured</Badge>}
            <FavoriteButton
              resourceId={resource.id}
              resourceSlug={resource.slug}
              resourceName={resource.name}
            />
          </div>
        </div>

        <div>
          <CardTitle className="text-base sm:text-lg font-bold group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
            <Link href={`/resources/${resource.slug}`}>{resource.name}</Link>
          </CardTitle>
          <CardDescription className="line-clamp-2 text-xs mt-1">
            {resource.description}
          </CardDescription>
        </div>

        {/* Live Views & Clicks Badges */}
        <div className="flex items-center gap-2 pt-1 text-[11px]">
          <span
            className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 font-medium text-zinc-600 dark:text-zinc-300"
            title="Resource page impressions"
          >
            👁️ {views.toLocaleString()} views
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-md bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 font-semibold text-orange-700 dark:text-orange-300"
            title="Outbound link referrals"
          >
            🔗 {clicks.toLocaleString()} clicks
          </span>
        </div>
      </CardHeader>

      <CardContent className="mt-auto flex items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="flex flex-wrap gap-1">
          {resource.categories.slice(0, 2).map((item) => (
            <Badge key={item.id || item.slug} variant="brand" className="text-[10px]">
              {item.name}
            </Badge>
          ))}
          {resource.subcategory && (
            <Badge variant="outline" className="text-[10px]">
              {resource.subcategory}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link href={`/resources/${resource.slug}`}>
            <Button variant="outline" size="sm" className="h-8 text-xs px-2.5">
              Details
            </Button>
          </Link>
          <a
            href={`/go/${resource.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-orange-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-orange-700 transition-colors"
            title="Open official destination"
          >
            <span>Open</span>
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
