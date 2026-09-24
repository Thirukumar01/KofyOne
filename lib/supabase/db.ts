/**
 * KofyOne - Supabase Database Access Layer
 * Centralized, safe repository functions for querying platforms, categories,
 * and tracking configs with fallback to seed configuration.
 */

import { createClient } from './server';
import { Platform } from '@/types/platform';
import { Category } from '@/types/category';
import { TrackingConfig } from '@/types/tracking';
import { INITIAL_PLATFORMS } from '@/config/platforms';
import { INITIAL_CATEGORIES } from '@/config/categories';

/**
 * Fetches active platforms from Supabase, or falls back to INITIAL_PLATFORMS.
 */
export async function getActivePlatforms(): Promise<Platform[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      // Return initial configured platforms as fallback
      return INITIAL_PLATFORMS.map((p, idx) => ({
        id: `seed-platform-${idx}`,
        name: p.name,
        slug: p.slug,
        description: p.description,
        logo_url: null,
        website_url: p.website_url,
        domain: p.domain,
        is_active: p.is_active,
        display_order: p.display_order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    return data as Platform[];
  } catch {
    return [];
  }
}

/**
 * Fetches active categories from Supabase, or falls back to INITIAL_CATEGORIES.
 */
export async function getActiveCategories(): Promise<Category[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return INITIAL_CATEGORIES.map((c, idx) => ({
        id: `seed-cat-${idx}`,
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon || null,
        display_order: c.display_order,
        is_active: c.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }

    return data as Category[];
  } catch {
    return [];
  }
}

/**
 * Retrieves the active tracking configuration for a given platform.
 */
export async function getTrackingConfig(platformId: string): Promise<TrackingConfig | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tracking_configs')
      .select('*')
      .eq('platform_id', platformId)
      .eq('is_enabled', true)
      .maybeSingle();

    if (error || !data) {
      // Check fallback from INITIAL_PLATFORMS
      const fallback = INITIAL_PLATFORMS.find((p) => p.default_tracking);
      if (fallback?.default_tracking) {
        return {
          id: 'seed-tracking-0',
          platform_id: platformId,
          tracking_parameter: fallback.default_tracking.parameter,
          tracking_value: fallback.default_tracking.default_value,
          is_enabled: fallback.default_tracking.is_enabled,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return null;
    }

    return data as TrackingConfig;
  } catch {
    return null;
  }
}
