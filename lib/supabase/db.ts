/**
 * KofyOne - Supabase Database Access Layer
 * Centralized, safe repository functions for querying platforms, categories,
 * and tracking configs with fallback to seed configuration.
 */

import { createClient } from './server';
import { Platform } from '@/types/platform';
import { Category } from '@/types/category';
import { TrackingConfig } from '@/types/tracking';
export interface DataResult<T> {
  data: T;
  error: Error | null;
}

export async function getActivePlatforms(): Promise<DataResult<Platform[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('platforms').select('*').eq('is_active', true).order('display_order');
    return { data: (data as Platform[] | null) ?? [], error: error ? new Error(error.message) : null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error : new Error('Unable to load platforms.') };
  }
}

export async function getActiveCategories(): Promise<DataResult<Category[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('display_order');
    return { data: (data as Category[] | null) ?? [], error: error ? new Error(error.message) : null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error : new Error('Unable to load categories.') };
  }
}

export async function getTrackingConfig(platformId: string): Promise<DataResult<TrackingConfig | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('tracking_configs').select('*')
      .eq('platform_id', platformId).eq('is_enabled', true).maybeSingle();
    return { data: (data as TrackingConfig | null) ?? null, error: error ? new Error(error.message) : null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Unable to load tracking configuration.') };
  }
}

export async function getPublishedResources(): Promise<DataResult<import('@/types/resource').ResourceWithRelations[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('resources').select('*, platforms(*), tracking_configs(*), resource_categories(categories(*))')
      .eq('is_published', true).order('featured', { ascending: false }).order('display_order');
    const resources = ((data ?? []) as unknown[]).map((row) => {
      const value = row as Record<string, unknown>;
      return {
        ...(value as unknown as import('@/types/resource').Resource),
        platform: value.platforms as Platform,
        tracking_config: value.tracking_configs as TrackingConfig | null,
        categories: ((value.resource_categories as Array<{ categories: Category }> | undefined) ?? [])
          .map((entry) => entry.categories),
      };
    });
    return { data: resources, error: error ? new Error(error.message) : null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error : new Error('Unable to load resources.') };
  }
}

export async function getPublishedResourceBySlug(slug: string) {
  const result = await getPublishedResources();
  return {
    data: result.data.find((resource) => resource.slug === slug) ?? null,
    error: result.error,
  };
}
