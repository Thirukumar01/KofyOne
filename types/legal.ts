/**
 * KofyOne - Legal & Site Pages Types
 */

export type LegalPageSlug = 'terms' | 'privacy' | 'about' | 'contact';

export interface SitePage {
  slug: LegalPageSlug;
  title: string;
  summary: string;
  content: string;
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
  updated_by?: string | null;
}

export interface UpdateSitePageInput {
  title?: string;
  summary?: string;
  content?: string;
  is_published?: boolean;
}
