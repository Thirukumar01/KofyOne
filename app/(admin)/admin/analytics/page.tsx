import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/admin-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { MousePointerClick, Eye, TrendingUp, Compass } from 'lucide-react';

export const dynamic = 'force-dynamic';

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
      .limit(10);

    if (data) {
      topResources = data as unknown as typeof topResources;
      totalClicks = topResources.reduce((acc, r) => acc + (Number(r.click_count) || 0), 0);
      totalViews = topResources.reduce((acc, r) => acc + (Number(r.view_count) || 0), 0);
    }
  } catch {}

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Analytics & Telemetry"
        description="Monitor user discovery trends, outbound referral clicks, and resource popularity."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Outbound Clicks</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <MousePointerClick className="h-5 w-5 text-orange-500" />
              🔗 {totalClicks.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Catalog Impressions</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              👁️ {totalViews.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Conversion Rate</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              {totalViews > 0 ? `${((totalClicks / totalViews) * 100).toFixed(1)}%` : '—'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Redirect Routing</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Compass className="h-5 w-5 text-purple-500" />
              /go/[slug]
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-base">Top Performing Resources</CardTitle>
          <CardDescription className="text-xs">
            Resources generating the most student engagement, page views, and outbound clicks.
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
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300"
                    title="Total Page Views"
                  >
                    👁️ {Number(res.view_count || 0).toLocaleString()} views
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-300"
                    title="Total Outbound Clicks"
                  >
                    🔗 {Number(res.click_count || 0).toLocaleString()} clicks
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
