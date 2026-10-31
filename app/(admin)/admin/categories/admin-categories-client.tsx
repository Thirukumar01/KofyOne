'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Category } from '@/types/category';
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  ArrowUpRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

export interface AdminCategoriesClientProps {
  initialCategories: Category[];
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AdminCategoriesClient({ initialCategories }: AdminCategoriesClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [search, setSearch] = useState('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [customSlugEdited, setCustomSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete State
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification alerts
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const filtered = categories.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  function handleOpenCreate() {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setCustomSlugEdited(false);
    setDescription('');
    setDisplayOrder(categories.length + 1);
    setIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  }

  function handleOpenEdit(category: Category) {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug);
    setCustomSlugEdited(true);
    setDescription(category.description || '');
    setDisplayOrder(category.display_order ?? 1);
    setIsActive(category.is_active);
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

    if (!trimmedName) {
      setFormError('Category name is required.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      ...(editingCategory ? { id: editingCategory.id, original_slug: editingCategory.slug } : {}),
      name: trimmedName,
      slug: finalSlug,
      description: description.trim() || null,
      display_order: Number(displayOrder) || 1,
      is_active: isActive,
    };

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save category.');
      }

      if (editingCategory) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? { ...c, ...payload, id: editingCategory.id } : c))
        );
        setActionSuccess(`Category "${trimmedName}" updated successfully.`);
      } else {
        const savedItem: Category = data.category || {
          id: 'cat-' + Date.now(),
          ...payload,
          icon: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCategories((prev) => [...prev, savedItem]);
        setActionSuccess(`Category "${trimmedName}" added successfully.`);
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error saving category.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(category: Category) {
    const newStatus = !category.is_active;
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === category.id ? { ...c, is_active: newStatus } : c))
        );
        setActionSuccess(`Category "${category.name}" is now ${newStatus ? 'Active' : 'Disabled'}.`);
        router.refresh();
      }
    } catch {
      setActionError('Could not update category status.');
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingCategory) return;
    setIsDeleting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/admin/categories/${deletingCategory.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingCategory.id, slug: deletingCategory.slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete category.');
      }

      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      setActionSuccess(`Category "${deletingCategory.name}" permanently deleted.`);
      setDeletingCategory(null);
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
          <Badge variant="brand">{categories.length} Categories</Badge>
          <Badge variant="outline">{categories.filter((c) => c.is_active).length} Active</Badge>
          <Badge variant="outline">{categories.filter((c) => !c.is_active).length} Inactive</Badge>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 shadow-sm bg-[#B94A50] hover:bg-[#A13D43] dark:hover:bg-[#C85A60] active:bg-[#8D3338] text-white"
        >
          <Plus className="h-4 w-4" /> Add New Category
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories by name, slug, description..."
          className="pl-9"
        />
      </div>

      {/* Grid of Categories */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500">
            No categories found matching your search.
          </div>
        ) : (
          filtered.map((category) => (
            <Card key={category.id} className="relative overflow-hidden flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCECEB] text-[#B94A50] dark:bg-[#252429] dark:text-[#D98C91]">
                    <FolderTree className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(category)}
                    title="Click to toggle status"
                    className="cursor-pointer"
                  >
                    <Badge variant={category.is_active ? 'brand' : 'outline'}>
                      {category.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </button>
                </div>
                <CardTitle className="mt-3 text-lg text-zinc-900 dark:text-zinc-50">{category.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {category.description || 'Curated category track'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                  <span className="font-mono text-zinc-500">/{category.slug}</span>
                  <Link
                    href={`/resources?category=${category.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 font-medium text-[#B94A50] hover:text-[#A13D43] dark:text-[#D98C91] dark:hover:text-[#C85A60]"
                  >
                    Explore <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(category)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingCategory(category)}
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

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
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
                  Category Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. AI & Machine Learning, Cloud Services, Web Dev"
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
                  placeholder="e.g. ai, cloud, web-dev"
                  required
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
                  placeholder="Brief description of this learning category track..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Display Order
                </label>
                <Input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                  min={1}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-zinc-300 text-[#B94A50] focus:ring-[#B94A50]"
                />
                <label htmlFor="cat-active" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Active (visible across catalog filters)
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
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deleting Category */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Confirm Category Deletion</h3>
                <p className="text-xs text-zinc-500">This action permanently deletes this category.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Are you sure you want to permanently delete category <strong className="text-zinc-900 dark:text-zinc-100">&ldquo;{deletingCategory.name}&rdquo;</strong>? It will be permanently tombstoned and will never reappear.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingCategory(null)}
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
                {isDeleting ? 'Deleting...' : 'Delete Category'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
