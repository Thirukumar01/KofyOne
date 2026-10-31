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
        // Check if resource is favorited by UUID or by checking favorites API
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
          if (isUuid) {
            const { data: row } = await client
              .from('user_favorites')
              .select('id')
              .eq('user_id', currentUserId)
              .eq('resource_id', resourceId)
              .maybeSingle();
            if (active && row) {
              setFavorite(true);
            }
          } else {
            // Check via API or resolve slug
            const res = await fetch('/api/favorites');
            if (res.ok) {
              const favData = await res.json();
              if (active && favData.favorites) {
                const isFav = favData.favorites.some(
                  (f: { resource_id?: string; resources?: { slug?: string } | null }) =>
                    f.resource_id === resourceId || f.resources?.slug === resourceSlug
                );
                setFavorite(Boolean(isFav));
              }
            }
          }
        } catch {
          // Non-fatal
        }
      }
      if (active) setPending(false);
    });

    return () => {
      active = false;
    };
  }, [resourceId, resourceSlug]);

  async function toggleFavorite() {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(`/resources/${resourceSlug}`)}`);
      return;
    }

    setPending(true);
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, resourceSlug }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFavorite(Boolean(data.favorited));
        router.refresh();
      } else {
        // Direct table toggle fallback if needed
        const client = createClient();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
        if (isUuid) {
          if (favorite) {
            await client.from('user_favorites').delete().eq('user_id', userId).eq('resource_id', resourceId);
            setFavorite(false);
          } else {
            await client.from('user_favorites').insert([{ user_id: userId, resource_id: resourceId }] as never[]);
            setFavorite(true);
          }
          router.refresh();
        }
      }
    } catch {
      // Non-fatal
    } finally {
      setPending(false);
    }
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
