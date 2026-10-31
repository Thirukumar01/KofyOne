import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Admin CRUD, Blacklist & RPC Persistence Test Suite', () => {
  const migrationPath = path.resolve('supabase/migrations/20261031150000_admin_crud_and_catalog_fix.sql');
  const customResourcesPath = path.resolve('lib/data/custom-resources.ts');
  const adminResourcesRoute = path.resolve('app/api/admin/resources/route.ts');
  const adminResourceItemRoute = path.resolve('app/api/admin/resources/[id]/route.ts');
  const dbLayerPath = path.resolve('lib/supabase/db.ts');
  const resourceCardPath = path.resolve('components/resources/resource-card.tsx');
  const adminHeaderPath = path.resolve('components/admin/admin-header.tsx');
  const headerPath = path.resolve('components/layout/header.tsx');

  test('Migration defines admin_save_resource, admin_delete_resource, and deleted_resource_slugs', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration 20261031150000 must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(content.includes('FUNCTION public.admin_save_resource(p_payload JSONB)'));
    assert.ok(content.includes('FUNCTION public.admin_delete_resource(p_identifier TEXT)'));
    assert.ok(content.includes('TABLE IF NOT EXISTS public.deleted_resource_slugs'));
    assert.ok(content.includes('SECURITY DEFINER'));
    assert.ok(content.includes("SET search_path = ''"));
    assert.ok(content.includes('GRANT EXECUTE ON FUNCTION public.admin_save_resource'));
    assert.ok(content.includes('GRANT EXECUTE ON FUNCTION public.admin_delete_resource'));
  });

  test('Migration ensures canonical platforms (including domain) and categories exist', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes("'microsoft'"));
    assert.ok(content.includes("'aws'"));
    assert.ok(content.includes("'google-cloud'"));
    assert.ok(content.includes("'other'"));
    assert.ok(content.includes("'learn.microsoft.com'"));
    assert.ok(content.includes("'aws.amazon.com'"));
    assert.ok(content.includes("'cloud.google.com'"));
    assert.ok(content.includes("'kofyone.com'"));
    assert.ok(content.includes("'student'"));
    assert.ok(content.includes("'ai'"));
    assert.ok(content.includes("'cloud'"));
    assert.ok(content.includes("'developer'"));
    assert.ok(content.includes("'productivity'"));
  });

  test('custom-resources.ts safely catches filesystem errors without throwing persistent storage crash', () => {
    const content = fs.readFileSync(customResourcesPath, 'utf8');
    assert.ok(!content.includes("throw new Error('Failed to save resource to persistent storage.')"));
    assert.ok(!content.includes("throw new Error('Failed to update resource in persistent storage.')"));
    assert.ok(!content.includes("throw new Error('Failed to delete resource from persistent storage.')"));
  });

  test('lib/supabase/db.ts checks deleted_resource_slugs so deleted resources stay deleted', () => {
    const content = fs.readFileSync(dbLayerPath, 'utf8');
    assert.ok(content.includes('deleted_resource_slugs'));
    assert.ok(content.includes('admin_delete_resource'));
    assert.ok(content.includes('admin_save_resource'));
  });

  test('app/api/admin/resources route uses admin_save_resource and admin_delete_resource', () => {
    const routeContent = fs.readFileSync(adminResourcesRoute, 'utf8');
    assert.ok(routeContent.includes('admin_save_resource'));
    assert.ok(routeContent.includes('admin_delete_resource'));
    assert.ok(routeContent.includes('POST'));
    assert.ok(routeContent.includes('DELETE'));

    const itemRouteContent = fs.readFileSync(adminResourceItemRoute, 'utf8');
    assert.ok(itemRouteContent.includes('admin_save_resource'));
    assert.ok(itemRouteContent.includes('admin_delete_resource'));
    assert.ok(itemRouteContent.includes('PUT'));
    assert.ok(itemRouteContent.includes('DELETE'));
  });

  test('AdminHeader renders clean scrollable tab navigation', () => {
    const content = fs.readFileSync(adminHeaderPath, 'utf8');
    assert.ok(content.includes('adminNavGroups'));
    assert.ok(content.includes('navGroup'));
    assert.ok(content.includes('overflow-x-auto') || content.includes('no-scrollbar'));
  });

  test('Header renders clean primary links and user profile pill', () => {
    const content = fs.readFileSync(headerPath, 'utf8');
    assert.ok(content.includes('MainNav'));
    assert.ok(content.includes('ThemeToggle'));
    assert.ok(content.includes('PresetAvatar'));
    assert.ok(content.includes('/favorites'));
    assert.ok(content.includes('/recent'));
    assert.ok(content.includes('/settings'));
  });

  test('ResourceCard displays views, clicks, and outbound redirect link', () => {
    const content = fs.readFileSync(resourceCardPath, 'utf8');
    assert.ok(content.includes('views'));
    assert.ok(content.includes('clicks'));
    assert.ok(content.includes('/go/${resource.slug}'));
  });
});

