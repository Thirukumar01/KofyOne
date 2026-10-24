import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { siteConfig } from '@/config/site';
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
} from 'lucide-react';

const MODULE_META: Record<
  string,
  { icon: typeof Layers; description: string; badge?: string }
> = {
  '/admin': { icon: Sparkles, description: 'Overview metrics and system health', badge: 'Active' },
  '/admin/resources': { icon: Layers, description: 'Manage catalog learning assets and links', badge: '10 Items' },
  '/admin/platforms': { icon: Compass, description: 'Integrated platforms and partner domains', badge: '1 Platform' },
  '/admin/categories': { icon: FolderTree, description: 'Curated topics and learning track categories', badge: '5 Tracks' },
  '/admin/updates': { icon: Bell, description: 'Announcements and platform releases' },
  '/admin/events': { icon: Calendar, description: 'Hackathons, webinars, and Microsoft workshops' },
  '/admin/users': { icon: Users, description: 'User roles, profiles, and access control' },
  '/admin/analytics': { icon: BarChart3, description: 'Redirect telemetry, click counts, and search' },
  '/admin/audit-logs': { icon: ShieldCheck, description: 'Security audit trail and authorization logs' },
  '/admin/settings': { icon: Settings, description: 'Environment variables and system configurations' },
};

export default async function AdminDashboardPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin');
  if (profile.role !== 'admin') redirect('/');

  let resourceCount = 10;
  let categoryCount = 5;
  let platformCount = 1;

  try {
    const supabase = await createClient();
    const [resCount, catCount, platCount] = await Promise.all([
      supabase.from('resources').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('platforms').select('*', { count: 'exact', head: true }),
    ]);
    if (resCount.count !== null) resourceCount = resCount.count;
    if (catCount.count !== null) categoryCount = catCount.count;
    if (platCount.count !== null) platformCount = platCount.count;
  } catch {}

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <AdminHeader
        title="Admin Portal Dashboard"
        description="Comprehensive management portal for KofyOne catalog content, users, and platform configuration."
      />

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Catalog Resources</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{resourceCount}</span>
            <Badge variant="brand">Live</Badge>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Learning Tracks</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{categoryCount}</span>
            <Badge variant="outline">Curated</Badge>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Active Platforms</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{platformCount}</span>
            <Badge variant="outline">Verified</Badge>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">System Status</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Operational
            </span>
            <Badge variant="outline">Admin</Badge>
          </div>
        </div>
      </div>

      {/* Main Module Grid */}
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          Management Modules
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {siteConfig.adminNav
            .filter((item) => item.href !== '/admin')
            .map((item) => {
              const meta = MODULE_META[item.href] || {
                icon: Layers,
                description: 'Managed entity module',
              };
              const Icon = meta.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group block focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-2xl"
                >
                  <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-md dark:hover:border-orange-500/40 cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 group-hover:scale-110 transition-transform">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {meta.badge && (
                            <Badge variant="outline" className="text-xs">
                              {meta.badge}
                            </Badge>
                          )}
                          <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                        </div>
                      </div>
                      <CardTitle className="text-base mt-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {meta.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-zinc-500 font-mono">
                        {item.href}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}
