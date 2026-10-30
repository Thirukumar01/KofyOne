import Link from 'next/link';
import { getPublishedEvents } from '@/lib/data/events-and-updates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, ExternalLink, Sparkles, Filter } from 'lucide-react';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PublicEventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categoryFilter = typeof params.category === 'string' ? params.category.trim().toLowerCase() : 'all';

  const allEvents = await getPublishedEvents();

  const filteredEvents = allEvents.filter((ev) => {
    if (categoryFilter === 'all') return true;
    return ev.category.toLowerCase() === categoryFilter;
  });

  const categories = Array.from(new Set(allEvents.map((e) => e.category)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Student Events & Challenges
          </h1>
          <Badge variant="brand" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Live Hackathons & Workshops
          </Badge>
          <span className="text-xs text-zinc-500 font-medium">({filteredEvents.length} events)</span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Discover verified global student hackathons, certification challenge sprints, campus developer workshops, and community showcases.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold text-zinc-500 mr-1 flex items-center gap-1">
          <Filter className="h-3 w-3" /> Type:
        </span>
        <Link
          href="/events"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            categoryFilter === 'all'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          All ({allEvents.length})
        </Link>
        {categories.map((cat) => {
          const count = allEvents.filter((e) => e.category === cat).length;
          const isSelected = categoryFilter === cat.toLowerCase();
          return (
            <Link
              key={cat}
              href={`/events?category=${encodeURIComponent(cat.toLowerCase())}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {cat} ({count})
            </Link>
          );
        })}
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-800">
          <p className="text-sm">No events found matching this category filter.</p>
          <Link href="/events" className="mt-3 inline-block">
            <Button variant="outline" size="sm">
              View All Events
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((ev) => (
            <Card
              key={ev.id || ev.slug}
              className="group flex flex-col justify-between border-zinc-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800"
            >
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="brand">{ev.category}</Badge>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-orange-500" />
                    {ev.event_date}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-lg font-bold group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {ev.title}
                  </CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1 mt-1 text-zinc-500">
                    <MapPin className="h-3 w-3 text-zinc-400" />
                    {ev.location}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {ev.description}
                </p>

                {ev.official_url && (
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                    <a
                      href={ev.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-block"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs flex items-center justify-center gap-1.5 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/40"
                      >
                        Register / Official Info
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

