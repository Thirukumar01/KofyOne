/**
 * KofyOne - Admin Settings & Platform Attribution Store
 * Manages contributor tracking parameters, catalog defaults, and system health indicators.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';

export interface PlatformTrackingSetting {
  platformId: string;
  platformSlug: string;
  platformName: string;
  trackingParameter: string;
  trackingValue: string;
  isEnabled: boolean;
}

export interface AdminSettingsData {
  trackingConfigs: PlatformTrackingSetting[];
  catalogDefaults: {
    itemsPerPage: number;
    showFeaturedOnly: boolean;
    announcementBanner: {
      enabled: boolean;
      text: string;
      link?: string;
    };
  };
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettingsData = {
  trackingConfigs: [
    {
      platformId: 'plat-microsoft',
      platformSlug: 'microsoft',
      platformName: 'Microsoft Learn & Azure',
      trackingParameter: 'wt.mc_id',
      trackingValue: 'studentamb_504640',
      isEnabled: true,
    },
    {
      platformId: 'plat-aws',
      platformSlug: 'aws',
      platformName: 'Amazon Web Services',
      trackingParameter: 'ref',
      trackingValue: 'kofyone_student',
      isEnabled: false,
    },
    {
      platformId: 'plat-google',
      platformSlug: 'google',
      platformName: 'Google Cloud Skills Boost',
      trackingParameter: 'utm_source',
      trackingValue: 'kofyone',
      isEnabled: false,
    },
  ],
  catalogDefaults: {
    itemsPerPage: 10,
    showFeaturedOnly: false,
    announcementBanner: {
      enabled: true,
      text: '🚀 Welcome to KofyOne — Discover official Microsoft & Cloud Student Resources!',
      link: '/resources',
    },
  },
};

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'admin-settings.json');

export function getLocalAdminSettings(): AdminSettingsData {
  try {
    if (!fs.existsSync(SETTINGS_FILE_PATH)) {
      return DEFAULT_ADMIN_SETTINGS;
    }
    const content = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
    if (!content.trim()) return DEFAULT_ADMIN_SETTINGS;
    return { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(content) };
  } catch {
    return DEFAULT_ADMIN_SETTINGS;
  }
}

export function saveLocalAdminSettings(settings: AdminSettingsData): void {
  try {
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local admin settings:', err);
  }
}

export async function getAdminSettings(): Promise<AdminSettingsData> {
  const local = getLocalAdminSettings();

  try {
    const supabase = await createClient();
    // Also sync tracking configs from tracking_configs table if available
    const { data: dbData } = await (supabase.from('tracking_configs') as unknown as {
      select: (cols: string) => Promise<{ data: unknown[] | null }>;
    }).select('*');

    const dbConfigs = dbData as Array<{
      platform_id?: string;
      tracking_parameter?: string;
      tracking_value?: string;
      is_enabled?: boolean;
    }> | null;

    if (dbConfigs && dbConfigs.length > 0) {
      const updatedConfigs = local.trackingConfigs.map((cfg) => {
        const found = dbConfigs.find(
          (d) => d.platform_id === cfg.platformId || d.tracking_parameter === cfg.trackingParameter
        );
        if (found) {
          return {
            ...cfg,
            trackingParameter: found.tracking_parameter || cfg.trackingParameter,
            trackingValue: found.tracking_value || cfg.trackingValue,
            isEnabled: Boolean(found.is_enabled),
          };
        }
        return cfg;
      });
      return { ...local, trackingConfigs: updatedConfigs };
    }
  } catch {
    // Database connection or table not yet applied; gracefully fall back to local
  }

  return local;
}

export async function saveAdminSettings(settings: Partial<AdminSettingsData>): Promise<AdminSettingsData> {
  const current = await getAdminSettings();
  const merged: AdminSettingsData = {
    ...current,
    ...settings,
    catalogDefaults: {
      ...current.catalogDefaults,
      ...(settings.catalogDefaults || {}),
      announcementBanner: {
        ...current.catalogDefaults.announcementBanner,
        ...(settings.catalogDefaults?.announcementBanner || {}),
      },
    },
    trackingConfigs: settings.trackingConfigs || current.trackingConfigs,
  };

  saveLocalAdminSettings(merged);

  // Sync tracking configs with Supabase database if available
  try {
    const supabase = await createClient();
    for (const cfg of merged.trackingConfigs) {
      await (supabase.from('tracking_configs') as unknown as {
        upsert: (vals: Record<string, unknown>, opts: { onConflict: string }) => Promise<unknown>;
      }).upsert(
        {
          platform_id: cfg.platformId,
          tracking_parameter: cfg.trackingParameter,
          tracking_value: cfg.trackingValue,
          is_enabled: cfg.isEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'platform_id' }
      );
    }
  } catch {
    // Graceful fallback
  }

  return merged;
}
