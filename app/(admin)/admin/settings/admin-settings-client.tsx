'use client';

import { useState, FormEvent } from 'react';
import {
  Database,
  Globe,
  Radio,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Sliders,
  Megaphone,
  HardDrive,
  Save,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { AdminSettingsData, PlatformTrackingSetting } from '@/lib/data/admin-settings';

interface AdminSettingsClientProps {
  initialSettings: AdminSettingsData;
  systemHealth: {
    dbConnected: boolean;
    publishedCount: number;
    storageBucketActive: boolean;
    supabaseUrl: string;
    nodeEnv: string;
  };
}

export function AdminSettingsClient({
  initialSettings,
  systemHealth,
}: AdminSettingsClientProps) {
  const [trackingConfigs, setTrackingConfigs] = useState<PlatformTrackingSetting[]>(
    initialSettings.trackingConfigs
  );
  const [itemsPerPage, setItemsPerPage] = useState(
    initialSettings.catalogDefaults.itemsPerPage
  );
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(
    initialSettings.catalogDefaults.showFeaturedOnly
  );
  const [bannerEnabled, setBannerEnabled] = useState(
    initialSettings.catalogDefaults.announcementBanner.enabled
  );
  const [bannerText, setBannerText] = useState(
    initialSettings.catalogDefaults.announcementBanner.text
  );
  const [bannerLink, setBannerLink] = useState(
    initialSettings.catalogDefaults.announcementBanner.link || ''
  );

  const [savingSettings, setSavingSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [revalidating, setRevalidating] = useState(false);
  const [revalidateStatus, setRevalidateStatus] = useState<string | null>(null);

  function handleTrackingChange(index: number, field: keyof PlatformTrackingSetting, value: string | boolean) {
    setTrackingConfigs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (savingSettings) return;
    setSavingSettings(true);
    setSaveStatus(null);

    const payload: AdminSettingsData = {
      trackingConfigs,
      catalogDefaults: {
        itemsPerPage: Number(itemsPerPage),
        showFeaturedOnly,
        announcementBanner: {
          enabled: bannerEnabled,
          text: bannerText,
          link: bannerLink || undefined,
        },
      },
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      setSaveStatus({ type: 'success', text: 'Admin settings and tracking parameters saved successfully.' });
    } catch (err) {
      setSaveStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error saving admin settings.',
      });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleRevalidateCache() {
    if (revalidating) return;
    setRevalidating(true);
    setRevalidateStatus(null);

    try {
      const res = await fetch('/api/admin/revalidate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revalidation failed');

      setRevalidateStatus(data.message || 'Public cache revalidated successfully.');
    } catch (err) {
      setRevalidateStatus(err instanceof Error ? err.message : 'Failed to revalidate cache.');
    } finally {
      setRevalidating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* System Health & Status Banner */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Database Connection</CardDescription>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-orange-500" />
                PostgreSQL (Supabase)
              </span>
              {systemHealth.dbConnected ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Fallback Mode
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-zinc-500 font-mono truncate">
            {systemHealth.supabaseUrl}
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Storage Bucket</CardDescription>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-blue-500" />
                kofyone-media
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-zinc-500">
            Public SVG/PNG media asset store
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Published Catalog Assets</CardDescription>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-purple-500" />
                Live Resources
              </span>
              <Badge variant="brand" className="text-xs">
                {systemHealth.publishedCount || 10} Published
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] text-zinc-500">
            Indexed and queryable via search vector
          </CardContent>
        </Card>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Contributor Tracking & Attribution Card */}
        <Card className="shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-orange-500" />
                  Contributor Tracking & Attribution Manager
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Manage attribution parameters appended to outbound /go/[slug] links without modifying code.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px]">
                Live Attributions
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
              {trackingConfigs.map((cfg, idx) => (
                <div
                  key={cfg.platformId}
                  className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-4">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">
                      {cfg.platformName}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      platform_id: {cfg.platformSlug}
                    </span>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-medium text-zinc-500 block mb-1">
                      Tracking Parameter
                    </label>
                    <Input
                      value={cfg.trackingParameter}
                      onChange={(e) => handleTrackingChange(idx, 'trackingParameter', e.target.value)}
                      placeholder="e.g. wt.mc_id"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-medium text-zinc-500 block mb-1">
                      Tracking Value
                    </label>
                    <Input
                      value={cfg.trackingValue}
                      onChange={(e) => handleTrackingChange(idx, 'trackingValue', e.target.value)}
                      placeholder="e.g. studentamb_504640"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-end">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={cfg.isEnabled}
                        onChange={(e) => handleTrackingChange(idx, 'isEnabled', e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {cfg.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-400">
              ℹ️ Microsoft resources strictly enforce the ambassador Contributor ID (`wt.mc_id`). Non-Microsoft platforms will never have Microsoft attribution attached.
            </p>
          </CardContent>
        </Card>

        {/* Catalog & Discovery Defaults Card */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-500" />
              Catalog & Discovery Defaults
            </CardTitle>
            <CardDescription className="text-xs">
              Configure baseline pagination, resource sorting, and global announcements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Default Items Per Page
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
                >
                  <option value={10}>10 resources per page</option>
                  <option value={20}>20 resources per page</option>
                  <option value={50}>50 resources per page</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs py-2">
                  <input
                    type="checkbox"
                    checked={showFeaturedOnly}
                    onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    Filter by Featured Only by Default
                  </span>
                </label>
              </div>
            </div>

            {/* Announcement Banner */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Announcement Banner
                  </span>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={bannerEnabled}
                    onChange={(e) => setBannerEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {bannerEnabled ? 'Enabled' : 'Hidden'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-medium text-zinc-500 block mb-1">
                    Banner Message
                  </label>
                  <Input
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                    placeholder="Enter announcement banner message…"
                    className="h-8 text-xs"
                    disabled={!bannerEnabled}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-zinc-500 block mb-1">
                    Action Link (Optional)
                  </label>
                  <Input
                    value={bannerLink}
                    onChange={(e) => setBannerLink(e.target.value)}
                    placeholder="/resources"
                    className="h-8 text-xs"
                    disabled={!bannerEnabled}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Bar & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Button disabled={savingSettings} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-1.5" />
            {savingSettings ? 'Saving Configuration…' : 'Save Admin Settings'}
          </Button>

          {saveStatus && (
            <span
              className={`text-xs font-medium ${
                saveStatus.type === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {saveStatus.text}
            </span>
          )}
        </div>
      </form>

      {/* Cache Revalidation Card */}
      <Card className="shadow-xs border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCw className="h-4 w-4 text-emerald-500" />
                Cache Management & Content Revalidation
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Trigger on-demand ISR revalidation across all public cached pages (`/`, `/resources`, `/categories`, `/platforms`).
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevalidateCache}
              disabled={revalidating}
              className="text-xs shrink-0"
            >
              <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${revalidating ? 'animate-spin' : ''}`} />
              {revalidating ? 'Revalidating…' : 'Revalidate Public Cache'}
            </Button>
          </div>
        </CardHeader>
        {revalidateStatus && (
          <CardContent className="pt-0">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {revalidateStatus}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
