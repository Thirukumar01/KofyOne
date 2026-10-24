'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SiteBranding } from '@/types/branding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandingLogo } from '@/components/branding/branding-logo';
import {
  Upload,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Smartphone,
  Monitor,
  Globe,
} from 'lucide-react';

export function BrandingForm({ initialBranding }: { initialBranding: SiteBranding }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compactInputRef = useRef<HTMLInputElement>(null);
  const squareInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [appName, setAppName] = useState(initialBranding.app_name || 'KofyOne');
  const [tagline, setTagline] = useState(initialBranding.tagline || '');
  const [description, setDescription] = useState(initialBranding.description || '');
  const [logoAlt, setLogoAlt] = useState(initialBranding.logo_alt || 'KofyOne Brand Logo');

  const [primaryLogoUrl, setPrimaryLogoUrl] = useState<string | null>(initialBranding.primary_logo_url);
  const [compactLogoUrl, setCompactLogoUrl] = useState<string | null>(initialBranding.compact_logo_url);
  const [squareIconUrl, setSquareIconUrl] = useState<string | null>(initialBranding.square_icon_url);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(initialBranding.favicon_url);

  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdvancedVariants, setShowAdvancedVariants] = useState(false);

  // Active preview object
  const previewBranding: SiteBranding = {
    id: 'current',
    app_name: appName,
    tagline,
    description,
    primary_logo_url: primaryLogoUrl,
    compact_logo_url: compactLogoUrl,
    square_icon_url: squareIconUrl,
    favicon_url: faviconUrl,
    logo_alt: logoAlt,
    updated_at: new Date().toISOString(),
  };

  async function handleFileUpload(file: File, target: 'primary' | 'compact' | 'square' | 'favicon') {
    setError('');
    setSuccess('');

    // Check size limit (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError(`File size exceeds 2MB limit. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
      return;
    }

    // Check MIME type
    if (file.type.toLowerCase().includes('svg')) {
      setError('SVG uploads are rejected for security. Please upload a PNG, JPG/JPEG, or WebP image.');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError(`Unsupported file type (${file.type}). Only PNG, JPG/JPEG, and WebP images are permitted.`);
      return;
    }

    setUploadingTarget(target);
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

      if (target === 'primary') {
        setPrimaryLogoUrl(data.url);
      } else if (target === 'compact') {
        setCompactLogoUrl(data.url);
      } else if (target === 'square') {
        setSquareIconUrl(data.url);
      } else if (target === 'favicon') {
        setFaviconUrl(data.url);
      }

      setSuccess(`Uploaded ${target} logo successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingTarget(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/admin/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: appName,
          tagline,
          description,
          logo_alt: logoAlt,
          primary_logo_url: primaryLogoUrl,
          compact_logo_url: compactLogoUrl,
          square_icon_url: squareIconUrl,
          favicon_url: faviconUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save branding.');
      }

      setSuccess('Branding and identity settings updated successfully!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefault() {
    if (!window.confirm('Are you sure you want to restore the default KofyOne branding? Any custom logo will be removed.')) {
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/admin/branding', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset branding.');
      }

      setAppName('KofyOne');
      setTagline('Learn Today. Build Tomorrow.');
      setDescription('A student-focused resource discovery platform to discover, search, explore, save, and revisit official technology resources.');
      setLogoAlt('KofyOne Brand Logo');
      setPrimaryLogoUrl(null);
      setCompactLogoUrl(null);
      setSquareIconUrl(null);
      setFaviconUrl(null);

      setSuccess('Restored default KofyOne branding successfully!');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset branding.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Feedback Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p>{success}</p>
        </div>
      )}

      {/* Live Responsive Previews Section */}
      <Card className="border-orange-200/60 dark:border-orange-950/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-50/50 to-amber-50/50 dark:from-zinc-900 dark:to-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-base font-semibold">Live Responsive Presentation Preview</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Instant Preview
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Review how your branding appears dynamically across desktop header, mobile navigation, app icon, and browser tabs.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid gap-6 md:grid-cols-3">
          {/* 1. Desktop Header Preview */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5 text-zinc-400" /> Desktop Header
              </span>
              <span className="text-[10px] text-zinc-400">Primary</span>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800/60 dark:bg-zinc-950/60 flex items-center justify-between">
              <BrandingLogo branding={previewBranding} variant="primary" />
              <div className="flex gap-2">
                <span className="h-2 w-12 rounded bg-zinc-200 dark:bg-zinc-800" />
                <span className="h-2 w-8 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Header logo automatically sizes and preserves aspect ratio without stretching.
            </p>
          </div>

          {/* 2. Mobile Drawer Preview */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-zinc-400" /> Mobile & Tablet
              </span>
              <span className="text-[10px] text-zinc-400">Compact Symbol</span>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800/60 dark:bg-zinc-950/60 flex items-center gap-3">
              <BrandingLogo branding={previewBranding} variant="compact" showText={false} />
              <div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{appName}</p>
                <p className="text-[10px] text-zinc-400 line-clamp-1">{tagline || 'Mobile Menu'}</p>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Compact presentation optimized for narrow mobile navigation and drawer panels.
            </p>
          </div>

          {/* 3. App Icon & Favicon Preview */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-zinc-400" /> Favicon & App Icon
              </span>
              <span className="text-[10px] text-zinc-400">Square / 1:1</span>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800/60 dark:bg-zinc-950/60 flex items-center justify-around">
              <div className="flex flex-col items-center gap-1">
                <BrandingLogo branding={previewBranding} variant="square" showText={false} />
                <span className="text-[10px] text-zinc-400">App Icon</span>
              </div>
              <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 rounded border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
                  <BrandingLogo branding={previewBranding} variant="favicon" showText={false} />
                  <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[60px]">
                    {appName}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400">Browser Tab</span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Square app icon for PWA/shortcuts and high-contrast browser favicon.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Branding Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Primary Logo & Master Asset</CardTitle>
            <CardDescription className="text-xs">
              Upload your main official logo. PNG, JPG/JPEG, and WebP are supported (maximum 2MB).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Logo Upload Box */}
            <div className="grid gap-6 sm:grid-cols-[auto_1fr] items-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-24 w-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/40">
                  {primaryLogoUrl ? (
                    <img
                      src={primaryLogoUrl}
                      alt={logoAlt}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-xs text-zinc-400">
                      <Sparkles className="h-6 w-6 text-orange-500 mb-1" />
                      <span>Default System Logo</span>
                    </div>
                  )}
                </div>

                {primaryLogoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPrimaryLogoUrl(null)}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3 w-3" /> Remove Custom Logo
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'primary');
                  }}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file, 'primary');
                  }}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-200 hover:border-orange-500 bg-zinc-50/50 hover:bg-orange-50/30 p-6 text-center transition-colors dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-orange-500"
                >
                  <Upload className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {uploadingTarget === 'primary' ? 'Uploading...' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    PNG, JPG, or WebP up to 2MB. SVG is rejected for security.
                  </p>
                </div>
              </div>
            </div>

            {/* General Site Identity Fields */}
            <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Platform / Site Name *
                </label>
                <Input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="KofyOne"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Logo Alt Text
                </label>
                <Input
                  value={logoAlt}
                  onChange={(e) => setLogoAlt(e.target.value)}
                  placeholder="KofyOne Brand Logo"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Tagline
                </label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Learn Today. Build Tomorrow."
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="A student-focused resource discovery platform..."
                />
              </div>
            </div>

            {/* Toggle Advanced Variants */}
            <div className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedVariants(!showAdvancedVariants)}
                className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400"
              >
                {showAdvancedVariants ? '▲ Hide Optional Variants' : '▼ Configure Separate Variants (Compact, App Icon, Favicon)'}
              </Button>
            </div>

            {/* Separate Variants Uploads */}
            {showAdvancedVariants && (
              <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                {/* Compact Variant */}
                <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Compact Symbol</span>
                    {compactLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setCompactLogoUrl(null)}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={compactInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'compact');
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => compactInputRef.current?.click()}
                    disabled={uploadingTarget === 'compact'}
                    className="w-full text-xs"
                  >
                    {uploadingTarget === 'compact' ? 'Uploading...' : compactLogoUrl ? 'Replace Symbol' : 'Upload Symbol'}
                  </Button>
                </div>

                {/* Square Icon Variant */}
                <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Square App Icon</span>
                    {squareIconUrl && (
                      <button
                        type="button"
                        onClick={() => setSquareIconUrl(null)}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={squareInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'square');
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => squareInputRef.current?.click()}
                    disabled={uploadingTarget === 'square'}
                    className="w-full text-xs"
                  >
                    {uploadingTarget === 'square' ? 'Uploading...' : squareIconUrl ? 'Replace Icon' : 'Upload Icon'}
                  </Button>
                </div>

                {/* Favicon Variant */}
                <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Favicon Asset</span>
                    {faviconUrl && (
                      <button
                        type="button"
                        onClick={() => setFaviconUrl(null)}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'favicon');
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploadingTarget === 'favicon'}
                    className="w-full text-xs"
                  >
                    {uploadingTarget === 'favicon' ? 'Uploading...' : faviconUrl ? 'Replace Favicon' : 'Upload Favicon'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Bar */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetDefault}
            disabled={saving}
            className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400"
          >
            <RotateCcw className="h-4 w-4" /> Restore Default Brand
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || Boolean(uploadingTarget)}
              className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm flex items-center gap-2"
            >
              {saving ? 'Publishing...' : 'Save & Publish Branding'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
