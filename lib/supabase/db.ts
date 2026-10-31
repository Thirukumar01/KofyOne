/**
 * KofyOne - Supabase Database Access Layer
 * Centralized, safe repository functions for querying platforms, categories,
 * resources, and tracking configs with multi-provider and seed fallback.
 */

import { createClient } from './server';
import { Platform } from '@/types/platform';
import { Category } from '@/types/category';
import { TrackingConfig } from '@/types/tracking';
import { ResourceWithRelations } from '@/types/resource';
import { SEED_PLATFORMS } from '@/lib/data/seed-platforms';
import { SEED_CATEGORIES, CANONICAL_SEED_RESOURCES } from '@/lib/data/seed-resources';
import { getCustomResources, deleteCustomResource, updateCustomResource } from '@/lib/data/custom-resources';
import { resolveResourceLogo } from '@/components/resources/resource-logo';

export interface DataResult<T> {
  data: T;
  error: Error | null;
}

export async function getActivePlatforms(): Promise<DataResult<Platform[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data && data.length > 0) {
      return { data: data as Platform[], error: null };
    }
    if (error) {
      console.warn('[DB] getActivePlatforms error, utilizing seed platforms:', error.message);
    }
    return { data: SEED_PLATFORMS, error: null };
  } catch (err) {
    console.warn('[DB] getActivePlatforms exception, utilizing seed platforms:', err instanceof Error ? err.message : err);
    return { data: SEED_PLATFORMS, error: null };
  }
}

export async function getActiveCategories(): Promise<DataResult<Category[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data && data.length > 0) {
      return { data: data as Category[], error: null };
    }
    if (error) {
      console.warn('[DB] getActiveCategories error, utilizing seed categories:', error.message);
    }
    return { data: SEED_CATEGORIES, error: null };
  } catch (err) {
    console.warn('[DB] getActiveCategories exception, utilizing seed categories:', err instanceof Error ? err.message : err);
    return { data: SEED_CATEGORIES, error: null };
  }
}

export async function getTrackingConfig(platformId: string): Promise<DataResult<TrackingConfig | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tracking_configs')
      .select('*')
      .eq('platform_id', platformId)
      .eq('is_enabled', true)
      .maybeSingle();

    if (error) {
      console.warn('[DB] getTrackingConfig warning:', error.message);
      return { data: null, error: null };
    }
    return { data: (data as TrackingConfig | null) ?? null, error: null };
  } catch (err) {
    console.warn('[DB] getTrackingConfig exception:', err instanceof Error ? err.message : err);
    return { data: null, error: null };
  }
}

export async function getPublishedResources(): Promise<DataResult<ResourceWithRelations[]>> {
  let dbResources: ResourceWithRelations[] = [];
  let fetchError: Error | null = null;
  let deletedSlugs = new Set<string>();

  try {
    const supabase = await createClient();

    // Check deleted blacklist
    try {
      const { data: delData } = await supabase.from('deleted_resource_slugs').select('slug');
      if (delData) {
        deletedSlugs = new Set(delData.map((d: { slug: string }) => d.slug));
      }
    } catch {
      // Ignore if table not yet migrated
    }

    const { data, error } = await supabase
      .from('resources')
      .select('*, platforms(*), tracking_configs(*), resource_categories(categories(*))')
      .eq('is_published', true)
      .order('featured', { ascending: false })
      .order('display_order');

    if (data && data.length > 0) {
      dbResources = ((data ?? []) as unknown[]).map((row) => {
        const value = row as Record<string, unknown>;
        const slug = (value.slug as string) || '';
        return {
          ...(value as unknown as import('@/types/resource').Resource),
          logo_url: (value.logo_url as string | null) || resolveResourceLogo(slug),
          platform: (value.platforms as Platform) || SEED_PLATFORMS[0],
          tracking_config: (value.tracking_configs as TrackingConfig | null) || null,
          categories: ((value.resource_categories as Array<{ categories: Category }> | undefined) ?? [])
            .map((entry) => entry.categories),
        };
      });
    }
    if (error) fetchError = new Error(error.message);
  } catch (error) {
    fetchError = error instanceof Error ? error : new Error('Unable to load resources.');
  }

  // Merge canonical seed resources for any not present in DB and not deleted
  const canonicalPublished = CANONICAL_SEED_RESOURCES.filter(
    (r) => r.is_published && !deletedSlugs.has(r.slug)
  );
  const dbSlugs = new Set(dbResources.map((r) => r.slug));
  const missingCanonical = canonicalPublished.filter((c) => !dbSlugs.has(c.slug));

  // Merge custom resources created by administrator (filtering deleted)
  const custom = getCustomResources().filter((r) => r.is_published && !deletedSlugs.has(r.slug));
  const allExistingSlugs = new Set([...dbSlugs, ...missingCanonical.map((c) => c.slug)]);
  const uniqueCustom = custom.filter((c) => !allExistingSlugs.has(c.slug));

  const merged = [...uniqueCustom, ...dbResources.filter((r) => !deletedSlugs.has(r.slug)), ...missingCanonical];
  return { data: merged, error: merged.length > 0 ? null : fetchError };
}

