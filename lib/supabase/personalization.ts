import { createClient } from './server';

export interface ToggleFavoriteResult {
  success: boolean;
  favorited: boolean;
  resource_id?: string;
  error?: string;
}

/**
 * Atomically toggles a resource bookmark/favorite for the current authenticated user.
 * Accepts either a resource UUID or a slug.
 */
export async function toggleResourceFavorite(identifier: string): Promise<ToggleFavoriteResult> {
  if (!identifier || typeof identifier !== 'string') {
    return { success: false, favorited: false, error: 'Identifier is required' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, favorited: false, error: 'Unauthorized: Authentication required' };
  }

  // 1. Try atomic SECURITY DEFINER RPC
  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as unknown as (
      fn: string,
      args: { p_identifier: string }
    ) => Promise<{ data: { favorited?: boolean; resource_id?: string; error?: string } | null; error: unknown }>)(
      'toggle_resource_favorite',
      { p_identifier: identifier }
    );

    if (!rpcError && rpcData && typeof rpcData.favorited === 'boolean') {
      return {
        success: true,
        favorited: rpcData.favorited,
        resource_id: rpcData.resource_id,
      };
    }
  } catch {
    // Fall back to direct table manipulation
  }

  // 2. Direct table fallback: resolve UUID first if identifier is a slug
  try {
    let resolvedId = identifier;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    if (!isUuid) {
      const { data: res } = await (supabase.from('resources') as unknown as {
        select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: { id: string } | null }> } };
      })
        .select('id')
        .eq('slug', identifier)
        .maybeSingle();

      if (res?.id) {
        resolvedId = res.id;
      } else {
        return { success: false, favorited: false, error: 'Resource not found' };
      }
    }

    const { data: existing } = await (supabase.from('user_favorites') as unknown as {
      select: (cols: string) => { eq: (col: string, val: string) => { eq: (c2: string, v2: string) => { maybeSingle: () => Promise<{ data: { id: string } | null }> } } };
    })
      .select('id')
      .eq('user_id', user.id)
      .eq('resource_id', resolvedId)
      .maybeSingle();

    if (existing) {
      await (supabase.from('user_favorites') as unknown as {
        delete: () => { eq: (col: string, val: string) => { eq: (c2: string, v2: string) => Promise<unknown> } };
      })
        .delete()
        .eq('user_id', user.id)
        .eq('resource_id', resolvedId);

      return { success: true, favorited: false, resource_id: resolvedId };
    } else {
      await (supabase.from('user_favorites') as unknown as {
        insert: (row: Record<string, unknown>) => Promise<unknown>;
      }).insert({
        user_id: user.id,
        resource_id: resolvedId,
      });

      return { success: true, favorited: true, resource_id: resolvedId };
    }
  } catch (err) {
    return {
      success: false,
      favorited: false,
      error: err instanceof Error ? err.message : 'Failed to toggle favorite',
    };
  }
}

/**
 * Records a resource view in the user's recently viewed history.
 */
export async function recordResourceViewHistory(identifier: string): Promise<void> {
  if (!identifier) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // 1. Try atomic RPC
  try {
    const { error } = await (supabase.rpc as unknown as (
      fn: string,
      args: { p_identifier: string }
    ) => Promise<{ error: unknown }>)(
      'record_resource_view_history',
      { p_identifier: identifier }
    );
    if (!error) return;
  } catch {
    // Fall back to direct table update
  }

  // 2. Direct table fallback
  try {
    let resolvedId = identifier;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    if (!isUuid) {
      const { data: res } = await (supabase.from('resources') as unknown as {
        select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: { id: string } | null }> } };
      })
        .select('id')
        .eq('slug', identifier)
        .maybeSingle();

      if (res?.id) resolvedId = res.id;
      else return;
    }

    await (supabase.from('user_recently_viewed') as unknown as {
      upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => Promise<unknown>;
    }).upsert(
      {
        user_id: user.id,
        resource_id: resolvedId,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,resource_id' }
    );
  } catch {
    // Non-fatal
  }
}

