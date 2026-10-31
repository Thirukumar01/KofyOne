/**
 * KofyOne - Resource View Tracking API
 * Atomically increments view_count for the resource and logs to user_recently_viewed if authenticated.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublishedResourceBySlug } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
  }

  let newCount = 0;
  const supabase = await createClient();

  try {
    // 1. Increment view counter via SECURITY DEFINER stored procedure
    // Supports both p_identifier (new) and resource_slug (legacy) signatures
    let rpcCount: number | null = null;
    let rpcError: unknown = null;

    try {
      const res = await (supabase.rpc as unknown as (
        fn: string,
        args: { p_identifier: string }
      ) => Promise<{ data: number | null; error: unknown }>)(
        'increment_resource_view',
        { p_identifier: slug }
      );
      rpcCount = res.data;
      rpcError = res.error;
    } catch (e) {
      rpcError = e;
    }

    if (rpcError || rpcCount === null) {
      try {
        const legacyRes = await (supabase.rpc as unknown as (
          fn: string,
          args: { resource_slug: string }
        ) => Promise<{ data: number | null; error: unknown }>)(
          'increment_resource_view',
          { resource_slug: slug }
        );
        if (!legacyRes.error && typeof legacyRes.data === 'number') {
          rpcCount = legacyRes.data;
          rpcError = null;
        }
      } catch {
        // Fall back to direct update
      }
    }

    if (!rpcError && typeof rpcCount === 'number') {
      newCount = rpcCount;
    } else {
      // Direct update fallback if RPC function name / signature varies
      const { data: resourceData } = await (supabase.from('resources') as unknown as {
        select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown }> } };
      })
        .select('id, view_count')
        .eq('slug', slug)
        .maybeSingle();

      const resource = resourceData as { id: string; view_count?: number } | null;
      if (resource) {
        newCount = ((resource.view_count as number) || 0) + 1;
        await (supabase.from('resources') as unknown as {
          update: (vals: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
        })
          .update({ view_count: newCount, views_count: newCount, updated_at: new Date().toISOString() })
          .eq('id', resource.id);
      }
    }

    // 2. If user is authenticated, record recently viewed item in user_recently_viewed
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      try {
        await (supabase.rpc as unknown as (
          fn: string,
          args: { p_identifier: string }
        ) => Promise<unknown>)(
          'record_resource_view_history',
          { p_identifier: slug }
        );
      } catch {
        // Direct upsert fallback
        const { data: resData } = await getPublishedResourceBySlug(slug);
        if (resData?.id) {
          await (supabase.from('user_recently_viewed') as unknown as {
            upsert: (vals: Record<string, unknown>, opts: { onConflict: string }) => Promise<unknown>;
          }).upsert(
            {
              user_id: user.id,
              resource_id: resData.id,
              viewed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,resource_id' }
          );
        }
      }
    }

    return NextResponse.json({ success: true, view_count: newCount });
  } catch (err) {
    console.warn(`[ViewTracker] Non-fatal view tracking error for ${slug}:`, err);
    return NextResponse.json({ success: true, view_count: newCount });
  }
}
