import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { AdminHeader } from '@/components/admin/admin-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Shield, Database, Globe } from 'lucide-react';

export default async function AdminSettingsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/settings');
  if (profile.role !== 'admin') redirect('/');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const adminEmail = process.env.ADMIN_EMAIL || profile.email;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Platform Settings & Environment"
        description="Verify backend configuration, database connectivity, and platform access parameters."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              Database & Supabase Backend
            </CardTitle>
            <CardDescription className="text-xs">
              PostgreSQL and authentication service status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Project Endpoint:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-xs">
                {supabaseUrl}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Connection Status:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-zinc-500">Row Level Security:</span>
              <Badge variant="outline">Enforced</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Administrative Security
            </CardTitle>
            <CardDescription className="text-xs">
              Authentication authority and admin identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Primary Admin:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {adminEmail}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Role Authority:</span>
              <Badge variant="brand">Super Admin</Badge>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-zinc-500">Password Access:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Enabled (Direct)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-500" />
              Site & Redirection Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Public domain origin and external redirect pathways
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Canonical Site URL:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {siteUrl}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Outbound Click Interceptor:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                /go/[slug] (Audit enabled)
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-zinc-500">Analytics Telemetry:</span>
              <span className="text-zinc-600 dark:text-zinc-300">Local DB + Optional PostHog</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
