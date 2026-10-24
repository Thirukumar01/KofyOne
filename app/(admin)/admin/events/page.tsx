import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { AdminHeader } from '@/components/admin/admin-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';

export default async function AdminEventsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login?next=/admin/events');
  if (profile.role !== 'admin') redirect('/');

  const events = [
    {
      id: '1',
      title: 'Microsoft Imagine Cup 2026',
      date: 'November 15, 2026',
      location: 'Virtual / Global',
      category: 'Hackathon',
      description: 'The premier global student competition for building innovative AI and cloud technology solutions.',
    },
    {
      id: '2',
      title: 'Azure Cloud Developer Bootcamp',
      date: 'October 28, 2026',
      location: 'Online Livestream',
      category: 'Workshop',
      description: 'Hands-on intensive workshop focusing on deploying containerized microservices and AI endpoints on Azure.',
    },
    {
      id: '3',
      title: 'GitHub Universe Watch Party & AI Showcase',
      date: 'November 2, 2026',
      location: 'Community Hubs & Online',
      category: 'Conference',
      description: 'Community gathering exploring GitHub Copilot, Actions, and modern developer workflow tools.',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminHeader
        title="Events & Community Workshops"
        description="Schedule and manage Microsoft student hackathons, certification sprints, and developer conferences."
      />

      <div className="flex items-center gap-2">
        <Badge variant="brand">{events.length} Upcoming Events</Badge>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((ev) => (
          <Card key={ev.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="brand">{ev.category}</Badge>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {ev.date}
                </span>
              </div>
              <CardTitle className="mt-3 text-base">{ev.title}</CardTitle>
              <CardDescription className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {ev.location}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {ev.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
