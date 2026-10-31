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
  const deletedIdentifiers = new Set<string>();
  try {
    const supabase = await createClient();
    try {
      const { data: del } = await supabase
        .from('deleted_catalog_items')
        .select('identifier')
        .eq('item_type', 'platform');
      if (del) {
        del.forEach((d: { identifier: string }) => deletedIdentifiers.add(d.identifier));
      }
    } catch {
      // Non-fatal if table not yet migrated
    }

    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    const filteredSeeds = SEED_PLATFORMS.filter(
      (p) => !deletedIdentifiers.has(p.id) && !deletedIdentifiers.has(p.slug)
    );

    if (data && data.length > 0) {
      const dbPlatforms = (data as Platform[]).filter(
        (p) => !deletedIdentifiers.has(p.id) && !deletedIdentifiers.has(p.slug)
      );
      const dbSlugs = new Set(dbPlatforms.map((p) => p.slug));
      const dbIds = new Set(dbPlatforms.map((p) => p.id));
      const missingSeeds = filteredSeeds.filter((s) => !dbSlugs.has(s.slug) && !dbIds.has(s.id));
      return { data: [...dbPlatforms, ...missingSeeds], error: null };
    }
    if (error) {
      console.warn('[DB] getActivePlatforms error, utilizing seed platforms:', error.message);
    }
    return { data: filteredSeeds, error: null };
  } catch (err) {
    console.warn('[DB] getActivePlatforms exception, utilizing seed platforms:', err instanceof Error ? err.message : err);
    return {
      data: SEED_PLATFORMS.filter((p) => !deletedIdentifiers.has(p.id) && !deletedIdentifiers.has(p.slug)),
      error: null,
    };
  }
}

