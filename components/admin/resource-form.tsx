'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ResourceLogo } from '@/components/resources/resource-logo';
import { isMicrosoftPlatform } from '@/lib/tracking/url-builder';
import type { ResourceWithRelations } from '@/types/resource';
import type { Platform } from '@/types/platform';
import type { Category } from '@/types/category';
import {
  ArrowLeft,
  Sparkles,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Wand2,
  Info,
} from 'lucide-react';

const LOGO_PRESETS = [
  { label: 'Microsoft', url: '/logos/microsoft.svg' },
  { label: 'Azure', url: '/logos/azure.svg' },
  { label: 'Azure Students', url: '/logos/azure-students.svg' },
  { label: 'Azure AI', url: '/logos/azure-ai.svg' },
  { label: 'Copilot', url: '/logos/copilot.svg' },
  { label: 'Copilot Studio', url: '/logos/copilot-studio.svg' },
  { label: 'GitHub', url: '/logos/github.svg' },
  { label: 'GitHub Skills', url: '/logos/github-skills.svg' },
  { label: 'Visual Studio', url: '/logos/visual-studio.svg' },
  { label: 'Microsoft 365', url: '/logos/m365.svg' },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ResourceFormProps {
  initialResource?: ResourceWithRelations | null;
  categories: Category[];
  platforms: Platform[];
}

export function ResourceForm({ initialResource, categories, platforms }: ResourceFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(initialResource);

  // Form Fields
  const [name, setName] = useState(initialResource?.name || '');
  const [slug, setSlug] = useState(initialResource?.slug || '');
  const [customSlugEdited, setCustomSlugEdited] = useState(isEditing);
  const [officialUrl, setOfficialUrl] = useState(initialResource?.official_url || '');
  const [description, setDescription] = useState(initialResource?.description || '');
  const [platformSlug, setPlatformSlug] = useState(
    initialResource?.platform?.slug || platforms[0]?.slug || 'microsoft'
  );
  const [categorySlug, setCategorySlug] = useState(
    initialResource?.categories[0]?.slug || categories[0]?.slug || 'ai'
  );
  const [subcategory, setSubcategory] = useState(initialResource?.subcategory || '');
  const [tagsInput, setTagsInput] = useState(
    initialResource?.tags?.join(', ') ||
      (Array.isArray(initialResource?.metadata?.tags) ? (initialResource?.metadata?.tags as string[]).join(', ') : '')
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(initialResource?.logo_url || null);
  const [featured, setFeatured] = useState(initialResource?.featured || false);
  const [isPublished, setIsPublished] = useState(
    initialResource !== undefined && initialResource !== null ? initialResource.is_published : true
  );
  const [contributorId, setContributorId] = useState(
    initialResource?.contributor_id || initialResource?.tracking_config?.tracking_value || ''
  );

  // Loading & Feedback
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [metadataNotice, setMetadataNotice] = useState('');

  // Check if active provider is Microsoft
  const isMicrosoft = isMicrosoftPlatform(platformSlug);

  function handleNameChange(val: string) {
    setName(val);
    if (!customSlugEdited) {
      const generated = slugify(val);
      setSlug(generated);
    }
  }

  // 1. Metadata Autofill action
  async function handleFetchMetadata() {
    if (!officialUrl || !officialUrl.startsWith('http')) {
      setError('Please enter a valid website URL starting with http:// or https:// before auto-filling.');
      return;
    }

    setError('');
    setMetadataNotice('');
    setFetchingMetadata(true);

    try {
      const res = await fetch('/api/admin/metadata-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: officialUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch website metadata.');
      }

      const meta = data.metadata;
      if (!name && meta.title) {
        setName(meta.title);
        if (!customSlugEdited) setSlug(slugify(meta.title));
      }
      if (!description && meta.description) {
        setDescription(meta.description);
      }
      if (!logoUrl && (meta.ogImage || meta.faviconUrl)) {
        setLogoUrl(meta.ogImage || meta.faviconUrl);
      }

      // Suggest provider if matching
      if (meta.suggestedProvider) {
        const matchingPlatform = platforms.find(
          (p) => p.name.toLowerCase() === meta.suggestedProvider.toLowerCase() || p.slug === meta.suggestedProvider.toLowerCase()
        );
        if (matchingPlatform && !isEditing) {
          setPlatformSlug(matchingPlatform.slug);
        }
      }

      // Suggest category if matching
      if (meta.suggestedCategorySlug) {
        const matchingCategory = categories.find((c) => c.slug === meta.suggestedCategorySlug);
        if (matchingCategory && !isEditing) {
          setCategorySlug(matchingCategory.slug);
        }
      }

      setMetadataNotice(`Auto-filled metadata from ${meta.hostname}. Review suggestions below.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve website details.');
    } finally {
      setFetchingMetadata(false);
    }
  }

  // 2. Custom Image Upload
  async function handleImageUpload(file: File) {
    setError('');
    setSuccess('');

    if (file.size > 2 * 1024 * 1024) {
      setError(`Image size exceeds 2MB limit. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
      return;
    }

    if (file.type.toLowerCase().includes('svg')) {
      setError('SVG uploads are rejected for security. Please upload a PNG, JPG/JPEG, or WebP image.');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError(`Unsupported file type (${file.type}). Only PNG, JPG, and WebP images are permitted.`);
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image.');
      }

      setLogoUrl(data.url);
      setSuccess('Image uploaded and previewed successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  }

  // 3. Submit Form (Create or Update)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      name,
      slug: slug || slugify(name),
      official_url: officialUrl,
      description,
      platform_slug: platformSlug,
      category_slug: categorySlug,
      subcategory: subcategory.trim() || null,
      tags,
      logo_url: logoUrl,
      featured,
      is_published: isPublished,
      contributor_id: isMicrosoft && contributorId.trim() ? contributorId.trim() : null,
    };

    try {
      const url = isEditing && initialResource?.id
        ? `/api/admin/resources/${initialResource.id}`
        : '/api/admin/resources';

      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} resource.`);
      }

      setSuccess(`Resource "${name}" ${isEditing ? 'updated' : 'created'} successfully!`);
      setTimeout(() => {
        router.push('/admin/resources');
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPlatform = platforms.find((p) => p.slug === platformSlug) || {
    name: platformSlug.toUpperCase(),
    slug: platformSlug,
  };
  const selectedCategory = categories.find((c) => c.slug === categorySlug) || {
    name: categorySlug.toUpperCase(),
    slug: categorySlug,
  };

  return (
    <div className="space-y-6">
      {/* Header & Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/resources"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Resources
        </Link>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Badge variant="outline" className="font-mono text-[10px]">
              ID: {initialResource?.id}
            </Badge>
          )}
          <Badge variant={isPublished ? 'success' : 'outline'}>
            {isPublished ? 'Status: Published' : 'Status: Draft'}
          </Badge>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <p>{error}</p>
        </div>
      )}

      {metadataNotice && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
          <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <p>{metadataNotice}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p>{success}</p>
        </div>
      )}

      {/* Main Grid: Form on Left, Live Card Preview on Right */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">
                {isEditing ? 'Edit Resource Details' : 'Resource Information'}
              </CardTitle>
              <CardDescription className="text-xs">
                Enter the resource URL, platform provider, categories, and description.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Official URL with Fetch Metadata button */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Official Website URL *</span>
                  <span className="text-[10px] text-zinc-400">Must begin with https:// or http://</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={officialUrl}
                    onChange={(e) => setOfficialUrl(e.target.value)}
                    placeholder="https://learn.microsoft.com/training..."
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFetchMetadata}
                    disabled={fetchingMetadata || !officialUrl}
                    className="flex items-center gap-1.5 shrink-0 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                    title="Fetch title, description, and images from website"
                  >
                    {fetchingMetadata ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3.5 w-3.5" /> Auto-fill Details
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Resource Name and Slug */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Resource Name *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Azure for Students"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                    <span>URL Slug</span>
                    <span className="text-[10px] text-zinc-400">Auto-generated</span>
                  </label>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setCustomSlugEdited(true);
                    }}
                    placeholder="azure-for-students"
                    required
                  />
                </div>
              </div>

              {/* Provider & Main Category */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Platform / Provider *
                  </label>
                  <select
                    value={platformSlug}
                    onChange={(e) => {
                      const newSlug = e.target.value;
                      setPlatformSlug(newSlug);
                      // If switching away from Microsoft, clear Contributor ID
                      if (!isMicrosoftPlatform(newSlug)) {
                        setContributorId('');
                      }
                    }}
                    className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {platforms.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Main Category *
                  </label>
                  <select
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subcategory & Tags */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Subcategory (Optional)
                  </label>
                  <Input
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. Free Credits, Lab Sandbox"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Tags (Comma-separated)
                  </label>
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. ai, student, certifications"
                  />
                </div>
              </div>

              {/* Microsoft-Only Contributor ID Section */}
              {isMicrosoft ? (
                <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-950/60 dark:bg-orange-950/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-orange-900 dark:text-orange-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-orange-600" /> Microsoft Contributor ID (wt.mc_id)
                    </label>
                    <Badge variant="brand" className="text-[10px]">
                      Microsoft Only
                    </Badge>
                  </div>
                  <Input
                    value={contributorId}
                    onChange={(e) => setContributorId(e.target.value)}
                    placeholder="e.g. studentamb_504640"
                    className="bg-white dark:bg-zinc-900"
                  />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Attached as <code className="font-mono text-orange-600 dark:text-orange-400">?wt.mc_id=...</code> when users open official Microsoft pages. Never attached to AWS, Google, or other non-Microsoft platforms.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Provider: {selectedPlatform.name}.</span> Contributor ID tracking is exclusive to Microsoft resources and is automatically disabled.
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  required
                  placeholder="Clear description of the learning platform, features, and eligibility..."
                  className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Logo / Image Upload Section */}
              <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Custom Logo / Image</span>
                  <span className="text-[10px] text-zinc-400">Upload or select preset</span>
                </label>

                {/* Upload box */}
                <div className="grid gap-4 sm:grid-cols-[auto_1fr] items-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/40">
                    <ResourceLogo
                      slug={slug || 'preview'}
                      name={name || 'Resource'}
                      logoUrl={logoUrl}
                      size={48}
                    />
                  </div>

                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingImage ? 'Uploading...' : 'Upload Image (PNG, JPG, WebP)'}
                      </Button>

                      {logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogoUrl(null)}
                          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </Button>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Upload custom logo from your computer (max 2MB).
                    </p>
                  </div>
                </div>

                {/* Preset Logos Quick-Pick */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-medium text-zinc-500">Or choose a common preset:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {LOGO_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setLogoUrl(preset.url)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          logoUrl === preset.url
                            ? 'border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-950/50 dark:text-orange-300'
                            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status and Visibility Settings */}
              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-700"
                  />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Mark as Featured Resource
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-700"
                  />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Published (Uncheck to save as Draft)
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/resources')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || Boolean(uploadingImage)}
              className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Publish Resource'
              )}
            </Button>
          </div>
        </form>

        {/* Live Card Preview Column */}
        <div className="space-y-4">
          <div className="sticky top-20 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-zinc-400" /> Live Resource Card Preview
              </span>
              <Badge variant="outline" className="text-[10px]">
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
            </div>

            {/* Public Resource Card representation */}
            <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <ResourceLogo
                    slug={slug || 'preview'}
                    name={name || 'Resource'}
                    logoUrl={logoUrl}
                    size={40}
                  />
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">{selectedPlatform.name}</Badge>
                    {featured && <Badge variant="success">Featured</Badge>}
                  </div>
                </div>
                <CardTitle className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {name || 'Resource Title'}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {description || 'Resource description will be displayed here in public listings.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between gap-3 pt-0">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="brand" className="text-[10px]">
                    {selectedCategory.name}
                  </Badge>
                  {subcategory && (
                    <Badge variant="outline" className="text-[10px]">
                      {subcategory}
                    </Badge>
                  )}
                </div>
                <Button size="sm" className="h-8 text-xs shrink-0" disabled>
                  Open Link
                </Button>
              </CardContent>
            </Card>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 text-xs text-zinc-500 dark:border-zinc-800/60 dark:bg-zinc-900/40 space-y-1.5">
              <div className="flex justify-between">
                <span>Provider:</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedPlatform.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedCategory.name}</span>
              </div>
              {isMicrosoft && contributorId && (
                <div className="flex justify-between">
                  <span>Tracking:</span>
                  <span className="font-mono text-[10px] text-orange-600 dark:text-orange-400">
                    {contributorId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
