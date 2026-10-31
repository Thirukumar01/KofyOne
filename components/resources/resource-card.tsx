'use client';

import Link from 'next/link';
import { ExternalLink, Eye, Link2 } from 'lucide-react';
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
        'group flex flex-col justify-between border-[#F0DCDD] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-[#2E2C30] dark:hover:border-[#B94A50]/40 rounded-xl bg-white dark:bg-[#1E1D21]',
        activeDensity === 'compact' ? 'p-4 gap-2' : 'p-5 gap-3'
      )}
    >
      <CardHeader className="space-y-3 p-0 pb-2">
        <div className="flex items-start justify-between gap-3">
          <ResourceLogo
            slug={resource.slug}
            name={resource.name}
            logoUrl={resource.logo_url}
            size={36}
            containerClassName="shadow-xs rounded-lg"
          />
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="rounded-md border border-[#F0DCDD] bg-[#FCECEB] px-2 py-0.5 text-[11px] font-semibold text-[#292526] dark:border-[#2E2C30] dark:bg-[#252429] dark:text-[#F6F5F3]">
              {resource.platform?.name ?? 'Microsoft'}
            </span>
            {resource.featured && <Badge variant="success" className="text-[10px]">Featured</Badge>}
            <FavoriteButton
              resourceId={resource.id}
              resourceSlug={resource.slug}
              resourceName={resource.name}
            />
          </div>
        </div>

        <div>
          <CardTitle className="text-base font-semibold tracking-tight text-[#292526] dark:text-[#F6F5F3] group-hover:text-[#B94A50] dark:group-hover:text-[#D98C91] transition-colors">
            <Link href={`/resources/${resource.slug}`}>{resource.name}</Link>
          </CardTitle>
          <CardDescription className="line-clamp-2 text-xs mt-1 text-[#777171] dark:text-[#A8A2A2] leading-relaxed">
            {resource.description}
          </CardDescription>
        </div>

        {/* Live Views & Clicks Counters */}
        <div className="flex items-center gap-2 pt-1 text-[11px]">
          <span
            className="inline-flex items-center gap-1 rounded-md bg-[#FCECEB] dark:bg-[#252429] px-2 py-0.5 font-medium text-[#777171] dark:text-[#A8A2A2]"
            title="Resource page impressions"
          >
            <span className="sr-only">👁️</span>
            <Eye className="h-3 w-3 text-[#777171] dark:text-[#A8A2A2]" />
            <span>{views.toLocaleString()} views</span>
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-md bg-[rgba(185,74,80,0.12)] dark:bg-[rgba(217,140,145,0.15)] px-2 py-0.5 font-semibold text-[#B94A50] dark:text-[#D98C91]"
            title="Outbound link referrals"
          >
            <span className="sr-only">🔗</span>
            <Link2 className="h-3 w-3 text-[#B94A50] dark:text-[#D98C91]" />
            <span>{clicks.toLocaleString()} clicks</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="mt-auto flex items-center justify-between gap-3 p-0 pt-3 border-t border-[#F0DCDD] dark:border-[#2E2C30]">
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
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
              Details
            </Button>
          </Link>
          <a
            href={`/go/${resource.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              try {
                fetch(`/api/resources/${resource.slug}/track`, { method: 'POST', keepalive: true });
              } catch {
                // non-blocking
              }
            }}
            className="inline-flex h-7 items-center justify-center rounded-lg bg-[#B94A50] hover:bg-[#A13D43] active:bg-[#8D3338] dark:hover:bg-[#C85A60] px-2.5 text-xs font-semibold text-white dark:text-[#F6F5F3] shadow-xs transition-colors"
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
