'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface FavoriteButtonProps {
  resourceId: string;
  resourceSlug: string;
  resourceName: string;
}

export function FavoriteButton({ resourceId, resourceSlug, resourceName }: FavoriteButtonProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let active = true;
    const client = createClient();

    void client.auth.getUser().then(async ({ data, error }) => {
      if (!active) return;
      const currentUserId = error ? null : data.user?.id ?? null;
      setUserId(currentUserId);
      if (currentUserId) {
        const { data: row } = await client
          .from('user_favorites')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('resource_id', resourceId)
          .maybeSingle();
        if (active) setFavorite(Boolean(row));
      }
      if (active) setPending(false);
    });

    return () => {
      active = false;
    };
  }, [resourceId]);

  async function toggleFavorite() {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(`/resources/${resourceSlug}`)}`);
      return;
    }

    setPending(true);
    const client = createClient();
    const result = favorite
      ? await client.from('user_favorites').delete().eq('user_id', userId).eq('resource_id', resourceId)
      : await client
          .from('user_favorites')
          .insert([{ user_id: userId, resource_id: resourceId }] as never[]);

    if (!result.error) setFavorite(!favorite);
    setPending(false);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={toggleFavorite}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={`${favorite ? 'Remove' : 'Save'} ${resourceName}`}
    >
      <Heart className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} />
      {favorite ? 'Saved' : 'Save resource'}
    </Button>
  );
}
