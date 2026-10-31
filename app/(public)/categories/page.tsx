import Link from 'next/link';
import { getActiveCategories, getPublishedResources } from '@/lib/supabase/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/shared/error-state';

export const metadata = { title: 'Categories', description: 'Browse KofyOne resource categories.' };

export default async function CategoriesPage() {
  const [{ data: categories, error: categoryError }, { data: resources, error: resourceError }] =
    await Promise.all([getActiveCategories(), getPublishedResources()]);
  const error = categories.length === 0 ? (categoryError ?? resourceError) : null;
  if (error && categories.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 flex flex-col items-center gap-4">
        <ErrorState title="Categories are unavailable" message={error.message} />
        <Link href="/categories">
          <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-700">
            Retry
          </button>
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">Browse categories</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Start with the area that matches what you want to build next.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link key={category.id} href={`/resources?category=${category.slug}`}>
            <Card className="h-full transition-colors hover:border-[#B94A50] dark:hover:border-[#D98C91]">
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{category.description}</p>
                <p className="mt-4 text-sm font-medium text-[#B94A50] dark:text-[#D98C91]">
                  {resources.filter((resource) => resource.categories.some((item) => item.id === category.id)).length} resources
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
