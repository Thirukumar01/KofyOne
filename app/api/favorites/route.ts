import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toggleResourceFavorite } from '@/lib/supabase/personalization';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select('resource_id, created_at, resources(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, favorites: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resourceSlug = typeof body.resourceSlug === 'string' ? body.resourceSlug.trim() : '';
    const resourceId = typeof body.resourceId === 'string' ? body.resourceId.trim() : '';

    const identifier = resourceSlug || resourceId;
    if (!identifier) {
      return NextResponse.json(
        { error: 'Resource identifier (slug or ID) is required' },
        { status: 400 }
      );
    }

    const result = await toggleResourceFavorite(identifier);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to toggle favorite' }, { status: 400 });
    }

    // On-demand revalidation of dynamic cache
    try {
      revalidatePath('/favorites');
      revalidatePath('/dashboard');
      revalidatePath('/resources');
      if (resourceSlug) {
        revalidatePath(`/resources/${resourceSlug}`);
      }
    } catch {
      // Revalidation non-fatal
    }

    return NextResponse.json({
      success: true,
      favorited: result.favorited,
      resource_id: result.resource_id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

