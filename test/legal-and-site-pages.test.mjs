/**
 * KofyOne — Automated Test Suite for Legal & Site Pages System
 *
 * Verifies:
 * 1. Default canonical content for /terms, /privacy, /about, /contact.
 * 2. Strict public access guard: Draft pages are never returned to public visitors.
 * 3. Admin access: Admins can inspect, edit, and toggle draft/published state.
 * 4. Content reset: Ability to restore canonical defaults.
 * 5. Database migration integrity: site_pages table, RLS, and admin-only write policies.
 * 6. Public route and admin editor route integrity.
 *
 * Run with: node --test test/legal-and-site-pages.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import data access and defaults
import { DEFAULT_LEGAL_PAGES } from '../lib/data/default-legal-pages.ts';
import {
  getLocalSitePages,
  saveLocalSitePages,
  getPublicPage,
  getAllAdminPages,
  updateAdminPage,
  resetPageToDefault,
} from '../lib/data/site-pages.ts';

describe('1. Default Canonical Content Verification', () => {
  test('defines all four required legal and site pages', () => {
    const requiredSlugs = ['terms', 'privacy', 'about', 'contact'];
    for (const slug of requiredSlugs) {
      const page = DEFAULT_LEGAL_PAGES[slug];
      assert.ok(page, `Missing default page for slug: ${slug}`);
      assert.equal(page.slug, slug);
      assert.ok(page.title.length > 0);
      assert.ok(page.summary.length > 0);
      assert.ok(page.content.length > 100);
      assert.equal(page.is_published, true);
    }
  });

  test('Terms accurately reflects KofyOne student discovery and disclaims affiliation', () => {
    const terms = DEFAULT_LEGAL_PAGES.terms.content;
    assert.match(terms, /KofyOne/i);
    assert.match(terms, /educational/i);
    assert.match(terms, /not owned, operated, endorsed, or affiliated with Microsoft/i);
    assert.match(terms, /wt\.mc_id/i); // documents contributor tracking
  });

  test('Privacy Policy accurately documents bcrypt security answers and zero plaintext storage', () => {
    const privacy = DEFAULT_LEGAL_PAGES.privacy.content;
    assert.match(privacy, /bcrypt/i);
    assert.match(privacy, /Plaintext security answers are never stored/i);
    assert.match(privacy, /HttpOnly/i); // documents secure cookies
    assert.match(privacy, /Row Level Security/i);
  });

  test('About page communicates student discovery mission', () => {
    const about = DEFAULT_LEGAL_PAGES.about.content;
    assert.match(about, /Empowering every student/i);
    assert.match(about, /Microsoft.*AWS.*Google/i);
  });

  test('Contact page includes support channels and FAQ', () => {
    const contact = DEFAULT_LEGAL_PAGES.contact.content;
    assert.match(contact, /support@kofyone\.com/i);
    assert.match(contact, /Frequently Asked Questions/i);
  });
});

describe('2. Public Access Guard & Draft Privacy Isolation', () => {
  const testSlug = 'terms';
  let originalMap;

  test('setup backup of local pages', () => {
    originalMap = getLocalSitePages();
  });

  test('public can retrieve published page', async () => {
    const page = await getPublicPage(testSlug);
    assert.ok(page !== null);
    assert.equal(page.slug, testSlug);
    assert.equal(page.is_published, true);
  });

  test('draft pages are strictly HIDDEN from public visitors', async () => {
    // Set page to draft
    await updateAdminPage(testSlug, { is_published: false });

    const publicPage = await getPublicPage(testSlug);
    assert.equal(publicPage, null, 'Draft page must never be visible to public visitors');

    // Restore to published
    await updateAdminPage(testSlug, { is_published: true });
    const restored = await getPublicPage(testSlug);
    assert.ok(restored !== null);
    assert.equal(restored.is_published, true);
  });

  test('cleanup and restore original pages', () => {
    if (originalMap) {
      saveLocalSitePages(originalMap);
    }
  });
});

describe('3. Admin Content Management & Reversion', () => {
  test('admin can retrieve all pages including drafts', async () => {
    const allPages = await getAllAdminPages();
    assert.ok(allPages.length >= 4);
    const slugs = allPages.map((p) => p.slug);
    assert.ok(slugs.includes('terms'));
    assert.ok(slugs.includes('privacy'));
    assert.ok(slugs.includes('about'));
    assert.ok(slugs.includes('contact'));
  });

  test('admin can update page content and timestamps', async () => {
    const testTitle = 'Updated Terms for Testing';
    const updated = await updateAdminPage('terms', {
      title: testTitle,
      is_published: true,
    });

    assert.equal(updated.title, testTitle);
    assert.ok(updated.updated_at);

    // Reset back to canonical default
    const reset = await resetPageToDefault('terms');
    assert.equal(reset.title, DEFAULT_LEGAL_PAGES.terms.title);
  });
});

describe('4. Database Migration & RLS Security Inspection', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20261024000000_legal_and_site_pages.sql'
  );

  test('migration file exists and is populated', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.site_pages'));
    assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'));
    assert.ok(sql.includes('Public can view published site pages'));
    assert.ok(sql.includes('Admins have full access to site pages'));
    assert.ok(sql.includes('is_published = true'));
  });
});

describe('5. Route & Component Architecture Integrity', () => {
  const routes = [
    'app/(public)/terms/page.tsx',
    'app/(public)/privacy/page.tsx',
    'app/(public)/about/page.tsx',
    'app/(public)/contact/page.tsx',
    'app/(admin)/admin/legal/page.tsx',
    'app/api/admin/pages/route.ts',
    'app/api/admin/pages/[slug]/route.ts',
    'app/api/contact/route.ts',
    'components/legal/legal-content-viewer.tsx',
    'components/contact/contact-form.tsx',
  ];

  for (const r of routes) {
    test(`route component exists: ${r}`, () => {
      const fullPath = path.join(process.cwd(), r);
      assert.ok(fs.existsSync(fullPath), `Expected file ${r} to exist`);
    });
  }
});
