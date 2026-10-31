'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, ExternalLink, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { StudentEvent } from '@/lib/data/events-and-updates';

export function EventsManager({ initialEvents }: { initialEvents: StudentEvent[] }) {
  const [events, setEvents] = useState<StudentEvent[]>(initialEvents);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hackathon');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('Virtual / Global');
  const [officialUrl, setOfficialUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate.trim() || !description.trim()) {
      setFeedback({ message: 'Title, event date, and description are required.', isError: true });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          event_date: eventDate,
          location,
          official_url: officialUrl || null,
          description,
          is_published: isPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create event');
      }

      setEvents((prev) => [data.event, ...prev]);
      setFeedback({ message: `Event "${title}" created successfully!` });
      // Reset form
      setTitle('');
      setEventDate('');
      setOfficialUrl('');
      setDescription('');
      setShowAddForm(false);
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Error creating event',
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete event "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete event');
      }

      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      setFeedback({ message: `Event "${title}" was removed.` });
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Error deleting event',
        isError: true,
      });
    }
  };

  const handleTogglePublish = async (ev: StudentEvent) => {
    const nextStatus = !ev.is_published;
    try {
      const res = await fetch(`/api/admin/events/${ev.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to toggle publication');
      }

      setEvents((prev) =>
        prev.map((item) => (item.id === ev.id ? { ...item, is_published: nextStatus } : item))
      );
      setFeedback({ message: `Event "${ev.title}" is now ${nextStatus ? 'published' : 'draft'}.` });
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Error updating event status',
        isError: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="brand">{events.length} Total Events</Badge>
          <Badge variant="outline">
            {events.filter((e) => e.is_published).length} Published
          </Badge>
        </div>

        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#B94A50] hover:bg-[#A13D43] dark:hover:bg-[#C85A60] active:bg-[#8D3338] text-white dark:text-[#F6F5F3] text-xs flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {showAddForm ? 'Cancel' : 'Add New Event'}
        </Button>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
            feedback.isError
              ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Expandable Add Form */}
      {showAddForm && (
        <Card className="border-[#F0DCDD] bg-[#FCECEB]/50 dark:border-[#2E2C30] dark:bg-[#1E1E22]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Create New Student Event or Challenge
            </CardTitle>
            <CardDescription className="text-xs">
              Publish upcoming student hackathons, certification challenges, and learning workshops.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold block mb-1">Event Title *</label>
                  <Input
                    placeholder="e.g., Microsoft Imagine Cup 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Category / Type</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="Challenge">Challenge</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Conference">Conference</option>
                    <option value="Webinar">Webinar</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Event Date *</label>
                  <Input
                    placeholder="e.g., November 15, 2026"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Location / Format</label>
                  <Input
                    placeholder="e.g., Virtual / Global or Online Livestream"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Official Registration Link</label>
                <Input
                  type="url"
                  placeholder="https://imaginecup.microsoft.com/"
                  value={officialUrl}
                  onChange={(e) => setOfficialUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Description *</label>
                <textarea
                  rows={3}
                  placeholder="Detailed summary of the student event, eligibility, and prizes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="publish-check"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-[#B94A50] focus:ring-[#B94A50]"
                />
                <label htmlFor="publish-check" className="font-medium cursor-pointer">
                  Publish immediately to public /events directory
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="bg-[#B94A50] hover:bg-[#A13D43] dark:hover:bg-[#C85A60] text-white"
                >
                  {loading ? 'Creating...' : 'Save & Publish Event'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Events Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((ev) => (
          <Card key={ev.id || ev.slug} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="brand">{ev.category}</Badge>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {ev.event_date}
                </span>
              </div>
              <CardTitle className="mt-3 text-base">{ev.title}</CardTitle>
              <CardDescription className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {ev.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {ev.description}
              </p>

              {ev.official_url && (
                <div className="pt-2">
                  <a
                    href={ev.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#B94A50] hover:underline dark:text-[#D98C91] flex items-center gap-1 font-medium"
                  >
                    Official Link <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleTogglePublish(ev)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    ev.is_published
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {ev.is_published ? '● Published' : '○ Draft'}
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(ev.id, ev.title)}
                  className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                  title="Delete event"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

