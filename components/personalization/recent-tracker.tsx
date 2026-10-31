'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function RecentTracker({
  resourceId,
  resourceSlug,
}: {
  resourceId: string;
  resourceSlug?: string;
}) {
  useEffect(() => {
    // 1. Trigger view counter increment API
    if (resourceSlug) {
      try {
        void fetch(`/api/resources/${resourceSlug}/view`, {
          method: 'POST',
          keepalive: true,
        });
      } catch {
        // Non-fatal
      }
    }

    // 2. Record authenticated recently viewed item in Supabase
    const client = createClient();
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;

      const identifier = resourceSlug || resourceId;

      // Try atomic RPC
      try {
        const { error } = await (client.rpc as unknown as (
          fn: string,
          args: { p_identifier: string }
        ) => Promise<{ error: unknown }>)(
          'record_resource_view_history',
          { p_identifier: identifier }
        );
        if (!error) return;
      } catch {
        // Fall back to direct table upsert
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
      if (isUuid) {
        try {
          void client
            .from('user_recently_viewed')
            .upsert(
              [{ user_id: data.user.id, resource_id: resourceId, viewed_at: new Date().toISOString() }] as never[],
              { onConflict: 'user_id,resource_id' }
            );
        } catch {
          // Non-fatal
        }
      }
    });
  }, [resourceId, resourceSlug]);

  return null;
}
