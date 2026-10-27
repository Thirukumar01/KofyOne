/**
 * KofyOne - Outbound Link Click Interceptor & Redirect Gateway
 * Resolves destination URL, dynamically attaches contributor attribution,
 * atomically increments click_count via RPC, and issues HTTP 302 redirect.
 */

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
    .select('id, slug, official_url, contributor_id, platforms(slug, name), tracking_configs(*)')
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

  // Atomically increment click_count in PostgreSQL
  // Await the RPC call with a fast 1200ms timeout so serverless runtimes complete the write
  // before returning the 302 redirect, without blocking user navigation on network delay.
  try {
    const incrementPromise = (async () => {
      // 1. Try slug-based RPC increment
      try {
        const { error: slugRpcErr } = await (supabase.rpc as unknown as (
          fn: string,
          args: { resource_slug: string }
        ) => Promise<{ error: unknown }>)('increment_resource_click', {
          resource_slug: slug,
        });
        if (!slugRpcErr) return;
      } catch {
        // Fallback to UUID-based RPC
      }

      // 2. Try UUID-based RPC increment if resourceId exists
      if (resourceId) {
        try {
          await (supabase.rpc as unknown as (
            fn: string,
            args: { resource_uuid: string }
          ) => Promise<unknown>)('increment_resource_click', {
            resource_uuid: resourceId,
          });
          return;
        } catch {
          // Fallback to direct update
        }

        // 3. Direct SQL column increment fallback
        try {
          await (supabase.from('resources') as unknown as {
            update: (vals: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
          })
            .update({ click_count: 1, updated_at: new Date().toISOString() })
            .eq('id', resourceId);
        } catch {
          // Non-fatal
        }
      }
    })();

    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
    await Promise.race([incrementPromise, timeoutPromise]);
  } catch {
    // Non-fatal if DB RPC fails
  }

  return NextResponse.redirect(destination, { status: 302 });
}
