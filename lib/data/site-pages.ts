/**
 * KofyOne - Legal & Site Pages Data Access Layer
 *
 * Provides:
 * 1. Hybrid storage: Supabase 'site_pages' table with local JSON cache fallback ('data/site-pages.json').
 * 2. Strict public access guard: Public visitors can ONLY access published content.
 * 3. Draft isolation: Draft pages are visible exclusively to authorized administrators.
 * 4. Automatic seeding and reset to canonical defaults.
 */

import fs from 'fs';
import path from 'path';
import type { SitePage, LegalPageSlug, UpdateSitePageInput } from '@/types/legal';
import { DEFAULT_LEGAL_PAGES } from './default-legal-pages.ts';

const SITE_PAGES_FILE = path.join(process.cwd(), 'data', 'site-pages.json');

// 1. Read local cache
export function getLocalSitePages(): Record<string, SitePage> {
  try {
    if (fs.existsSync(SITE_PAGES_FILE)) {
      const raw = fs.readFileSync(SITE_PAGES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_LEGAL_PAGES, ...parsed };
    }
  } catch {
    // Return default on error
  }
  return { ...DEFAULT_LEGAL_PAGES };
}

export function saveLocalSitePages(pages: Record<string, SitePage>): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  try {
    const dir = path.dirname(SITE_PAGES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SITE_PAGES_FILE, JSON.stringify(pages, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save local site pages:', err);
  }
}

async function getSupabaseClient() {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    return await createClient();
  } catch {
    return null;
  }
}

// 3. Get single page for public consumption (Strictly published only)
export async function getPublicPage(slug: LegalPageSlug): Promise<SitePage | null> {
  const localMap = getLocalSitePages();
  const defaultPage = DEFAULT_LEGAL_PAGES[slug] || null;

  try {
    const supabase = await getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('site_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (data && !error) {
        return data as unknown as SitePage;
      }
    }
  } catch {
    // Database connection or table not yet applied; gracefully fall back to local
  }

  const local = localMap[slug];
  if (local && local.is_published) {
    return local;
  }

  // If local is draft, do not expose draft to public
  if (local && !local.is_published) {
    return null;
  }

  return defaultPage && defaultPage.is_published ? defaultPage : null;
}

// 4. Get all pages for admin consumption (includes drafts and metadata)
export async function getAllAdminPages(): Promise<SitePage[]> {
  const localMap = getLocalSitePages();

  try {
    const supabase = await getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('site_pages')
        .select('*')
        .order('slug', { ascending: true });

      if (data && !error && data.length > 0) {
        const mergedMap: Record<string, SitePage> = { ...localMap };
        for (const item of data as unknown as SitePage[]) {
          mergedMap[item.slug] = item;
        }
        saveLocalSitePages(mergedMap);
        return Object.values(mergedMap);
      }
    }
  } catch {
    // Database connection error; use local cache
  }

  return Object.values(localMap);
}

// 5. Get a specific page for admin editing (draft or published)
export async function getAdminPageBySlug(slug: LegalPageSlug): Promise<SitePage> {
  const localMap = getLocalSitePages();

  try {
    const supabase = await getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('site_pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (data && !error) {
        const page = data as unknown as SitePage;
        localMap[slug] = page;
        saveLocalSitePages(localMap);
        return page;
      }
    }
  } catch {
    // Database connection error
  }

  return localMap[slug] || DEFAULT_LEGAL_PAGES[slug];
}

// 6. Update page (by authorized administrator)
export async function updateAdminPage(
  slug: LegalPageSlug,
  input: UpdateSitePageInput,
  userId?: string
): Promise<SitePage> {
  const current = await getAdminPageBySlug(slug);
  const now = new Date().toISOString();

  const isPublishingNow = input.is_published === true && !current.is_published;
  const publishedAt = isPublishingNow
    ? now
    : input.is_published === false
    ? null
    : current.published_at || now;

  const updated: SitePage = {
    ...current,
    ...input,
    slug,
    published_at: publishedAt,
    updated_at: now,
    updated_by: userId ?? current.updated_by ?? null,
  };

  // 1. In non-production environments, save to local cache
  if (process.env.NODE_ENV !== 'production') {
    const localMap = getLocalSitePages();
    localMap[slug] = updated;
    saveLocalSitePages(localMap);
  }

  // 2. Persist to Supabase if reachable
  let dbPersisted = false;
  try {
    const supabase = await getSupabaseClient();
    if (supabase) {
      const { error } = await (supabase.from('site_pages') as unknown as {
        upsert: (record: Record<string, unknown>) => Promise<{ error?: unknown }>;
      }).upsert({
        slug: updated.slug,
        title: updated.title,
        summary: updated.summary,
        content: updated.content,
        is_published: updated.is_published,
        published_at: updated.published_at,
        updated_at: updated.updated_at,
        updated_by: updated.updated_by,
      });
      if (!error) {
        dbPersisted = true;
      }
    }
  } catch (err) {
    console.warn('Could not persist site page to Supabase:', err);
  }

  if (!dbPersisted && process.env.NODE_ENV === 'production') {
    throw new Error('Database connection failed. Unable to persist site page changes to PostgreSQL.');
  }

  return updated;
}

// 7. Reset page to default canonical content
export async function resetPageToDefault(
  slug: LegalPageSlug,
  userId?: string
): Promise<SitePage> {
  const defaultPage = DEFAULT_LEGAL_PAGES[slug];
  if (!defaultPage) {
    throw new Error(`Unknown legal page slug: ${slug}`);
  }

  return updateAdminPage(
    slug,
    {
      title: defaultPage.title,
      summary: defaultPage.summary,
      content: defaultPage.content,
      is_published: true,
    },
    userId
  );
}
