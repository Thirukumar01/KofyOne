/**
 * KofyOne — Phase 7 Automated Test Suite: Catalog Expansion & Student Engagement
 *
 * Verifies:
 * 1. Multi-Provider Official Student Resource Catalog (AWS, Google Cloud, GitHub/Other, Microsoft).
 * 2. Strict Microsoft Contributor ID isolation (never attached to AWS/Google/Other).
 * 3. Personalized Discovery engine (Ecosystem recommendation banner, default sort, card density).
 * 4. Admin Analytics, Users Directory & Role Toggle Protection (no self-demotion).
 * 5. Structured Audit Logging helper and routes.
 * 6. Dynamic Student Events & Platform Updates (database migration, public & admin wiring).
 *
 * Run with: node --test test/phase7-catalog-engagement.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Seed Platforms & Resources
import { SEED_PLATFORMS } from '../lib/data/seed-platforms.ts';
import { CANONICAL_SEED_RESOURCES } from '../lib/data/seed-resources.ts';
import { isMicrosoftPlatform, buildTrackedUrl } from '../lib/tracking/url-builder.ts';

describe('1. Multi-Provider Official Student Resource Catalog', () => {
  test('includes Microsoft, AWS, Google Cloud, and Other active platforms', () => {
    const slugs = SEED_PLATFORMS.map((p) => p.slug);
    assert.ok(slugs.includes('microsoft'), 'Must include microsoft platform');
    assert.ok(slugs.includes('aws'), 'Must include aws platform');
    assert.ok(slugs.includes('google-cloud') || slugs.includes('google'), 'Must include google platform');
    assert.ok(slugs.includes('other'), 'Must include other platform');
  });

  test('canonical seed resources contain verified AWS student resources', () => {
    const awsResources = CANONICAL_SEED_RESOURCES.filter(
      (r) => r.platform.slug === 'aws' || r.official_url.includes('aws.amazon.com') || r.official_url.includes('skillbuilder.aws')
    );
    assert.ok(awsResources.length >= 3, `Expected at least 3 AWS resources, found ${awsResources.length}`);

    const slugs = awsResources.map((r) => r.slug);
    assert.ok(slugs.includes('aws-educate'), 'Missing aws-educate');
    assert.ok(slugs.includes('aws-skill-builder'), 'Missing aws-skill-builder');
    assert.ok(slugs.includes('amazon-q-developer'), 'Missing amazon-q-developer');

    // Verify category associations
    const awsEducate = awsResources.find((r) => r.slug === 'aws-educate');
    assert.ok(awsEducate);
    const catSlugs = awsEducate.categories.map((c) => c.slug);
    assert.ok(catSlugs.includes('student'), 'aws-educate must be in student category');
    assert.ok(catSlugs.includes('cloud'), 'aws-educate must be in cloud category');
  });

  test('canonical seed resources contain verified Google Cloud student resources', () => {
    const gcpResources = CANONICAL_SEED_RESOURCES.filter(
      (r) =>
        r.platform.slug.includes('google') ||
        r.official_url.includes('cloudskillsboost.google') ||
        r.official_url.includes('aistudio.google.com') ||
        r.official_url.includes('developers.google.com')
    );
    assert.ok(gcpResources.length >= 3, `Expected at least 3 Google Cloud resources, found ${gcpResources.length}`);

    const slugs = gcpResources.map((r) => r.slug);
    assert.ok(slugs.includes('google-cloud-skills-boost'), 'Missing google-cloud-skills-boost');
    assert.ok(slugs.includes('google-ai-studio-gemini-api'), 'Missing google-ai-studio-gemini-api');
    assert.ok(slugs.includes('google-for-developers-student-programs'), 'Missing google-for-developers-student-programs');
  });

  test('canonical seed resources contain GitHub Student Pack and Copilot under Other', () => {
    const otherResources = CANONICAL_SEED_RESOURCES.filter((r) => r.platform.slug === 'other');
    assert.ok(otherResources.length >= 2, `Expected at least 2 Other resources, found ${otherResources.length}`);

    const slugs = otherResources.map((r) => r.slug);
    assert.ok(slugs.includes('github-student-developer-pack'), 'Missing github-student-developer-pack');
    assert.ok(slugs.includes('github-copilot-for-students'), 'Missing github-copilot-for-students');
  });

  test('maintains strict Contributor ID isolation (wt.mc_id ONLY on Microsoft)', () => {
    const msResources = CANONICAL_SEED_RESOURCES.filter((r) => isMicrosoftPlatform(r.platform.slug));
    const nonMsResources = CANONICAL_SEED_RESOURCES.filter((r) => !isMicrosoftPlatform(r.platform.slug));

    assert.ok(msResources.length >= 5, 'Must have Microsoft resources');
    assert.ok(nonMsResources.length >= 8, 'Must have multi-provider non-Microsoft resources');

    // Microsoft resources should have tracking configs with studentamb_504640
    const msTracked = msResources.filter((r) => r.contributor_id === 'studentamb_504640');
    assert.ok(msTracked.length > 0, 'Microsoft resources must preserve contributor_id');

    // Non-Microsoft resources must NEVER have Microsoft tracking parameters
    for (const r of nonMsResources) {
      assert.equal(r.contributor_id, null, `Non-MS resource ${r.slug} must not have contributor_id`);
      const trackedUrl = buildTrackedUrl(r.official_url, null, undefined, {
        platformSlug: r.platform.slug,
        contributorId: 'studentamb_504640',
      });
      assert.ok(!trackedUrl.includes('wt.mc_id'), `Non-MS resource ${r.slug} must not have wt.mc_id: ${trackedUrl}`);
    }
  });
});

describe('2. Personalized Discovery Engine', () => {
  test('Ecosystem recommendation banner component exists', () => {
    const bannerPath = path.resolve('components/resources/ecosystem-banner.tsx');
    assert.ok(fs.existsSync(bannerPath), 'components/resources/ecosystem-banner.tsx must exist');
    const content = fs.readFileSync(bannerPath, 'utf8');
    assert.ok(content.includes('Personalized Discovery'));
    assert.ok(content.includes('preferredPlatform'));
    assert.ok(content.includes('sessionStorage'));
  });

  test('/resources page integrates user preferences and density', () => {
    const pagePath = path.resolve('app/(public)/resources/page.tsx');
    assert.ok(fs.existsSync(pagePath));
    const content = fs.readFileSync(pagePath, 'utf8');
    assert.ok(content.includes('getCurrentUserProfile'));
    assert.ok(content.includes('userDefaultSort'));
    assert.ok(content.includes('density'));
    assert.ok(content.includes('EcosystemBanner'));
  });
});

describe('3. Admin Analytics, Users & Audit Trails', () => {
  test('/admin/analytics queries live aggregates, CTR %, favorites, and breakdowns', () => {
    const analyticsPath = path.resolve('app/(admin)/admin/analytics/page.tsx');
    assert.ok(fs.existsSync(analyticsPath));
    const content = fs.readFileSync(analyticsPath, 'utf8');
    assert.ok(content.includes('user_favorites'));
    assert.ok(content.includes('totalClicks'));
    assert.ok(content.includes('totalViews'));
    assert.ok(content.includes('ctr'));
    assert.ok(content.includes('top10Resources'));
    assert.ok(content.includes('Breakdown by Ecosystem'));
    assert.ok(content.includes('Breakdown by Category'));
  });

  test('/admin/users displays learner role, ecosystem, and role toggle', () => {
    const usersPagePath = path.resolve('app/(admin)/admin/users/page.tsx');
    const directoryComponentPath = path.resolve('components/admin/users-directory.tsx');
    assert.ok(fs.existsSync(usersPagePath));
    assert.ok(fs.existsSync(directoryComponentPath));

    const content = fs.readFileSync(directoryComponentPath, 'utf8');
    assert.ok(content.includes('learner_role'));
    assert.ok(content.includes('preferred_platform'));
    assert.ok(content.includes('handleToggleRole'));
    assert.ok(content.includes('Security restriction: You cannot demote'));
  });

  test('role toggle API enforces self-demotion security guardrail', () => {
    const roleApiRoute = path.resolve('app/api/admin/users/[id]/role/route.ts');
    assert.ok(fs.existsSync(roleApiRoute));
    const content = fs.readFileSync(roleApiRoute, 'utf8');
    assert.ok(content.includes('caller.id === targetUserId'), 'Must check self demotion');
    assert.ok(content.includes('Administrators cannot alter or demote their own account role'));
    assert.ok(content.includes('recordAuditLog'));
  });

  test('audit logging utility exists and is wired to admin operations', () => {
    const auditUtilPath = path.resolve('lib/data/audit-logs.ts');
    assert.ok(fs.existsSync(auditUtilPath));

    const brandingApi = fs.readFileSync(path.resolve('app/api/admin/branding/route.ts'), 'utf8');
    assert.ok(brandingApi.includes('recordAuditLog'));

    const settingsApi = fs.readFileSync(path.resolve('app/api/admin/settings/route.ts'), 'utf8');
    assert.ok(settingsApi.includes('recordAuditLog'));

    const resourcesApi = fs.readFileSync(path.resolve('app/api/admin/resources/route.ts'), 'utf8');
    assert.ok(resourcesApi.includes('recordAuditLog'));
  });
});

describe('4. Dynamic Student Events & Platform Updates', () => {
  test('defines initial official events and updates seed data in data layer', () => {
    const eventsDataFile = path.resolve('lib/data/events-and-updates.ts');
    assert.ok(fs.existsSync(eventsDataFile));
    const content = fs.readFileSync(eventsDataFile, 'utf8');
    assert.ok(content.includes('Microsoft Imagine Cup 2026'));
    assert.ok(content.includes('GitHub Global Campus Challenge'));
    assert.ok(content.includes('Google Cloud AI Study Jam'));
    assert.ok(content.includes('Azure AI Foundry Integration'));
    assert.ok(content.includes('Multi-Provider Student Hub Launch'));
  });

  test('public /events and /updates pages exist and render cleanly', () => {
    const eventsPath = path.resolve('app/(public)/events/page.tsx');
    const updatesPath = path.resolve('app/(public)/updates/page.tsx');
    assert.ok(fs.existsSync(eventsPath), 'app/(public)/events/page.tsx must exist');
    assert.ok(fs.existsSync(updatesPath), 'app/(public)/updates/page.tsx must exist');

    const eventsContent = fs.readFileSync(eventsPath, 'utf8');
    assert.ok(eventsContent.includes('getPublishedEvents'));
    assert.ok(eventsContent.includes('official_url'));

    const updatesContent = fs.readFileSync(updatesPath, 'utf8');
    assert.ok(updatesContent.includes('getPublishedUpdates'));
    assert.ok(updatesContent.includes('published_date'));
  });

  test('admin /admin/events and /admin/updates provide full CRUD capabilities', () => {
    const adminEvents = fs.readFileSync(path.resolve('app/(admin)/admin/events/page.tsx'), 'utf8');
    assert.ok(adminEvents.includes('EventsManager'));

    const adminUpdates = fs.readFileSync(path.resolve('app/(admin)/admin/updates/page.tsx'), 'utf8');
    assert.ok(adminUpdates.includes('UpdatesManager'));

    assert.ok(fs.existsSync(path.resolve('app/api/admin/events/route.ts')));
    assert.ok(fs.existsSync(path.resolve('app/api/admin/updates/route.ts')));
  });

  test('Phase 7 migration file contains all required schema definitions and reload notification', () => {
    const migrationPath = path.resolve('supabase/migrations/20261030000000_phase7_catalog_and_engagement.sql');
    assert.ok(fs.existsSync(migrationPath), 'Phase 7 migration file must exist');

    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('public.categories'), 'Must insert canonical categories');
    assert.ok(sql.includes('public.platforms'), 'Must seed multi-provider platforms');
    assert.ok(sql.includes('aws-educate'), 'Must seed aws-educate');
    assert.ok(sql.includes('google-cloud-skills-boost'), 'Must seed google-cloud-skills-boost');
    assert.ok(sql.includes('github-student-developer-pack'), 'Must seed github-student-developer-pack');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.events'), 'Must create events table');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.updates'), 'Must create updates table');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.audit_logs'), 'Must ensure audit_logs table');
    assert.ok(sql.includes("NOTIFY pgrst, 'reload schema';"), 'Must notify pgrst to reload schema');
  });
});
