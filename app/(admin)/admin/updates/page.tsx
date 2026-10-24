import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { AdminHeader } from '@/components/admin/admin-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export default async function AdminUpdatesPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/updates');
  if (profile.role !== 'admin') redirect('/');

  const updates = [
    {
      id: '1',
      title: 'Azure AI Foundry Integration',
      description: 'Added complete learning path for Azure AI model catalog, inference endpoints, and SDKs.',
      date: 'October 2026',
      badge: 'Major',
    },
    {
      id: '2',
      title: 'Student Azure Free Account Direct Pathways',
      description: 'Streamlined authentication and free credit claiming flows without credit card requirements.',
      date: 'September 2026',
      badge: 'Feature',
    },
    {
      id: '3',
      title: 'KofyOne V1 Production Release',
      description: 'Full App Router catalog discovery, Supabase Auth/Postgres RLS, and admin portal.',
      date: 'September 2026',
      badge: 'Release',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Ecosystem Updates & Announcements"
        description="Publish and manage release notes, Microsoft ecosystem news, and platform updates."
      />

      <div className="flex items-center gap-2">
        <Badge variant="brand">{updates.length} Published Updates</Badge>
      </div>

      <div className="space-y-4">
        {updates.map((update) => (
          <Card key={update.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{update.title}</CardTitle>
                    <span className="text-xs text-zinc-400">{update.date}</span>
                  </div>
                </div>
                <Badge variant="outline">{update.badge}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {update.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
