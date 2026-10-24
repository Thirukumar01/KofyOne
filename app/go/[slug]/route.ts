import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildTrackedUrl } from '@/lib/tracking/url-builder';
import type { TrackingConfig } from '@/types/tracking';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('resources')
    .select('id, official_url, contributor_id, platforms(slug, name), tracking_configs(*)')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  let targetUrl = (data as { official_url?: string } | null)?.official_url;
  let trackingConfig = (data as { tracking_configs?: TrackingConfig | null } | null)?.tracking_configs || null;
  let resourceId = (data as { id?: string } | null)?.id;
  let platformSlug = (data as { platforms?: { slug?: string } } | null)?.platforms?.slug;
  let contributorId = (data as { contributor_id?: string | null } | null)?.contributor_id;

  if (!targetUrl) {
    const { getPublishedResourceBySlug } = await import('@/lib/supabase/db');
    const fallback = await getPublishedResourceBySlug(slug);
    if (!fallback.data) {
      return NextResponse.redirect(new URL('/resources', _request.url));
    }
    targetUrl = fallback.data.official_url;
    trackingConfig = fallback.data.tracking_config ?? null;
    resourceId = fallback.data.id;
    platformSlug = fallback.data.platform?.slug;
    contributorId = fallback.data.contributor_id ?? null;
  }

  const destination = buildTrackedUrl(targetUrl, trackingConfig, undefined, {
    platformSlug,
    contributorId,
  });

  if (!destination.startsWith('https://') && !destination.startsWith('http://')) {
    return NextResponse.redirect(new URL('/resources', _request.url));
  }

  if (resourceId) {
    try {
      await (supabase as unknown as {
        rpc: (functionName: string, args: { resource_uuid: string }) => Promise<unknown>;
      }).rpc('increment_resource_click', { resource_uuid: resourceId });
    } catch {
      // Non-fatal if DB RPC is not available
    }
  }
  return NextResponse.redirect(destination, { status: 302 });
}
