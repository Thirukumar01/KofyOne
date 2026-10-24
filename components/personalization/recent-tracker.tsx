'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function RecentTracker({ resourceId }: { resourceId: string }) {
  useEffect(() => {
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
  }, [resourceId]);

  return null;
}
