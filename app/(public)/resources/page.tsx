import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { INITIAL_PLATFORMS } from '@/config/platforms';

export default function ResourcesPage() {
  const activePlatform = INITIAL_PLATFORMS[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Resources Explorer
          </h1>
          <Badge variant="brand">{activePlatform.name}</Badge>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Discover, search, and explore curated official resources. Resources will be loaded from Supabase in Phase 1.
        </p>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Resource Engine Ready</CardTitle>
            <CardDescription>Phase 0 Foundation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Database models, categories, tracking parameter injectors, and PostgreSQL Full-Text Search services have been initialized.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
