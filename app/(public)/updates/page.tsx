import { getPublishedUpdates } from '@/lib/data/events-and-updates';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar, Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PublicUpdatesPage() {
  const updates = await getPublishedUpdates();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Platform & Ecosystem Updates
          </h1>
          <Badge variant="brand" className="flex items-center gap-1">
            <Bell className="h-3 w-3" /> Live Changelog
          </Badge>
          <span className="text-xs text-zinc-500 font-medium">({updates.length} updates)</span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Track official announcements, new student credit offerings, multi-provider catalogue additions, and KofyOne feature releases.
        </p>
      </div>

      {/* Timeline List */}
      <div className="relative border-l-2 border-[#B94A50]/30 dark:border-[#D98C91]/30 ml-3 pl-6 space-y-8">
        {updates.map((update) => (
          <div key={update.id || update.slug} className="relative group">
            {/* Timeline bullet dot */}
            <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#B94A50] dark:border-[#151517] ring-4 ring-[rgba(185,74,80,0.15)] dark:ring-[rgba(217,140,145,0.20)]" />

            <Card className="border-zinc-200 transition-all duration-200 hover:shadow-md dark:border-zinc-800">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={update.badge === 'Major' ? 'brand' : 'outline'} className="text-xs">
                      {update.badge}
                    </Badge>
                    <CardTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {update.title}
                    </CardTitle>
                  </div>
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                    {update.published_date}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {update.description}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

