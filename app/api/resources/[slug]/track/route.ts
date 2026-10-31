import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Atomically increment click count
  try {
    // Try p_identifier
    const { error: rpcErr } = await (supabase.rpc as unknown as (
      fn: string,
      args: { p_identifier: string }
    ) => Promise<{ error: unknown }>)(
      'increment_resource_click',
      { p_identifier: slug }
    );

    if (rpcErr) {
      // Fallback signature
      await (supabase.rpc as unknown as (
        fn: string,
        args: { resource_slug: string }
      ) => Promise<{ error: unknown }>)(
        'increment_resource_click',
        { resource_slug: slug }
      );
    }
  } catch {
    // Non-fatal
  }

  // 2. Automatically record in recently viewed if user is authenticated
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await (supabase.rpc as unknown as (
        fn: string,
        args: { p_identifier: string }
      ) => Promise<unknown>)(
        'record_resource_view_history',
        { p_identifier: slug }
      );
    }
  } catch {
    // Non-fatal
  }

  // Revalidate paths
  try {
    revalidatePath('/resources');
    revalidatePath(`/resources/${slug}`);
    revalidatePath('/recent');
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ success: true, slug });
}

