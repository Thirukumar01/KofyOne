import Link from 'next/link';
import { getSiteBranding } from '@/lib/data/site-branding';
import { getActivePlatforms, getPublishedResources } from '@/lib/supabase/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResourceLogo } from '@/components/resources/resource-logo';
import { ArrowRight, Sparkles } from 'lucide-react';

export default async function HomePage() {
  const [branding, { data: platforms }, { data: resources }] = await Promise.all([
    getSiteBranding(),
    getActivePlatforms(),
    getPublishedResources(),
  ]);

  const featuredResources = resources.filter((r) => r.featured).slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-16">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center">
        <Badge variant="brand" className="mb-4 flex items-center gap-1.5 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Official Student Cloud Credits &amp; Developer Packs
        </Badge>

        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
          {branding.app_name}
        </h1>

        <p className="mt-4 text-xl font-medium text-[#B94A50] sm:text-2xl dark:text-[#D98C91]">
          {branding.tagline}
        </p>

        <p className="mt-4 max-w-2xl text-base text-[#777171] dark:text-[#A8A2A2]">
          {branding.description}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/resources">
            <Button size="lg" className="shadow-md bg-[#B94A50] hover:bg-[#A13D43] active:bg-[#8D3338] dark:hover:bg-[#C85A60] text-white dark:text-[#F6F5F3] flex items-center gap-2">
              Explore All Resources <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/categories">
            <Button variant="outline" size="lg">
              Browse by Category
            </Button>
          </Link>
        </div>
      </section>

      {/* Supported Ecosystems / Multi-Provider Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Supported Technology Ecosystems
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
            Discover official training, sandboxes, developer packs, and student credits across major technology platforms.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((platform) => {
            const count = resources.filter((r) => r.platform?.slug === platform.slug).length;
            return (
              <Link
                key={platform.slug}
                href={`/resources?provider=${platform.slug}`}
                className="group rounded-2xl border border-[#F0DCDD] bg-white p-5 shadow-sm hover:border-[#B94A50] hover:shadow-md transition-all dark:border-[#2E2C30] dark:bg-[#1E1E22] dark:hover:border-[#D98C91]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-[#292526] dark:text-[#F6F5F3] group-hover:text-[#B94A50] dark:group-hover:text-[#D98C91] transition-colors">
                    {platform.name}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {count} {count === 1 ? 'Resource' : 'Resources'}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-[#777171] dark:text-[#A8A2A2] line-clamp-2">
                  {platform.description || `Official ${platform.name} resources and learning tools.`}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Resources Section */}
      {featuredResources.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Featured Resources
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Hand-picked cloud platforms, student benefits, and learning paths.
              </p>
            </div>
            <Link
              href="/resources"
              className="text-xs font-semibold text-[#B94A50] hover:text-[#A13D43] dark:text-[#D98C91] flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredResources.map((resource) => (
              <Card
                key={resource.id}
                className="flex flex-col hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <ResourceLogo
                      slug={resource.slug}
                      name={resource.name}
                      logoUrl={resource.logo_url}
                      size={40}
                    />
                    <Badge variant="outline">{resource.platform?.name ?? 'Microsoft'}</Badge>
                  </div>
                  <CardTitle className="mt-3 text-lg font-bold">
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
                  </div>
                  <Link href={`/resources/${resource.slug}`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
