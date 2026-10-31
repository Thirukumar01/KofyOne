import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/admin-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Compass, ExternalLink } from 'lucide-react';

interface PlatformRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  website_url: string;
  domain: string;
  is_active: boolean;
}

export default async function AdminPlatformsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/platforms');
  if (profile.role !== 'admin') redirect('/');

  let platforms: PlatformRecord[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('platforms').select('*');
    if (data) platforms = data as unknown as PlatformRecord[];
  } catch {}

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Platforms & Ecosystems"
        description="Official partner platforms, verified domains, and referral campaign configurations."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((platform) => (
          <Card key={platform.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCECEB] text-[#B94A50] dark:bg-[#252429] dark:text-[#D98C91]">
                  <Compass className="h-5 w-5" />
                </div>
                <Badge variant={platform.is_active ? 'brand' : 'outline'}>
                  {platform.is_active ? 'Verified' : 'Inactive'}
                </Badge>
              </div>
              <CardTitle className="mt-3 text-lg">{platform.name}</CardTitle>
              <CardDescription className="text-xs">
                {platform.description || 'Verified Microsoft platform ecosystem'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">
                <div className="flex justify-between">
                  <span>Domain:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {platform.domain}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Official URL:</span>
                  <a
                    href={platform.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[#B94A50] hover:underline dark:text-[#D98C91]"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
