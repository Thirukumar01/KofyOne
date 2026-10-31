'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Platform } from '@/types/platform';
import {
  Compass,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

export interface AdminPlatformsClientProps {
  initialPlatforms: Platform[];
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AdminPlatformsClient({ initialPlatforms }: AdminPlatformsClientProps) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [search, setSearch] = useState('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [customSlugEdited, setCustomSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [domain, setDomain] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete State
  const [deletingPlatform, setDeletingPlatform] = useState<Platform | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification alerts
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const filtered = platforms.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.domain && p.domain.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  function handleOpenCreate() {
    setEditingPlatform(null);
    setName('');
    setSlug('');
    setCustomSlugEdited(false);
    setDescription('');
    setWebsiteUrl('');
    setDomain('');
    setIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  }

  function handleOpenEdit(platform: Platform) {
    setEditingPlatform(platform);
    setName(platform.name);
    setSlug(platform.slug);
    setCustomSlugEdited(true);
    setDescription(platform.description || '');
    setWebsiteUrl(platform.website_url);
    setDomain(platform.domain);
    setIsActive(platform.is_active);
    setFormError('');
    setIsModalOpen(true);
  }

  function handleNameChange(val: string) {
    setName(val);
    if (!customSlugEdited) {
      setSlug(slugify(val));
    }
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const trimmedName = name.trim();
    const finalSlug = (slug || slugify(trimmedName)).trim();
    const finalWebsiteUrl = websiteUrl.trim();
    let finalDomain = domain.trim();

    if (!trimmedName) {
      setFormError('Platform name is required.');
      setIsSubmitting(false);
      return;
    }

    if (!finalWebsiteUrl || (!finalWebsiteUrl.startsWith('http://') && !finalWebsiteUrl.startsWith('https://'))) {
      setFormError('A valid website URL starting with http:// or https:// is required.');
      setIsSubmitting(false);
      return;
    }

    if (!finalDomain) {
      try {
        finalDomain = new URL(finalWebsiteUrl).hostname.replace(/^www\./, '');
      } catch {
        finalDomain = `${finalSlug}.com`;
      }
    }

    const payload = {
      ...(editingPlatform ? { id: editingPlatform.id, original_slug: editingPlatform.slug } : {}),
      name: trimmedName,
      slug: finalSlug,
      description: description.trim() || null,
      website_url: finalWebsiteUrl,
      domain: finalDomain,
      is_active: isActive,
    };

    try {
      const url = editingPlatform
        ? `/api/admin/platforms/${editingPlatform.id}`
        : '/api/admin/platforms';
      const method = editingPlatform ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save platform.');
      }

      if (editingPlatform) {
        setPlatforms((prev) =>
          prev.map((p) => (p.id === editingPlatform.id ? { ...p, ...payload, id: editingPlatform.id } : p))
        );
        setActionSuccess(`Platform "${trimmedName}" updated successfully.`);
      } else {
        const savedItem: Platform = data.platform || {
          id: 'plat-' + Date.now(),
          ...payload,
          logo_url: null,
          display_order: platforms.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setPlatforms((prev) => [...prev, savedItem]);
        setActionSuccess(`Platform "${trimmedName}" added successfully.`);
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error saving platform.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(platform: Platform) {
    const newStatus = !platform.is_active;
    try {
      const res = await fetch(`/api/admin/platforms/${platform.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (res.ok) {
        setPlatforms((prev) =>
          prev.map((p) => (p.id === platform.id ? { ...p, is_active: newStatus } : p))
        );
        setActionSuccess(`Platform "${platform.name}" is now ${newStatus ? 'Active' : 'Disabled'}.`);
        router.refresh();
      }
    } catch {
      setActionError('Could not update platform status.');
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingPlatform) return;
    setIsDeleting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/admin/platforms/${deletingPlatform.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingPlatform.id, slug: deletingPlatform.slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete platform.');
      }

      setPlatforms((prev) => prev.filter((p) => p.id !== deletingPlatform.id));
      setActionSuccess(`Platform "${deletingPlatform.name}" permanently deleted.`);
      setDeletingPlatform(null);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Action alerts */}
      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <p>{actionError}</p>
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p>{actionSuccess}</p>
        </div>
      )}

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="brand">{platforms.length} Platforms</Badge>
          <Badge variant="outline">{platforms.filter((p) => p.is_active).length} Active</Badge>
          <Badge variant="outline">{platforms.filter((p) => !p.is_active).length} Inactive</Badge>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 shadow-sm bg-[#B94A50] hover:bg-[#A13D43] dark:hover:bg-[#C85A60] active:bg-[#8D3338] text-white"
        >
          <Plus className="h-4 w-4" /> Add New Platform
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search platforms by name, slug, domain..."
          className="pl-9"
        />
      </div>

      {/* Grid of Platforms */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500">
            No platforms found matching your search.
          </div>
        ) : (
          filtered.map((platform) => (
            <Card key={platform.id} className="relative overflow-hidden flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCECEB] text-[#B94A50] dark:bg-[#252429] dark:text-[#D98C91]">
                    <Compass className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(platform)}
                    title="Click to toggle status"
                    className="cursor-pointer"
                  >
                    <Badge variant={platform.is_active ? 'brand' : 'outline'}>
                      {platform.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </button>
                </div>
                <CardTitle className="mt-3 text-lg text-zinc-900 dark:text-zinc-50">{platform.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {platform.description || 'Verified platform ecosystem'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">
                  <div className="flex justify-between">
                    <span>Slug:</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">/{platform.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Domain:</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">{platform.domain}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Official URL:</span>
                    <a
                      href={platform.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#B94A50] hover:underline dark:text-[#D98C91]"
                    >
                      Visit <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(platform)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingPlatform(platform)}
                    className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Platform Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {editingPlatform ? 'Edit Platform' : 'Add New Platform'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Platform Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Microsoft, AWS, Google Cloud, Vercel"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Slug *
                </label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setCustomSlugEdited(true);
                  }}
                  placeholder="e.g. microsoft, aws, google-cloud, vercel"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Website URL *
                </label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => {
                    setWebsiteUrl(e.target.value);
                    if (!domain) {
                      try {
                        const parsed = new URL(e.target.value);
                        setDomain(parsed.hostname.replace(/^www\./, ''));
                      } catch {}
                    }
                  }}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Domain Name
                </label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value.trim())}
                  placeholder="e.g. example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent p-2 text-xs text-zinc-900 dark:text-zinc-100"
                  placeholder="Brief description of the platform ecosystem..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="platform-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-zinc-300 text-[#B94A50] focus:ring-[#B94A50]"
                />
                <label htmlFor="platform-active" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Active (visible across search and filters)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#B94A50] hover:bg-[#A13D43] text-white"
                >
                  {isSubmitting ? 'Saving...' : editingPlatform ? 'Save Changes' : 'Create Platform'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deleting Platform */}
      {deletingPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Confirm Platform Deletion</h3>
                <p className="text-xs text-zinc-500">This action permanently deletes this platform.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Are you sure you want to permanently delete platform <strong className="text-zinc-900 dark:text-zinc-100">&ldquo;{deletingPlatform.name}&rdquo;</strong>? It will be permanently tombstoned and will never reappear.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingPlatform(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Platform'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
