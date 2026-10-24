'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResourceLogo } from '@/components/resources/resource-logo';
import type { ResourceWithRelations } from '@/types/resource';
import type { Platform } from '@/types/platform';
import type { Category } from '@/types/category';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  MousePointerClick,
  Sparkles,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';

export interface AdminResourcesClientProps {
  initialResources: ResourceWithRelations[];
  platforms: Platform[];
  categories: Category[];
}

export function AdminResourcesClient({
  initialResources,
  platforms,
  categories,
}: AdminResourcesClientProps) {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceWithRelations[]>(initialResources);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft'>('all');

  // Delete Dialog state
  const [deletingResource, setDeletingResource] = useState<ResourceWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Preview Modal state
  const [previewingResource, setPreviewingResource] = useState<ResourceWithRelations | null>(null);

  // Filtered resources
  const filtered = resources.filter((res) => {
    // 1. Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = res.name.toLowerCase().includes(q);
      const matchDesc = res.description.toLowerCase().includes(q);
      const matchTags = res.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchTags) return false;
    }

    // 2. Platform filter
    if (selectedPlatform !== 'all') {
      if (res.platform?.slug !== selectedPlatform) return false;
    }

    // 3. Category filter
    if (selectedCategory !== 'all') {
      const hasCat = res.categories.some((c) => c.slug === selectedCategory);
      if (!hasCat) return false;
    }

    // 4. Status filter
    if (selectedStatus === 'published' && !res.is_published) return false;
    if (selectedStatus === 'draft' && res.is_published) return false;

    return true;
  });

  async function handleDeleteConfirm() {
    if (!deletingResource) return;
    setIsDeleting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/admin/resources/${deletingResource.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete resource.');
      }

      setResources((prev) => prev.filter((r) => r.id !== deletingResource.id));
      setActionSuccess(`Resource "${deletingResource.name}" deleted successfully.`);
      setDeletingResource(null);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleTogglePublish(resItem: ResourceWithRelations) {
    const newStatus = !resItem.is_published;
    try {
      const res = await fetch(`/api/admin/resources/${resItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: newStatus }),
      });
      if (res.ok) {
        setResources((prev) =>
          prev.map((r) => (r.id === resItem.id ? { ...r, is_published: newStatus } : r))
        );
        setActionSuccess(`Resource "${resItem.name}" is now ${newStatus ? 'Published' : 'Draft'}.`);
        router.refresh();
      }
    } catch {
      setActionError('Could not toggle published status.');
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

      {/* Top Controls: Stats & Add Resource Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{resources.length} Total Resources</Badge>
          <Badge variant="outline">{resources.filter((r) => r.featured).length} Featured</Badge>
          <Badge variant="outline">{resources.filter((r) => r.is_published).length} Published</Badge>
          <Badge variant="outline">{resources.filter((r) => !r.is_published).length} Drafts</Badge>
          {resources.some((r) => r.id.startsWith('custom-')) && (
            <Badge variant="success" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {resources.filter((r) => r.id.startsWith('custom-')).length} Custom Added
            </Badge>
          )}
        </div>

        <Link href="/admin/resources/new">
          <Button className="flex items-center gap-1.5 shadow-sm bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4" /> Add New Resource
          </Button>
        </Link>
      </div>

      {/* Filters Toolbar */}
      <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[1fr_auto_auto_auto]">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, description, or tags..."
            className="pl-9"
          />
        </div>

        {/* Provider Filter */}
        <div>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 sm:w-36"
          >
            <option value="all">All Providers</option>
            {platforms.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 sm:w-36"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'published' | 'draft')}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 sm:w-32"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Resources Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Stats</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    No resources matched your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((resource) => {
                  const isCustom = resource.id.startsWith('custom-');
                  return (
                    <tr
                      key={resource.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Name & Description */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ResourceLogo
                            slug={resource.slug}
                            name={resource.name}
                            logoUrl={resource.logo_url}
                            size={34}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {resource.name}
                              </span>
                              {resource.featured && <Badge variant="brand" className="text-[10px]">Featured</Badge>}
                              {isCustom && (
                                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                                  Admin Added
                                </span>
                              )}
                            </div>
                            <p className="line-clamp-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                              {resource.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Provider */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {resource.platform?.name ?? 'Microsoft'}
                        </span>
                        {resource.contributor_id && (
                          <span
                            className="block text-[10px] text-orange-600 dark:text-orange-400 font-mono mt-0.5"
                            title="Contributor ID"
                          >
                            ID: {resource.contributor_id}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {resource.categories?.map((c) => (
                            <Badge key={c.id || c.slug} variant="brand" className="text-xs">
                              {c.name}
                            </Badge>
                          ))}
                          {resource.subcategory && (
                            <Badge variant="outline" className="text-xs">
                              {resource.subcategory}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(resource)}
                          title="Click to toggle Published / Draft status"
                          className="cursor-pointer group"
                        >
                          {resource.is_published ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 group-hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                              Draft
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Stats */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span className="inline-flex items-center gap-1" title="Views">
                            <Eye className="h-3.5 w-3.5" />
                            {resource.view_count || 0}
                          </span>
                          <span className="inline-flex items-center gap-1" title="Redirect clicks">
                            <MousePointerClick className="h-3.5 w-3.5" />
                            {resource.click_count || 0}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Action */}
                          <button
                            type="button"
                            onClick={() => setPreviewingResource(resource)}
                            title="Preview Resource Card"
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 p-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Action */}
                          <Link
                            href={`/admin/resources/${resource.id}/edit`}
                            title="Edit Resource"
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 p-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>

                          {/* Official URL */}
                          <a
                            href={resource.official_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Official Website"
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 p-1.5 text-xs font-medium text-zinc-600 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-orange-400 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>

                          {/* Delete Action */}
                          <button
                            type="button"
                            onClick={() => setDeletingResource(resource)}
                            title="Delete Resource"
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 p-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Deleting Resource */}
      {deletingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Confirm Deletion</h3>
                <p className="text-xs text-zinc-500">This destructive action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete <strong className="text-zinc-900 dark:text-zinc-100">&ldquo;{deletingResource.name}&rdquo;</strong>? It will be removed from the catalog.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingResource(null)}
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
                {isDeleting ? 'Deleting...' : 'Delete Resource'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Resource Modal */}
      {previewingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-orange-600" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Resource Public Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingResource(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Public Card Preview */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <ResourceLogo
                  slug={previewingResource.slug}
                  name={previewingResource.name}
                  logoUrl={previewingResource.logo_url}
                  size={42}
                />
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">{previewingResource.platform?.name ?? 'Microsoft'}</Badge>
                  {previewingResource.featured && <Badge variant="success">Featured</Badge>}
                </div>
              </div>

              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{previewingResource.name}</h4>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">
                  {previewingResource.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-wrap gap-1">
                  {previewingResource.categories.map((c) => (
                    <Badge key={c.id || c.slug} variant="brand" className="text-xs">
                      {c.name}
                    </Badge>
                  ))}
                  {previewingResource.subcategory && (
                    <Badge variant="outline" className="text-xs">
                      {previewingResource.subcategory}
                    </Badge>
                  )}
                </div>

                <a
                  href={`/go/${previewingResource.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-orange-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-orange-700"
                >
                  Open Destination
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button size="sm" variant="outline" onClick={() => setPreviewingResource(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
