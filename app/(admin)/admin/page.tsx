import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminNavGroups } from '@/config/site';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/admin-header';
import {
  Layers,
  FolderTree,
  Compass,
  Bell,
  Calendar,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
  ArrowUpRight,
  Sparkles,
  Palette,
  FileText,
  Eye,
  MousePointerClick,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const MODULE_ICONS: Record<string, typeof Layers> = {
  '/admin': Sparkles,
  '/admin/analytics': BarChart3,
  '/admin/resources': Layers,
  '/admin/platforms': Compass,
  '/admin/categories': FolderTree,
  '/admin/branding': Palette,
  '/admin/legal': FileText,
  '/admin/updates': Bell,
  '/admin/events': Calendar,
  '/admin/users': Users,
  '/admin/audit-logs': ShieldCheck,
  '/admin/settings': Settings,
};

export default async function AdminDashboardPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin');
  if (profile.role !== 'admin') redirect('/');

  let resourceCount = 10;
  let categoryCount = 5;
  let platformCount = 1;
  let totalViews = 0;
  let totalClicks = 0;

  try {
    const supabase = await createClient();
    const [resCount, catCount, platCount, resStats] = await Promise.all([
      supabase.from('resources').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('platforms').select('*', { count: 'exact', head: true }),
      supabase.from('resources').select('view_count, click_count'),
    ]);
    if (resCount.count !== null) resourceCount = resCount.count;
    if (catCount.count !== null) categoryCount = catCount.count;
    if (platCount.count !== null) platformCount = platCount.count;
    if (resStats.data) {
      const statsRows = resStats.data as unknown as Array<{ view_count?: number; click_count?: number }>;
      totalViews = statsRows.reduce((acc, r) => acc + (Number(r.view_count) || 0), 0);
      totalClicks = statsRows.reduce((acc, r) => acc + (Number(r.click_count) || 0), 0);
    }
  } catch {}

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <AdminHeader
        title="Admin Portal Dashboard"
        description="Comprehensive management portal for KofyOne catalog content, users, and platform configuration."
      />

      {/* Top Metrics Row with Views & Clicks Badges */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Catalog Resources</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{resourceCount}</span>
            <Badge variant="brand">Live</Badge>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total Views</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-blue-500" />
              👁️ {totalViews.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-400">Impressions</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total Clicks</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tracking-tight text-[#B94A50] dark:text-[#D98C91] flex items-center gap-1.5">
              <MousePointerClick className="h-4 w-4 text-[#B94A50] dark:text-[#D98C91]" />
              🔗 {totalClicks.toLocaleString()}
            </span>
            <span className="text-[10px] text-zinc-400">Referrals</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Platforms & Tracks</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {platformCount} / {categoryCount}
            </span>
            <Badge variant="outline">Verified</Badge>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">System Status</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </span>
            <Badge variant="outline">Admin</Badge>
          </div>
        </div>
      </div>

      {/* Main Module Grid Organized by Sections */}
      <div className="space-y-6">
        {adminNavGroups.map((group) => (
          <div key={group.group} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                {group.group}
              </h2>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => {
                const Icon = MODULE_ICONS[item.href] || Layers;
                return (
                  <Link key={item.href} href={item.href} className="group">
                    <Card className="h-full border-zinc-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B94A50]/50 hover:shadow-md dark:border-zinc-800 dark:hover:border-[#D98C91]/50">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCECEB] text-[#B94A50] group-hover:bg-[#B94A50] group-hover:text-white dark:bg-[#252429] dark:text-[#D98C91] dark:group-hover:bg-[#B94A50] dark:group-hover:text-white transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-[#B94A50] dark:group-hover:text-[#D98C91] transition-colors" />
                      </CardHeader>
                      <CardContent>
                        <CardTitle className="text-base font-semibold group-hover:text-[#B94A50] dark:group-hover:text-[#D98C91] transition-colors">
                          {item.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Manage and configure {item.title.toLowerCase()} settings and resources.
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
