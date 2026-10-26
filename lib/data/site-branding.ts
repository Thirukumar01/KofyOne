import fs from 'fs';
import path from 'path';
import { SiteBranding, DEFAULT_SITE_BRANDING, UpdateSiteBrandingInput } from '@/types/branding';
import { createClient } from '@/lib/supabase/server';

const BRANDING_FILE_PATH = path.join(process.cwd(), 'data', 'site-branding.json');

export function getLocalSiteBranding(): SiteBranding {
  try {
    if (!fs.existsSync(BRANDING_FILE_PATH)) {
      return DEFAULT_SITE_BRANDING;
    }
    const content = fs.readFileSync(BRANDING_FILE_PATH, 'utf-8');
    if (!content.trim()) return DEFAULT_SITE_BRANDING;
    return { ...DEFAULT_SITE_BRANDING, ...JSON.parse(content) };
  } catch (err) {
    console.error('Error reading local site branding:', err);
    return DEFAULT_SITE_BRANDING;
  }
}

export function saveLocalSiteBranding(branding: SiteBranding): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  try {
    const dir = path.dirname(BRANDING_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BRANDING_FILE_PATH, JSON.stringify(branding, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local site branding:', err);
  }
}

export async function getSiteBranding(): Promise<SiteBranding> {
  const local = getLocalSiteBranding();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_branding')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();

    if (data && !error) {
      const merged = { ...local, ...(data as unknown as SiteBranding) };
      // Keep local in sync
      saveLocalSiteBranding(merged);
      return merged;
    }
  } catch {
    // Database connection or table not yet applied; gracefully fall back to local
  }

  return local;
}

export async function updateSiteBranding(
  input: UpdateSiteBrandingInput,
  userId?: string
): Promise<SiteBranding> {
  const current = await getSiteBranding();
  const updated: SiteBranding = {
    ...current,
    ...input,
    id: 'current',
    updated_at: new Date().toISOString(),
    updated_by: userId ?? current.updated_by,
  };

  // 1. In non-production environments, persist to local cache
  if (process.env.NODE_ENV !== 'production') {
    saveLocalSiteBranding(updated);
  }

  // 2. Persist to Supabase
  let dbPersisted = false;
  try {
    const supabase = await createClient();
    const { error } = await (supabase.from('site_branding') as unknown as {
      upsert: (val: Record<string, unknown>) => Promise<{ error?: unknown }>;
    }).upsert({
      id: 'current',
      app_name: updated.app_name,
      tagline: updated.tagline,
      description: updated.description,
      primary_logo_url: updated.primary_logo_url,
      compact_logo_url: updated.compact_logo_url,
      square_icon_url: updated.square_icon_url,
      favicon_url: updated.favicon_url,
      logo_alt: updated.logo_alt,
      updated_at: updated.updated_at,
      updated_by: updated.updated_by,
    });
    if (!error) {
      dbPersisted = true;
    }
  } catch (err) {
    console.warn('Could not persist branding to Supabase database:', err);
  }

  if (!dbPersisted && process.env.NODE_ENV === 'production') {
    throw new Error('Database connection failed. Unable to persist site branding changes to PostgreSQL.');
  }

  return updated;
}

export async function resetSiteBranding(userId?: string): Promise<SiteBranding> {
  const reset: SiteBranding = {
    ...DEFAULT_SITE_BRANDING,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };
  saveLocalSiteBranding(reset);

  try {
    const supabase = await createClient();
    await (supabase.from('site_branding') as unknown as {
      upsert: (val: Record<string, unknown>) => Promise<unknown>;
    }).upsert(reset as unknown as Record<string, unknown>);
  } catch (err) {
    console.warn('Could not reset branding in Supabase database:', err);
  }

  return reset;
}
