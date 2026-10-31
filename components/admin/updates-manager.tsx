'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sparkles, Calendar, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { PlatformUpdate } from '@/lib/data/events-and-updates';

export function UpdatesManager({ initialUpdates }: { initialUpdates: PlatformUpdate[] }) {
  const [updates, setUpdates] = useState<PlatformUpdate[]>(initialUpdates);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [badge, setBadge] = useState('Feature');
  const [publishedDate, setPublishedDate] = useState('October 2026');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFeedback({ message: 'Title and description are required.', isError: true });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          badge,
          published_date: publishedDate,
          description,
          is_published: isPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create platform update');
      }

      setUpdates((prev) => [data.update, ...prev]);
      setFeedback({ message: `Update "${title}" published successfully!` });
      // Reset form
      setTitle('');
      setDescription('');
      setShowAddForm(false);
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Error creating update',
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete update "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/updates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete update');
      }

      setUpdates((prev) => prev.filter((up) => up.id !== id));
      setFeedback({ message: `Update "${title}" was removed.` });
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Error deleting update',
        isError: true,
      });
    }
  };

  const handleTogglePublish = async (up: PlatformUpdate) => {
    const nextStatus = !up.is_published;
    try {
      const res = await fetch(`/api/admin/updates/${up.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update publication status');
      }

      setUpdates((prev) =>
        prev.map((item) => (item.id === up.id ? { ...item, is_published: nextStatus } : item))
      );
      setFeedback({ message: `Update "${up.title}" is now ${nextStatus ? 'published' : 'draft'}.` });
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Error updating status',
        isError: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="brand">{updates.length} Total Updates</Badge>
          <Badge variant="outline">
            {updates.filter((u) => u.is_published).length} Published
          </Badge>
        </div>

        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#B94A50] hover:bg-[#A13D43] dark:hover:bg-[#C85A60] active:bg-[#8D3338] text-white dark:text-[#F6F5F3] text-xs flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {showAddForm ? 'Cancel' : 'Add Platform Update'}
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
              Create New Platform Update or Changelog
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold block mb-1">Update Title *</label>
                  <Input
                    placeholder="e.g., Multi-Provider Student Hub Launch"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Badge Tag</label>
                  <select
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  >
                    <option value="Major">Major</option>
                    <option value="Feature">Feature</option>
                    <option value="Release">Release</option>
                    <option value="Announcement">Announcement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Published Month / Date *</label>
                <Input
                  placeholder="e.g., October 2026"
                  value={publishedDate}
                  onChange={(e) => setPublishedDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Description *</label>
                <textarea
                  rows={3}
                  placeholder="Summary of the changes, new features, or student offers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="publish-update-check"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-[#B94A50] focus:ring-[#B94A50]"
                />
                <label htmlFor="publish-update-check" className="font-medium cursor-pointer">
                  Publish immediately to public /updates changelog
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
                  {loading ? 'Publishing...' : 'Save & Publish Update'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Updates List */}
      <div className="space-y-4">
        {updates.map((update) => (
          <Card key={update.id || update.slug}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(185,74,80,0.12)] text-[#B94A50] dark:bg-[rgba(217,140,145,0.15)] dark:text-[#D98C91]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{update.title}</CardTitle>
                    <span className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {update.published_date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={update.badge === 'Major' ? 'brand' : 'outline'}>
                    {update.badge}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(update)}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      update.is_published
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {update.is_published ? '● Published' : '○ Draft'}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(update.id, update.title)}
                    className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Delete update"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {update.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

