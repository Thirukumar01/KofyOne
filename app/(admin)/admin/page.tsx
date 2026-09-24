import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { siteConfig } from '@/config/site';

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Admin Portal
          </h1>
          <p className="text-sm text-zinc-500">
            Phase 0 Foundation • Platform & Resource Management Architecture
          </p>
        </div>
        <Badge variant="outline">Admin Access Guarded</Badge>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {siteConfig.adminNav.map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>Managed entity module</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-500">
                Route: <code className="font-mono text-zinc-700 dark:text-zinc-300">{item.href}</code>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
