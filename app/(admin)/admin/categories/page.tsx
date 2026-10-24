import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/admin-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FolderTree, ArrowUpRight } from 'lucide-react';

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
}

export default async function AdminCategoriesPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/categories');
  if (profile.role !== 'admin') redirect('/');

  let categories: CategoryRecord[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (data) categories = data as unknown as CategoryRecord[];
  } catch {}

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Categories & Learning Tracks"
        description="Organize Microsoft resources into curated discovery tracks and student domains."
      />

      <div className="flex items-center gap-2">
        <Badge variant="brand">{categories.length} Tracks Active</Badge>
        <Badge variant="outline">All Published</Badge>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Card key={cat.id} className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                  <FolderTree className="h-5 w-5" />
                </div>
                <Badge variant={cat.is_active ? 'brand' : 'outline'}>
                  {cat.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <CardTitle className="mt-3 text-lg">{cat.name}</CardTitle>
              <CardDescription className="text-xs">
                {cat.description || 'Curated category track'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <span className="font-mono text-zinc-500">/{cat.slug}</span>
                <Link
                  href={`/resources?category=${cat.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
                >
                  Explore <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
