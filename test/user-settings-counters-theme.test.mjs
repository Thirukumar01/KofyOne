/**
 * KofyOne - Automated Test Suite: User Settings, Theme Toggle, Preset Avatars & Counters
 * Verifies end-to-end functionality across frontend, API routes, and database migrations.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PRESET_AVATARS,
  DEFAULT_AVATAR_ID,
  isValidPresetAvatar,
  getPresetAvatar,
} from '../config/avatars.ts';

describe('1. Curated Preset Avatars & Security Guardrails', () => {
  test('defines exactly 6 official built-in preset avatars', () => {
    assert.equal(PRESET_AVATARS.length, 6, 'Must have exactly 6 preset avatars');
    const ids = PRESET_AVATARS.map((a) => a.id);
    assert.deepEqual(ids, [
      'avatar-student-1',
      'avatar-coder-2',
      'avatar-cloud-3',
      'avatar-ai-4',
      'avatar-rocket-5',
      'avatar-spark-6',
    ]);
  });

  test('each preset avatar has valid metadata, title, and gradient badge styling', () => {
    for (const avatar of PRESET_AVATARS) {
      assert.ok(avatar.id.startsWith('avatar-'), `ID must start with avatar-: ${avatar.id}`);
      assert.ok(avatar.name.length > 2, `Name must be descriptive: ${avatar.name}`);
      assert.ok(avatar.title.length > 2, `Title must be descriptive: ${avatar.title}`);
      assert.ok(avatar.bgClasses.includes('bg-gradient-to-br'), `Must have gradient classes: ${avatar.bgClasses}`);
      assert.ok(avatar.iconName, `Must specify an iconName: ${avatar.iconName}`);
    }
  });

  test('isValidPresetAvatar strictly approves valid official preset avatar IDs', () => {
    assert.equal(isValidPresetAvatar('avatar-student-1'), true);
    assert.equal(isValidPresetAvatar('avatar-coder-2'), true);
    assert.equal(isValidPresetAvatar('avatar-cloud-3'), true);
    assert.equal(isValidPresetAvatar('avatar-ai-4'), true);
    assert.equal(isValidPresetAvatar('avatar-rocket-5'), true);
    assert.equal(isValidPresetAvatar('avatar-spark-6'), true);
  });

  test('isValidPresetAvatar strictly rejects arbitrary external URLs (SSRF / Image tampering prevention)', () => {
    assert.equal(isValidPresetAvatar('https://evil.com/malicious.jpg'), false);
    assert.equal(isValidPresetAvatar('http://example.com/avatar.png'), false);
    assert.equal(isValidPresetAvatar('data:image/svg+xml;base64,PHN2Zy...'), false);
    assert.equal(isValidPresetAvatar('//cdn.example.com/photo.webp'), false);
    assert.equal(isValidPresetAvatar('/uploads/my-photo.png'), false);
  });

  test('isValidPresetAvatar rejects non-existent IDs, empty inputs, and invalid types', () => {
    assert.equal(isValidPresetAvatar(''), false);
    assert.equal(isValidPresetAvatar('   '), false);
    assert.equal(isValidPresetAvatar(null), false);
    assert.equal(isValidPresetAvatar(undefined), false);
    assert.equal(isValidPresetAvatar('avatar-unknown-999'), false);
    assert.equal(isValidPresetAvatar(12345), false);
  });

  test('getPresetAvatar safely resolves existing avatars and falls back to default', () => {
    const student = getPresetAvatar('avatar-student-1');
    assert.equal(student.id, 'avatar-student-1');
    assert.equal(student.name, 'Campus Learner');

    const coder = getPresetAvatar('avatar-coder-2');
    assert.equal(coder.id, 'avatar-coder-2');
    assert.equal(coder.name, 'Code Crafter');

    // Unknown or invalid falls back to DEFAULT_AVATAR_ID
    const fallback = getPresetAvatar('https://arbitrary-url.com/pic.png');
    assert.equal(fallback.id, DEFAULT_AVATAR_ID);
  });

  test('profile API routes enforce preset avatar validation (rejection of external URLs)', () => {
    const routeContent = fs.readFileSync(path.resolve('app/api/profile/route.ts'), 'utf8');
    assert.ok(routeContent.includes('isValidPresetAvatar'));
    assert.ok(routeContent.includes('Custom image URLs and file uploads are disabled'));

    const updateRouteContent = fs.readFileSync(path.resolve('app/api/profile/update/route.ts'), 'utf8');
    assert.ok(updateRouteContent.includes('isValidPresetAvatar'));
    assert.ok(updateRouteContent.includes('Custom image URLs and file uploads are disabled'));
  });
});

describe('2. Global Theme Toggle Engine & CSS Tokens', () => {
  const globalsCssPath = path.resolve('app/globals.css');
  const themeProviderPath = path.resolve('components/common/theme-provider.tsx');
  const rootLayoutPath = path.resolve('app/layout.tsx');

  test('app/globals.css configures Tailwind custom-variant and high-contrast light/dark tokens', () => {
    const content = fs.readFileSync(globalsCssPath, 'utf8');
    assert.ok(content.includes('@custom-variant dark'));
    assert.ok(content.includes('data-theme'));
    assert.ok(content.includes('--background: #ffffff;') || content.includes('--background: #f8fafc;'));
    assert.ok(content.includes('--background: #09090b;') || content.includes('--background: #18181b;'));
  });

  test('components/common/theme-provider.tsx exports ThemeProvider, useTheme, and ThemeToggle', () => {
    const content = fs.readFileSync(themeProviderPath, 'utf8');
    assert.ok(content.includes('export function ThemeProvider'));
    assert.ok(content.includes('export function useTheme'));
    assert.ok(content.includes('export function ThemeToggle'));
    assert.ok(content.includes('export function ThemeSelectorCards'));
    assert.ok(content.includes("'kofyone-theme'"));
  });

  test('app/layout.tsx executes zero-flicker inline theme initialization script', () => {
    const content = fs.readFileSync(rootLayoutPath, 'utf8');
    assert.ok(content.includes('ThemeProvider'));
    assert.ok(content.includes("localStorage.getItem('kofyone-theme')"));
    assert.ok(content.includes("setAttribute('data-theme'"));
    assert.ok(content.includes('suppressHydrationWarning'));
  });

  test('Header and MobileNav include ThemeToggle button for 1-click toggling', () => {
    const headerContent = fs.readFileSync(path.resolve('components/layout/header.tsx'), 'utf8');
    assert.ok(headerContent.includes('<ThemeToggle'));

    const mobileNavContent = fs.readFileSync(path.resolve('components/navigation/mobile-nav.tsx'), 'utf8');
    assert.ok(mobileNavContent.includes('<ThemeToggle'));
  });
});

describe('3. Database Migration & Counter RPC Security Inspection', () => {
  const migrationPath = path.resolve('supabase/migrations/20261028000000_user_settings_and_counters.sql');

  test('migration file exists and is populated with required functions', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.length > 800, 'Migration must have substantial content');
  });

  test('defines atomic increment_resource_view with SECURITY DEFINER and search_path = \'\'', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes('FUNCTION public.increment_resource_view(resource_slug TEXT)'));
    assert.ok(content.includes('SECURITY DEFINER'));
    assert.ok(content.includes("SET search_path = ''"));
    assert.ok(content.includes('GRANT EXECUTE ON FUNCTION public.increment_resource_view(TEXT) TO anon, authenticated, service_role;'));
  });

  test('defines atomic increment_resource_click with SECURITY DEFINER and search_path = \'\'', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes('FUNCTION public.increment_resource_click(resource_slug TEXT)'));
    assert.ok(content.includes('SECURITY DEFINER'));
    assert.ok(content.includes("SET search_path = ''"));
    assert.ok(content.includes('GRANT EXECUTE ON FUNCTION public.increment_resource_click(TEXT) TO anon, authenticated, service_role;'));
  });

  test('profiles table has least-privilege column grants for new user preferences', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes('REVOKE ALL ON public.profiles FROM authenticated;'));
    assert.ok(content.includes('GRANT SELECT ON public.profiles TO authenticated;'));
    assert.ok(content.includes('GRANT UPDATE ('));
    assert.ok(content.includes('display_name'));
    assert.ok(content.includes('avatar_url'));
    assert.ok(content.includes('theme_preference'));
  });

  test('defines deletion policies for clearing history and favorites', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes('Users can delete their own recently viewed'));
    assert.ok(content.includes('Users can delete their own favorites'));
  });
});

describe('4. Outbound Link Click Interception & View Count Wiring', () => {
  const redirectRoutePath = path.resolve('app/go/[slug]/route.ts');
  const viewRoutePath = path.resolve('app/api/resources/[slug]/view/route.ts');
  const resourceCardPath = path.resolve('components/resources/resource-card.tsx');
  const resourceDetailPath = path.resolve('app/(public)/resources/[slug]/page.tsx');

  test('/go/[slug] awaits increment_resource_click with timeout before 302 redirect', () => {
    const content = fs.readFileSync(redirectRoutePath, 'utf8');
    assert.ok(content.includes('increment_resource_click'));
    assert.ok(content.includes('Promise.race'));
    assert.ok(content.includes('NextResponse.redirect'));
    assert.ok(content.includes('{ status: 302 }'));
  });

  test('/api/resources/[slug]/view/route.ts executes atomic view increment and recent record', () => {
    const content = fs.readFileSync(viewRoutePath, 'utf8');
    assert.ok(content.includes('increment_resource_view'));
    assert.ok(content.includes('user_recently_viewed'));
    assert.ok(content.includes('view_count'));
  });

  test('ResourceCard displays formatted views (👁️ X views) and clicks (🔗 Y clicks) with /go/[slug] link', () => {
    const content = fs.readFileSync(resourceCardPath, 'utf8');
    assert.ok(content.includes('👁️'));
    assert.ok(content.includes('views'));
    assert.ok(content.includes('🔗'));
    assert.ok(content.includes('clicks'));
    assert.ok(content.includes('/go/${resource.slug}'));
  });

  test('Resource detail page displays formatted views and clicks and triggers view increment', () => {
    const content = fs.readFileSync(resourceDetailPath, 'utf8');
    assert.ok(content.includes('👁️'));
    assert.ok(content.includes('🔗'));
    assert.ok(content.includes('RecentTracker'));
    assert.ok(content.includes('/go/${resource.slug}'));
  });
});

describe('5. Admin Navigation & Attribution Settings Hub', () => {
  const siteConfigPath = path.resolve('config/site.ts');
  const adminHeaderPath = path.resolve('components/admin/admin-header.tsx');
  const adminSettingsPagePath = path.resolve('app/(admin)/admin/settings/page.tsx');
  const adminSettingsClientPath = path.resolve('app/(admin)/admin/settings/admin-settings-client.tsx');
  const revalidateRoutePath = path.resolve('app/api/admin/revalidate/route.ts');

  test('config/site.ts organizes admin navigation into Overview, Catalog, Content & Brand, and System', () => {
    const content = fs.readFileSync(siteConfigPath, 'utf8');
    assert.ok(content.includes('adminNavGroups'));
    assert.ok(content.includes("'Overview'"));
    assert.ok(content.includes("'Catalog'"));
    assert.ok(content.includes("'Content & Brand'"));
    assert.ok(content.includes("'System'"));
  });

  test('AdminHeader renders grouped navigation sections', () => {
    const content = fs.readFileSync(adminHeaderPath, 'utf8');
    assert.ok(content.includes('adminNavGroups'));
    assert.ok(content.includes('navGroup.group'));
  });

  test('admin settings page guards with admin role and renders contributor tracking manager', () => {
    const pageContent = fs.readFileSync(adminSettingsPagePath, 'utf8');
    assert.ok(pageContent.includes("profile.role !== 'admin'"));
    assert.ok(pageContent.includes('AdminSettingsClient'));

    const clientContent = fs.readFileSync(adminSettingsClientPath, 'utf8');
    assert.ok(clientContent.includes('Contributor Tracking & Attribution Manager'));
    assert.ok(clientContent.includes('trackingConfigs'));
    assert.ok(clientContent.includes('Catalog & Discovery Defaults'));
    assert.ok(clientContent.includes('handleRevalidateCache'));
  });

  test('revalidate API executes on-demand cache revalidation for root layout and catalog', () => {
    const content = fs.readFileSync(revalidateRoutePath, 'utf8');
    assert.ok(content.includes("revalidatePath('/', 'layout')"));
    assert.ok(content.includes("profile.role !== 'admin'"));
  });
});
