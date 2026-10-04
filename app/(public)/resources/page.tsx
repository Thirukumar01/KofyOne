import Link from 'next/link';
import { Search } from 'lucide-react';
import { getActiveCategories, getPublishedResources } from '@/lib/supabase/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResourcesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim().toLowerCase() : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const sort = typeof params.sort === 'string' ? params.sort : 'featured';
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const limit = Math.min(24, Math.max(1, Number(params.limit ?? 12) || 12));
  const [{ data: resources, error: resourceError }, { data: categories, error: categoryError }] =
    await Promise.all([getPublishedResources(), getActiveCategories()]);
  const error = resourceError ?? categoryError;
  const filtered = resources.filter((resource) => {
    const matchesQuery = !query || `${resource.name} ${resource.description}`.toLowerCase().includes(query);
    const matchesCategory = !category || resource.categories.some((item) => item.slug === category);
    return matchesQuery && matchesCategory;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'newest') return b.created_at.localeCompare(a.created_at);
    if (sort === 'alphabetical') return a.name.localeCompare(b.name);
    return Number(b.featured) - Number(a.featured) || a.display_order - b.display_order;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / limit));
  const currentPage = Math.min(page, totalPages);
  const visible = sorted.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><h1 className="text-3xl font-bold tracking-tight">Explore resources</h1><Badge variant="brand">Microsoft</Badge></div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Find official learning, cloud, AI, developer, and productivity resources.
        </p>
      </div>
      <form className="mt-8 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative"><span className="sr-only">Search resources</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" /><Input name="q" defaultValue={query} placeholder="Search resources..." className="pl-9" /></label>
        <label><span className="sr-only">Category</span><select name="category" defaultValue={category} className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:w-48"><option value="">All categories</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
        <label><span className="sr-only">Sort resources</span><select name="sort" defaultValue={sort} className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:w-40"><option value="featured">Featured</option><option value="newest">Newest</option><option value="alphabetical">A–Z</option></select></label>
        <Button type="submit">Apply filters</Button>
      </form>
      {error ? <ErrorState className="mt-8" title="Resources are unavailable" message={error.message} /> : visible.length === 0 ? <EmptyState className="mt-8" title={query || category ? 'No matching resources' : 'No resources published yet'} description="Try a different search or check back soon." /> : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((resource) => <Card key={resource.id} className="flex flex-col"><CardHeader><div className="flex items-center justify-between gap-2"><Badge variant="outline">{resource.platform?.name ?? 'Microsoft'}</Badge>{resource.featured && <Badge variant="success">Featured</Badge>}</div><CardTitle className="mt-3">{resource.name}</CardTitle><CardDescription>{resource.description}</CardDescription></CardHeader><CardContent className="mt-auto flex items-center justify-between gap-3"><div className="flex flex-wrap gap-1">{resource.categories.slice(0, 2).map((item) => <Badge key={item.id} variant="brand">{item.name}</Badge>)}</div><Link href={`/resources/${resource.slug}`}><Button size="sm">View</Button></Link></CardContent></Card>)}
          </div>
          <nav aria-label="Resource pages" className="mt-8 flex items-center justify-between text-sm"><span>Page {currentPage} of {totalPages}</span><div className="flex gap-2">{currentPage > 1 && <Link href={`?q=${encodeURIComponent(query)}&category=${category}&page=${currentPage - 1}`}><Button variant="outline" size="sm">Previous</Button></Link>}{currentPage < totalPages && <Link href={`?q=${encodeURIComponent(query)}&category=${category}&page=${currentPage + 1}`}><Button variant="outline" size="sm">Next</Button></Link>}</div></nav>
        </>
      )}
      </div>
  );
}
