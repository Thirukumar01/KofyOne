import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Admin Full Control & Seed Tombstoning Test Suite', () => {
  const fullControlMigrationPath = path.resolve('supabase/migrations/20261031180000_admin_full_control_existing_resources.sql');
  const dbLayerPath = path.resolve('lib/supabase/db.ts');
  const searchServicePath = path.resolve('lib/search/search-service.ts');
  const adminResourcesRoute = path.resolve('app/api/admin/resources/route.ts');
  const adminResourceItemRoute = path.resolve('app/api/admin/resources/[id]/route.ts');
  const adminPlatformsRoute = path.resolve('app/api/admin/platforms/route.ts');
  const adminPlatformItemRoute = path.resolve('app/api/admin/platforms/[id]/route.ts');
  const adminCategoriesRoute = path.resolve('app/api/admin/categories/route.ts');
  const adminCategoryItemRoute = path.resolve('app/api/admin/categories/[id]/route.ts');
  const adminResourcesClientPath = path.resolve('app/(admin)/admin/resources/admin-resources-client.tsx');
  const adminPlatformsClientPath = path.resolve('app/(admin)/admin/platforms/admin-platforms-client.tsx');
  const adminCategoriesClientPath = path.resolve('app/(admin)/admin/categories/admin-categories-client.tsx');

  test('STEP 1: Migration creates deleted_catalog_items, CASCADE foreign keys, and all 6 Admin RPCs', () => {
    assert.ok(fs.existsSync(fullControlMigrationPath), 'Migration 20261031180000 must exist');
    const sql = fs.readFileSync(fullControlMigrationPath, 'utf8');

    // Tombstone table
    assert.ok(sql.includes('TABLE IF NOT EXISTS public.deleted_catalog_items'));
    assert.ok(sql.includes('item_type TEXT NOT NULL'));
    assert.ok(sql.includes('identifier TEXT NOT NULL'));
    assert.ok(sql.includes('PRIMARY KEY (item_type, identifier)'));

    // Cascade foreign keys
    assert.ok(sql.includes('CASCADE') || sql.includes('ON DELETE CASCADE'));

    // Upgraded Resource RPCs
    assert.ok(sql.includes('FUNCTION public.admin_save_resource(p_payload JSONB)'));
    assert.ok(sql.includes('FUNCTION public.admin_delete_resource(p_identifier TEXT)'));

    // Platform RPCs
    assert.ok(sql.includes('FUNCTION public.admin_save_platform(p_payload JSONB)'));
    assert.ok(sql.includes('FUNCTION public.admin_delete_platform(p_identifier TEXT)'));

    // Category RPCs
    assert.ok(sql.includes('FUNCTION public.admin_save_category(p_payload JSONB)'));
    assert.ok(sql.includes('FUNCTION public.admin_delete_category(p_identifier TEXT)'));

    // Security & Permissions
    assert.ok(sql.includes('SECURITY DEFINER'));
    assert.ok(sql.includes("SET search_path = ''"));
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.admin_save_platform'));
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.admin_delete_platform'));
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.admin_save_category'));
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.admin_delete_category'));
  });

  test('STEP 2: lib/supabase/db.ts checks deleted_catalog_items and ensures DB overrides seeds', () => {
    const content = fs.readFileSync(dbLayerPath, 'utf8');

    // deleted_catalog_items checked
    assert.ok(content.includes('deleted_catalog_items'));
    assert.ok(content.includes("eq('item_type', 'platform')"));
    assert.ok(content.includes("eq('item_type', 'category')"));
    assert.ok(content.includes("eq('item_type', 'resource')"));

    // Overriding logic
    assert.ok(content.includes('dbSlugs'));
    assert.ok(content.includes('missingSeeds') || content.includes('missingCanonical'));

    // CRUD functions
    assert.ok(content.includes('deleteResourceById'));
    assert.ok(content.includes('updateResourceById'));
    assert.ok(content.includes('getAllAdminResources'));
    assert.ok(content.includes('getPublishedResources'));
  });

  test('STEP 2: lib/search/search-service.ts filters out deleted catalog items', () => {
    const content = fs.readFileSync(searchServicePath, 'utf8');
    assert.ok(content.includes('deleted_catalog_items'));
    assert.ok(content.includes('deletedIdentifiers'));
  });

  test('STEP 3: Admin Resource APIs support bulk delete and slug updates with tombstoning', () => {
    const routeContent = fs.readFileSync(adminResourcesRoute, 'utf8');
    // Bulk delete support
    assert.ok(routeContent.includes('Array.isArray(body.ids)'));
    assert.ok(routeContent.includes('admin_delete_resource'));

    const itemRouteContent = fs.readFileSync(adminResourceItemRoute, 'utf8');
    assert.ok(itemRouteContent.includes('original_slug'));
    assert.ok(itemRouteContent.includes('slugify'));
  });

  test('STEP 3: Admin Platform & Category API routes exist with full CRUD', () => {
    assert.ok(fs.existsSync(adminPlatformsRoute));
    assert.ok(fs.existsSync(adminPlatformItemRoute));
    assert.ok(fs.existsSync(adminCategoriesRoute));
    assert.ok(fs.existsSync(adminCategoryItemRoute));

    const platRoute = fs.readFileSync(adminPlatformsRoute, 'utf8');
    assert.ok(platRoute.includes('admin_save_platform'));
    assert.ok(platRoute.includes('admin_delete_platform'));

    const catRoute = fs.readFileSync(adminCategoriesRoute, 'utf8');
    assert.ok(catRoute.includes('admin_save_category'));
    assert.ok(catRoute.includes('admin_delete_category'));
  });

  test('STEP 3: Admin UI clients provide full interactive CRUD and Bulk Actions', () => {
    // Resources Client
    const resClient = fs.readFileSync(adminResourcesClientPath, 'utf8');
    assert.ok(resClient.includes('selectedIds'));
    assert.ok(resClient.includes('handleToggleSelectAll'));
    assert.ok(resClient.includes('handleBulkDeleteConfirm'));
    assert.ok(resClient.includes('handleTogglePublish'));

    // Platforms Client
    const platClient = fs.readFileSync(adminPlatformsClientPath, 'utf8');
    assert.ok(platClient.includes('handleOpenCreate'));
    assert.ok(platClient.includes('handleOpenEdit'));
    assert.ok(platClient.includes('handleDeleteConfirm'));
    assert.ok(platClient.includes('handleToggleActive'));

    // Categories Client
    const catClient = fs.readFileSync(adminCategoriesClientPath, 'utf8');
    assert.ok(catClient.includes('handleOpenCreate'));
    assert.ok(catClient.includes('handleOpenEdit'));
    assert.ok(catClient.includes('handleDeleteConfirm'));
    assert.ok(catClient.includes('handleToggleActive'));
  });
});