export async function getAllAdminResources(): Promise<ResourceWithRelations[]> {
  const { data: published } = await getPublishedResources();
  const customAll = getCustomResources();
  const publishedSlugs = new Set(published.map((r) => r.slug));

  // Add custom resources that might be drafts (is_published = false)
  const drafts = customAll.filter((c) => !publishedSlugs.has(c.slug));

  // Map and prioritize custom edits over seed
  const customMap = new Map(customAll.map((r) => [r.id, r]));
  const result = [...drafts, ...published].map((res) => {
    return customMap.get(res.id) || res;
  });

  return result;
}

export async function getResourceByIdOrSlug(idOrSlug: string): Promise<ResourceWithRelations | null> {
  const all = await getAllAdminResources();
  return all.find((r) => r.id === idOrSlug || r.slug === idOrSlug) || null;
}

export async function getPublishedResourceBySlug(slug: string) {
  const result = await getPublishedResources();
  return {
    data: result.data.find((resource) => resource.slug === slug) ?? null,
    error: result.error,
  };
}

export async function deleteResourceById(id: string): Promise<boolean> {
  // 1. Delete via SECURITY DEFINER stored procedure (removes DB row & blacklists slug)
  try {
    const supabase = await createClient();
    await (supabase.rpc as unknown as (
      fn: string,
      args: { p_identifier: string }
    ) => Promise<unknown>)('admin_delete_resource', {
      p_identifier: id,
    });
  } catch {
    // Non-fatal fallback
  }

  // 2. Also remove from local custom resources
  deleteCustomResource(id);

  return true;
}

export async function updateResourceById(
  id: string,
  updates: Partial<ResourceWithRelations>
): Promise<ResourceWithRelations | null> {
  // 1. Try atomic admin_save_resource RPC
  try {
    const supabase = await createClient();
    const payload = {
      id,
      name: updates.name,
      slug: updates.slug,
      description: updates.description,
      official_url: updates.official_url,
      featured: updates.featured,
      is_published: updates.is_published,
      logo_url: updates.logo_url,
      contributor_id: updates.contributor_id,
      subcategory: updates.subcategory,
      platform_id: updates.platform_id || updates.platform?.id || updates.platform?.slug,
      category_slug: updates.categories?.[0]?.slug,
      tags: updates.tags,
    };

    const { data: rpcRes, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: { p_payload: Record<string, unknown> }
    ) => Promise<{ data: { success?: boolean; resource?: ResourceWithRelations } | null; error: unknown }>)(
      'admin_save_resource',
      { p_payload: payload }
    );

    if (!error && rpcRes?.resource) {
      updateCustomResource(id, rpcRes.resource);
      return rpcRes.resource;
    }
  } catch {
    // Fall back to direct updates
  }

  // 2. Fallback in custom resources
  const updated = updateCustomResource(id, updates);
  return updated;
}
