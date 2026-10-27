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
    void client.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      void client
        .from('user_recently_viewed')
        .upsert(
          [{ user_id: data.user.id, resource_id: resourceId, viewed_at: new Date().toISOString() }] as never[],
          { onConflict: 'user_id,resource_id' }
        );
    });
  }, [resourceId, resourceSlug]);

  return null;
}
