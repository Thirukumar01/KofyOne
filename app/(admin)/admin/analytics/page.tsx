import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/admin-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { MousePointerClick, Eye, TrendingUp, Compass } from 'lucide-react';

export default async function AdminAnalyticsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/analytics');
  if (profile.role !== 'admin') redirect('/');

  let totalClicks = 0;
  let totalViews = 0;
  let topResources: { name: string; slug: string; click_count: number; view_count: number }[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('resources')
      .select('name, slug, click_count, view_count')
      .order('click_count', { ascending: false })
      .limit(5);

    if (data) {
      topResources = data as unknown as typeof topResources;
      totalClicks = topResources.reduce((acc, r) => acc + (r.click_count || 0), 0);
      totalViews = topResources.reduce((acc, r) => acc + (r.view_count || 0), 0);
    }
  } catch {}

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Analytics & Telemetry"
        description="Monitor user discovery trends, outbound referral clicks, and resource popularity."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Outbound Clicks</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-orange-500" />
              {totalClicks}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Catalog Impressions</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              {totalViews}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Conversion Rate</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              {totalViews > 0 ? `${((totalClicks / totalViews) * 100).toFixed(1)}%` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Redirect Routing</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Compass className="h-5 w-5 text-purple-500" />
              /go/[slug]
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Performing Resources</CardTitle>
          <CardDescription className="text-xs">
            Resources generating the most student engagement and clicks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {topResources.map((res, i) => (
              <div key={res.slug} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-400">#{i + 1}</span>
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{res.name}</div>
                    <div className="text-xs text-zinc-500">/{res.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="text-zinc-500">{res.view_count || 0} views</span>
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">
                    {res.click_count || 0} clicks
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
