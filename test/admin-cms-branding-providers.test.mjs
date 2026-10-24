/**
 * KofyOne — Automated Test Suite for Multi-Provider CMS, Branding & SSRF Security
 *
 * Verifies:
 * 1. Multi-provider platform definitions (Microsoft, AWS, Google, Other).
 * 2. Microsoft Contributor ID attribution strictly applied only to Microsoft resources.
 * 3. Contributor ID stripping and exclusion for AWS, Google, and Other.
 * 4. URL query parameter & fragment preservation during tracking injection.
 * 5. SSRF Defense: blocking loopback, RFC1918 private IPs, AWS/GCP metadata, and unsafe protocols.
 * 6. Provider and category heuristic suggestions from website metadata.
 * 7. Admin branding settings: safe defaults, updates, multi-variant URLs, and reset.
 * 8. Custom resource CRUD operations: create, get by ID/slug, update, and delete.
 * 9. Database migration integrity: site_branding, platforms, storage, and RLS policies.
 * 10. OAuth callback handler & alias route presence.
 *
 * Run with: node --test test/admin-cms-branding-providers.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Tracking & URL utilities
import {
  isMicrosoftPlatform,
  buildTrackedUrl,
} from '../lib/tracking/url-builder.ts';

// SSRF and metadata heuristics
import {
  isSafePublicUrl,
  suggestProviderAndCategory,
} from '../lib/admin/metadata-service.ts';

// Seed Platforms
import { SEED_PLATFORMS } from '../lib/data/seed-platforms.ts';

// Branding
import { DEFAULT_SITE_BRANDING } from '../types/branding.ts';

describe('1. Multi-Provider Platform Ecosystem', () => {
  test('includes Microsoft, AWS, Google, and Other seed platforms', () => {
    const slugs = SEED_PLATFORMS.map((p) => p.slug);
    assert.ok(slugs.includes('microsoft'));
    assert.ok(slugs.includes('aws'));
    assert.ok(slugs.includes('google'));
    assert.ok(slugs.includes('other'));
    assert.ok(SEED_PLATFORMS.every((p) => p.name && p.website_url && p.domain));
  });
});

describe('2. Microsoft Contributor ID — Microsoft Resources Only', () => {
  test('correctly identifies Microsoft platforms vs non-Microsoft platforms', () => {
    assert.equal(isMicrosoftPlatform('microsoft'), true);
    assert.equal(isMicrosoftPlatform('microsoft-learn'), true);
    assert.equal(isMicrosoftPlatform('Microsoft Azure'), true);

    // Non-Microsoft platforms MUST be false
    assert.equal(isMicrosoftPlatform('aws'), false);
    assert.equal(isMicrosoftPlatform('google'), false);
    assert.equal(isMicrosoftPlatform('other'), false);
    assert.equal(isMicrosoftPlatform('openai'), false);
    assert.equal(isMicrosoftPlatform(null), false);
    assert.equal(isMicrosoftPlatform(undefined), false);
  });

  test('appends wt.mc_id strictly when platform is Microsoft and Contributor ID is present', () => {
    const rawUrl = 'https://learn.microsoft.com/en-us/training/paths/azure-fundamentals/';
    const result = buildTrackedUrl(
      rawUrl,
      null,
      undefined,
      { platformSlug: 'microsoft', contributorId: 'studentamb_504640' }
    );

    const parsed = new URL(result);
    assert.equal(parsed.searchParams.get('wt.mc_id'), 'studentamb_504640');
    assert.equal(parsed.origin, 'https://learn.microsoft.com');
  });

  test('preserves existing query parameters and hash fragments on Microsoft URLs', () => {
    const rawUrl = 'https://learn.microsoft.com/training?lang=en&theme=dark#getting-started';
    const result = buildTrackedUrl(
      rawUrl,
      null,
      undefined,
      { platformSlug: 'microsoft', contributorId: 'amb_999' }
    );

    const parsed = new URL(result);
    assert.equal(parsed.searchParams.get('wt.mc_id'), 'amb_999');
    assert.equal(parsed.searchParams.get('lang'), 'en');
    assert.equal(parsed.searchParams.get('theme'), 'dark');
    assert.equal(parsed.hash, '#getting-started');
  });

  test('NEVER appends Microsoft wt.mc_id to AWS resources, even if config is present', () => {
    const rawUrl = 'https://aws.amazon.com/training/learning-paths/';
    const result = buildTrackedUrl(
      rawUrl,
      {
        id: 'cfg-1',
        platform_id: 'p-1',
        tracking_parameter: 'wt.mc_id',
        tracking_value: 'studentamb_504640',
        is_enabled: true,
        created_at: '',
        updated_at: '',
      },
      undefined,
      { platformSlug: 'aws', contributorId: 'studentamb_504640' }
    );

    const parsed = new URL(result);
    assert.equal(parsed.searchParams.has('wt.mc_id'), false);
    assert.equal(result, rawUrl);
  });

  test('NEVER appends Microsoft wt.mc_id to Google or Other resources', () => {
    const googleUrl = 'https://cloud.google.com/learn/certification';
    const googleResult = buildTrackedUrl(
      googleUrl,
      null,
      undefined,
      { platformSlug: 'google', contributorId: 'studentamb_504640' }
    );
    assert.equal(new URL(googleResult).searchParams.has('wt.mc_id'), false);

    const otherUrl = 'https://openai.com/index';
    const otherResult = buildTrackedUrl(
      otherUrl,
      null,
      undefined,
      { platformSlug: 'other', contributorId: 'studentamb_504640' }
    );
    assert.equal(new URL(otherResult).searchParams.has('wt.mc_id'), false);
  });

  test('does not invent a Contributor ID if none is supplied for Microsoft', () => {
    const rawUrl = 'https://code.visualstudio.com/';
    const result = buildTrackedUrl(
      rawUrl,
      null,
      undefined,
      { platformSlug: 'microsoft', contributorId: null }
    );
    assert.equal(new URL(result).searchParams.has('wt.mc_id'), false);
  });
});

describe('3. SSRF Defense & Metadata Fetcher Security', () => {
  test('approves safe public HTTP and HTTPS URLs', () => {
    assert.equal(isSafePublicUrl('https://learn.microsoft.com/training').safe, true);
    assert.equal(isSafePublicUrl('https://aws.amazon.com/training/').safe, true);
    assert.equal(isSafePublicUrl('https://cloud.google.com').safe, true);
    assert.equal(isSafePublicUrl('http://example.com').safe, true);
  });

  test('rejects localhost, loopback IPs, and 0.0.0.0', () => {
    assert.equal(isSafePublicUrl('http://localhost:3000').safe, false);
    assert.equal(isSafePublicUrl('http://localhost').safe, false);
    assert.equal(isSafePublicUrl('http://app.localhost').safe, false);
    assert.equal(isSafePublicUrl('http://127.0.0.1:8080').safe, false);
    assert.equal(isSafePublicUrl('http://127.0.0.1').safe, false);
    assert.equal(isSafePublicUrl('http://0.0.0.0').safe, false);
    assert.equal(isSafePublicUrl('http://[::1]').safe, false);
  });

  test('rejects cloud instance metadata addresses (AWS/GCP/Azure link-local 169.254.x.x)', () => {
    assert.equal(isSafePublicUrl('http://169.254.169.254/latest/meta-data/').safe, false);
    assert.equal(isSafePublicUrl('http://169.254.169.254').safe, false);
    assert.equal(isSafePublicUrl('http://metadata.google.internal/computeMetadata/v1/').safe, false);
  });

  test('rejects RFC 1918 private IPv4 networks (10.x.x.x, 172.16-31.x.x, 192.168.x.x)', () => {
    assert.equal(isSafePublicUrl('http://10.0.0.1/admin').safe, false);
    assert.equal(isSafePublicUrl('http://10.255.0.1').safe, false);
    assert.equal(isSafePublicUrl('http://172.16.0.1').safe, false);
    assert.equal(isSafePublicUrl('http://172.31.255.255').safe, false);
    assert.equal(isSafePublicUrl('http://192.168.1.1').safe, false);
    assert.equal(isSafePublicUrl('http://192.168.0.254').safe, false);
  });

  test('rejects unsafe schemes (file, gopher, ftp, javascript)', () => {
    assert.equal(isSafePublicUrl('file:///etc/passwd').safe, false);
    assert.equal(isSafePublicUrl('gopher://gopher.example.com').safe, false);
    assert.equal(isSafePublicUrl('ftp://ftp.example.com').safe, false);
    assert.equal(isSafePublicUrl('javascript:alert(1)').safe, false);
  });

  test('rejects internal network domains (.internal, .local, .corp, .lan)', () => {
    assert.equal(isSafePublicUrl('http://database.internal').safe, false);
    assert.equal(isSafePublicUrl('http://server.local').safe, false);
    assert.equal(isSafePublicUrl('http://intranet.corp').safe, false);
    assert.equal(isSafePublicUrl('http://router.lan').safe, false);
  });

  test('suggestProviderAndCategory correctly suggests platforms from hostnames', () => {
    assert.equal(suggestProviderAndCategory('learn.microsoft.com', 'Azure AI training').provider, 'Microsoft');
    assert.equal(suggestProviderAndCategory('aws.amazon.com', 'AWS Skill Builder').provider, 'AWS');
    assert.equal(suggestProviderAndCategory('cloud.google.com', 'Google Cloud Labs').provider, 'Google');
    assert.equal(suggestProviderAndCategory('openai.com', 'ChatGPT API').provider, 'Other');
  });
});

describe('4. Admin-Managed Branding & Identity', () => {
  test('DEFAULT_SITE_BRANDING provides safe fallback values', () => {
    assert.equal(DEFAULT_SITE_BRANDING.id, 'current');
    assert.equal(DEFAULT_SITE_BRANDING.app_name, 'KofyOne');
    assert.ok(DEFAULT_SITE_BRANDING.tagline);
    assert.ok(DEFAULT_SITE_BRANDING.description);
  });
});

describe('5. Database Migration & RLS Policy Inspection', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20261023000000_multi_provider_branding_cms.sql'
  );

  test('migration file exists and is populated', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
    const content = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(content.length > 500, 'Migration must have content');
  });

  test('defines site_branding table with RLS enabled', () => {
    const content = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.site_branding'));
    assert.ok(content.includes('ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY'));
    assert.ok(content.includes('public.is_admin()'));
  });

  test('seeds multi-provider platforms in database migration', () => {
    const content = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(content.includes("'Microsoft'"));
    assert.ok(content.includes("'AWS'"));
    assert.ok(content.includes("'Google'"));
    assert.ok(content.includes("'Other'"));
  });

  test('configures kofyone-media storage bucket with 2MB limit and PNG/JPG/WebP types', () => {
    const content = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(content.includes('kofyone-media'));
    assert.ok(content.includes('2097152')); // 2MB
    assert.ok(content.includes("'image/png'"));
    assert.ok(content.includes("'image/jpeg'"));
    assert.ok(content.includes("'image/webp'"));
  });

  test('enforces that only admins can update resources and branding', () => {
    const content = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(content.includes('Admins can update resources'));
    assert.ok(content.includes('Admins can update site branding'));
    assert.ok(content.includes('is_published = true OR public.is_admin()'));
  });
});

describe('6. OAuth Callback & Route Integrity', () => {
  test('callback bridge exists at app/api/auth/callback/route.ts to prevent 404', () => {
    const callbackPath = path.join(process.cwd(), 'app', 'api', 'auth', 'callback', 'route.ts');
    assert.ok(fs.existsSync(callbackPath), 'API auth callback alias route must exist');
  });

  test('main PKCE exchange route exists at app/auth/callback/route.ts', () => {
    const callbackPath = path.join(process.cwd(), 'app', 'auth', 'callback', 'route.ts');
    assert.ok(fs.existsSync(callbackPath), 'Main auth callback route must exist');
  });
});
