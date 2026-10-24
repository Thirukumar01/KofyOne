'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, Sparkles, ExternalLink, CheckCircle } from 'lucide-react';
import { ResourceLogo } from '@/components/resources/resource-logo';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

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

export function ResourceForm({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [customSlugEdited, setCustomSlugEdited] = useState(false);
  const [officialUrl, setOfficialUrl] = useState('');
  const [description, setDescription] = useState('');
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug || 'ai');
  const [logoUrl, setLogoUrl] = useState('/logos/microsoft.svg');
  const [featured, setFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleNameChange(val: string) {
    setName(val);
    if (!customSlugEdited) {
      const generatedSlug = slugify(val);
      setSlug(generatedSlug);
      // Auto-suggest preset based on name
      const lower = val.toLowerCase();
      if (lower.includes('copilot') && lower.includes('studio')) {
        setLogoUrl('/logos/copilot-studio.svg');
      } else if (lower.includes('copilot')) {
        setLogoUrl('/logos/copilot.svg');
      } else if (lower.includes('azure') && lower.includes('student')) {
        setLogoUrl('/logos/azure-students.svg');
      } else if (lower.includes('ai') || lower.includes('foundry')) {
        setLogoUrl('/logos/azure-ai.svg');
      } else if (lower.includes('azure')) {
        setLogoUrl('/logos/azure.svg');
      } else if (lower.includes('github') && lower.includes('skill')) {
        setLogoUrl('/logos/github-skills.svg');
      } else if (lower.includes('github')) {
        setLogoUrl('/logos/github.svg');
      } else if (lower.includes('visual studio') || lower.includes('vscode')) {
        setLogoUrl('/logos/visual-studio.svg');
      } else if (lower.includes('365') || lower.includes('office')) {
        setLogoUrl('/logos/m365.svg');
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slug || slugify(name),
          official_url: officialUrl,
          description,
          category_slug: categorySlug,
          logo_url: logoUrl,
          featured,
          is_published: isPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create resource.');
      }

      setSuccess(`Resource "${name}" created successfully! Redirecting...`);
      setTimeout(() => {
        router.push(`/resources/${data.resource.slug}`);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  const selectedCategoryName = categories.find((c) => c.slug === categorySlug)?.name || 'Track';

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Main Form (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Resource Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Microsoft Copilot Studio"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="slug" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              URL Slug <span className="text-zinc-400 font-normal text-xs">(user portal link)</span>
            </label>
            <div className="flex items-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3">
              <span className="text-xs text-zinc-400 font-mono">/resources/</span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setCustomSlugEdited(true);
                  setSlug(e.target.value);
                }}
                className="w-full bg-transparent py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 outline-none"
                placeholder="microsoft-copilot-studio"
              />
            </div>
          </div>

          {/* Official Logo Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
              Official Logo
            </label>
            <div className="grid grid-cols-5 gap-2">
              {LOGO_PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setLogoUrl(preset.url)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all ${
                    logoUrl === preset.url
                      ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 ring-2 ring-orange-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <img src={preset.url} alt={preset.label} className="h-6 w-6 object-contain" />
                  <span className="text-[10px] font-medium leading-tight text-zinc-700 dark:text-zinc-300 line-clamp-1">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="url" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Official Microsoft Destination URL <span className="text-red-500">*</span>
            </label>
            <Input
              id="url"
              type="url"
              required
              value={officialUrl}
              onChange={(e) => setOfficialUrl(e.target.value)}
              placeholder="https://learn.microsoft.com/en-us/copilot/studio"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="category" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Primary Learning Category
            </label>
            <select
              id="category"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            >
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Explain what students or developers will learn or build with this resource..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
              />
              <div>
                <span className="text-xs font-semibold block text-zinc-900 dark:text-zinc-100">Featured Resource</span>
                <span className="text-xs text-zinc-500 block">Highlight on user portal home</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
              />
              <div>
                <span className="text-xs font-semibold block text-zinc-900 dark:text-zinc-100">Published Status</span>
                <span className="text-xs text-zinc-500 block">Make publicly visible</span>
              </div>
            </label>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" /> {success}
            </p>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Link
              href="/admin/resources"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Catalog
            </Link>
            <Button disabled={loading || !name || !description || !officialUrl}>
              {loading ? 'Publishing to Portal…' : 'Publish to User Portal'}
            </Button>
          </div>
        </form>
      </div>

      {/* Live Preview Card (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5 text-orange-500" />
          Live User Portal Card Preview
        </div>

        <Card className="border-orange-500/30 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <ResourceLogo
                slug={slug || 'preview'}
                name={name || 'Resource'}
                logoUrl={logoUrl}
                size={44}
              />
              <div className="flex items-center gap-1.5">
                <Badge variant="outline">Microsoft Learn</Badge>
                {featured && <Badge variant="brand">Featured</Badge>}
              </div>
            </div>
            <CardTitle className="mt-3 text-lg font-bold">
              {name || 'Resource Title Preview'}
            </CardTitle>
            <CardDescription className="text-xs line-clamp-3">
              {description || 'Your description will be rendered here for users to read...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Badge variant="brand">{selectedCategoryName}</Badge>
              <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                Open Resource <ExternalLink className="h-3 w-3" />
              </span>
            </div>
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/40 p-2 text-xs text-zinc-500 font-mono truncate">
              Link: {officialUrl || 'https://learn.microsoft.com/...'}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
          <p className="font-semibold mb-1">Official Brand Logos</p>
          <p>
            Each item in KofyOne features its official Microsoft / Azure / GitHub SVG icon, ensuring high-fidelity visual branding across all user screens and retina displays.
          </p>
        </div>
      </div>
    </div>
  );
}