export async function getActiveCategories(): Promise<DataResult<Category[]>> {
  const deletedIdentifiers = new Set<string>();
  try {
    const supabase = await createClient();
    try {
      const { data: del } = await supabase
        .from('deleted_catalog_items')
        .select('identifier')
        .eq('item_type', 'category');
      if (del) {
        del.forEach((d: { identifier: string }) => deletedIdentifiers.add(d.identifier));
      }
    } catch {
      // Non-fatal if table not yet migrated
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    const filteredSeeds = SEED_CATEGORIES.filter(
      (c) => !deletedIdentifiers.has(c.id) && !deletedIdentifiers.has(c.slug)
    );

    if (data && data.length > 0) {
      const dbCategories = (data as Category[]).filter(
        (c) => !deletedIdentifiers.has(c.id) && !deletedIdentifiers.has(c.slug)
      );
      const dbSlugs = new Set(dbCategories.map((c) => c.slug));
      const dbIds = new Set(dbCategories.map((c) => c.id));
      const missingSeeds = filteredSeeds.filter((s) => !dbSlugs.has(s.slug) && !dbIds.has(s.id));
      return { data: [...dbCategories, ...missingSeeds], error: null };
    }
    if (error) {
      console.warn('[DB] getActiveCategories error, utilizing seed categories:', error.message);
    }
    return { data: filteredSeeds, error: null };
  } catch (err) {
    console.warn('[DB] getActiveCategories exception, utilizing seed categories:', err instanceof Error ? err.message : err);
    return {
      data: SEED_CATEGORIES.filter((c) => !deletedIdentifiers.has(c.id) && !deletedIdentifiers.has(c.slug)),
      error: null,
    };
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
  const deletedIdentifiers = new Set<string>();

  try {
    const supabase = await createClient();

    // Check deleted blacklist from both deleted_resource_slugs and deleted_catalog_items
    try {
      const [delRes1, delRes2] = await Promise.all([
        supabase.from('deleted_resource_slugs').select('slug'),
        supabase.from('deleted_catalog_items').select('identifier').eq('item_type', 'resource'),
      ]);
      if (delRes1.data) {
        delRes1.data.forEach((d: { slug: string }) => deletedIdentifiers.add(d.slug));
      }
      if (delRes2.data) {
        delRes2.data.forEach((d: { identifier: string }) => deletedIdentifiers.add(d.identifier));
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

  // Filter out any db resources that were tombstoned
  const filteredDbResources = dbResources.filter(
    (r) => !deletedIdentifiers.has(r.id) && !deletedIdentifiers.has(r.slug)
  );

  const dbSlugs = new Set(filteredDbResources.map((r) => r.slug));
  const dbIds = new Set(filteredDbResources.map((r) => r.id));

  // Canonical seed resources: must be published, NOT tombstoned, and NOT overridden by DB (by slug or id)
  const canonicalPublished = CANONICAL_SEED_RESOURCES.filter(
    (r) =>
      r.is_published &&
      !deletedIdentifiers.has(r.id) &&
      !deletedIdentifiers.has(r.slug) &&
      !dbSlugs.has(r.slug) &&
      !dbIds.has(r.id)
  );

  // Custom resources created by administrator (filtering deleted and already present in DB or seeds)
  const existingSlugs = new Set([...dbSlugs, ...canonicalPublished.map((c) => c.slug)]);
  const existingIds = new Set([...dbIds, ...canonicalPublished.map((c) => c.id)]);
  const custom = getCustomResources().filter(
    (r) =>
      r.is_published &&
      !deletedIdentifiers.has(r.id) &&
      !deletedIdentifiers.has(r.slug) &&
      !existingSlugs.has(r.slug) &&
      !existingIds.has(r.id)
  );

  const merged = [...filteredDbResources, ...custom, ...canonicalPublished];
  return { data: merged, error: merged.length > 0 ? null : fetchError };
}

export async function getAllAdminResources(): Promise<ResourceWithRelations[]> {
  let dbResources: ResourceWithRelations[] = [];
  const deletedIdentifiers = new Set<string>();

  try {
    const supabase = await createClient();

    try {
      const [delRes1, delRes2] = await Promise.all([
        supabase.from('deleted_resource_slugs').select('slug'),
        supabase.from('deleted_catalog_items').select('identifier').eq('item_type', 'resource'),
      ]);
      if (delRes1.data) {
        delRes1.data.forEach((d: { slug: string }) => deletedIdentifiers.add(d.slug));
      }
      if (delRes2.data) {
        delRes2.data.forEach((d: { identifier: string }) => deletedIdentifiers.add(d.identifier));
      }
    } catch {}

    // Query ALL resources from DB (both published and drafts)
    const { data } = await supabase
      .from('resources')
      .select('*, platforms(*), tracking_configs(*), resource_categories(categories(*))')
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
  } catch (err) {
    console.warn('[DB] getAllAdminResources error fetching DB resources:', err);
  }

  // Filter DB resources by tombstone
  const filteredDbResources = dbResources.filter(
    (r) => !deletedIdentifiers.has(r.id) && !deletedIdentifiers.has(r.slug)
  );

  const dbSlugs = new Set(filteredDbResources.map((r) => r.slug));
  const dbIds = new Set(filteredDbResources.map((r) => r.id));

  // Canonical seeds (not tombstoned and not already in DB)
  const missingSeeds = CANONICAL_SEED_RESOURCES.filter(
    (r) =>
      !deletedIdentifiers.has(r.id) &&
      !deletedIdentifiers.has(r.slug) &&
      !dbSlugs.has(r.slug) &&
      !dbIds.has(r.id)
  );

  // Custom resources (not tombstoned and not already in DB or seeds)
  const existingSlugs = new Set([...dbSlugs, ...missingSeeds.map((c) => c.slug)]);
  const existingIds = new Set([...dbIds, ...missingSeeds.map((c) => c.id)]);
  const customAll = getCustomResources().filter(
    (r) =>
      !deletedIdentifiers.has(r.id) &&
      !deletedIdentifiers.has(r.slug) &&
      !existingSlugs.has(r.slug) &&
      !existingIds.has(r.id)
  );

  return [...filteredDbResources, ...customAll, ...missingSeeds];
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
