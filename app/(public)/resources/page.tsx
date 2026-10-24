import Link from 'next/link';
import { Search, ExternalLink, Filter } from 'lucide-react';
import { getActiveCategories, getActivePlatforms, getPublishedResources } from '@/lib/supabase/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { ResourceLogo } from '@/components/resources/resource-logo';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResourcesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim().toLowerCase() : '';
  const provider = typeof params.provider === 'string' ? params.provider.trim().toLowerCase() : '';
  const category = typeof params.category === 'string' ? params.category.trim().toLowerCase() : '';
  const sort = typeof params.sort === 'string' ? params.sort : 'featured';
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const limit = Math.min(24, Math.max(1, Number(params.limit ?? 12) || 12));

  const [
    { data: resources, error: resourceError },
    { data: categories, error: categoryError },
    { data: platforms },
  ] = await Promise.all([
    getPublishedResources(),
    getActiveCategories(),
    getActivePlatforms(),
  ]);

  const error = resourceError ?? categoryError;

  // Filter resources: must be strictly published, and match query, provider, category
  const filtered = resources.filter((resource) => {
    // 1. Strict draft safety: never show unpublished resources
    if (!resource.is_published) return false;

    // 2. Provider filter
    if (provider && provider !== 'all') {
      const pSlug = resource.platform?.slug?.toLowerCase() || '';
      const pName = resource.platform?.name?.toLowerCase() || '';
      if (pSlug !== provider && pName !== provider) return false;
    }

    // 3. Category filter
    if (category && category !== 'all') {
      const matchCat = resource.categories.some((item) => item.slug?.toLowerCase() === category);
      if (!matchCat) return false;
    }

    // 4. Search query filter
    if (query) {
      const name = resource.name?.toLowerCase() || '';
      const desc = resource.description?.toLowerCase() || '';
      const sub = resource.subcategory?.toLowerCase() || '';
      const tags = resource.tags?.map((t) => t.toLowerCase()).join(' ') || '';
      const metaTags = Array.isArray(resource.metadata?.tags)
        ? (resource.metadata.tags as string[]).join(' ').toLowerCase()
        : '';

      const haystack = `${name} ${desc} ${sub} ${tags} ${metaTags}`;
      if (!haystack.includes(query)) return false;
    }

    return true;
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
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Explore Resources
          </h1>
          <Badge variant="brand">Multi-Provider</Badge>
          <span className="text-xs text-zinc-500 font-medium">({filtered.length} available)</span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Discover student offers, free cloud sandboxes, developer tools, AI platforms, and certifications across Microsoft, AWS, Google, and top tech ecosystems.
        </p>
      </div>

      {/* Provider Quick Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-zinc-500 mr-1 flex items-center gap-1">
          <Filter className="h-3 w-3" /> Provider:
        </span>
        <Link
          href={`/resources?${new URLSearchParams({
            ...(query ? { q: query } : {}),
            ...(category ? { category } : {}),
            sort,
          }).toString()}`}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !provider || provider === 'all'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          All Providers ({resources.length})
        </Link>

        {platforms.map((p) => {
          const count = resources.filter((r) => r.platform?.slug === p.slug).length;
          const isSelected = provider === p.slug;
          return (
            <Link
              key={p.slug}
              href={`/resources?${new URLSearchParams({
                provider: p.slug,
                ...(query ? { q: query } : {}),
                ...(category ? { category } : {}),
                sort,
              }).toString()}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                isSelected
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {p.name} {count > 0 && `(${count})`}
            </Link>
          );
        })}
      </div>

      {/* Search & Filter Form */}
      <form className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        {/* Hidden Provider so selecting category preserves provider */}
        {provider && <input type="hidden" name="provider" value={provider} />}

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search by title, description, or tags..."
            className="pl-9"
          />
        </div>

        <div>
          <select
            name="category"
            defaultValue={category}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 sm:w-44"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 sm:w-36"
          >
            <option value="featured">Featured First</option>
            <option value="newest">Newest</option>
            <option value="alphabetical">A–Z</option>
          </select>
        </div>

        <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
          Filter
        </Button>

        {(query || category || provider) && (
          <Link href="/resources">
            <Button type="button" variant="outline" className="w-full text-xs">
              Clear
            </Button>
          </Link>
        )}
      </form>

      {/* Results View */}
      {error ? (
        <ErrorState
          className="mt-8"
          title="Resources are unavailable"
          message={error.message}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={query || category || provider ? 'No matching resources found' : 'No resources published yet'}
          description="Try selecting a different provider, resetting filters, or searching for other keywords."
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((resource) => (
              <Card
                key={resource.id}
                className="flex flex-col hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all group"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <ResourceLogo
                      slug={resource.slug}
                      name={resource.name}
                      logoUrl={resource.logo_url}
                      size={40}
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {resource.platform?.name ?? 'Microsoft'}
                      </span>
                      {resource.featured && <Badge variant="success">Featured</Badge>}
                    </div>
                  </div>
                  <CardTitle className="mt-3 text-lg font-bold group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {resource.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {resource.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-3 pt-0">
                  <div className="flex flex-wrap gap-1">
                    {resource.categories.slice(0, 2).map((item) => (
                      <Badge key={item.id || item.slug} variant="brand" className="text-[10px]">
                        {item.name}
                      </Badge>
                    ))}
                    {resource.subcategory && (
                      <Badge variant="outline" className="text-[10px]">
                        {resource.subcategory}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link href={`/resources/${resource.slug}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs px-2.5">
                        Details
                      </Button>
                    </Link>
                    <a
                      href={`/go/${resource.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-orange-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
                      title="Open official destination"
                    >
                      Open <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <nav aria-label="Resource pages" className="flex items-center justify-between text-sm pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-xs text-zinc-500">
              Page {currentPage} of {totalPages} ({filtered.length} total)
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`?${new URLSearchParams({
                    ...(query ? { q: query } : {}),
                    ...(provider ? { provider } : {}),
                    ...(category ? { category } : {}),
                    sort,
                    page: String(currentPage - 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`?${new URLSearchParams({
                    ...(query ? { q: query } : {}),
                    ...(provider ? { provider } : {}),
                    ...(category ? { category } : {}),
                    sort,
                    page: String(currentPage + 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
