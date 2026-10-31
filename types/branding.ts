/**
 * KofyOne - Site Branding & Identity Entity Types
 * Dynamic branding model allowing administrators to configure logos and identity.
 */

export interface SiteBranding {
  id: string;
  app_name: string;
  tagline: string;
  description: string;
  primary_logo_url: string | null;
  compact_logo_url: string | null;
  square_icon_url: string | null;
  favicon_url: string | null;
  logo_alt: string;
  brand_color?: string;
  updated_at: string;
  updated_by?: string | null;
}

export type UpdateSiteBrandingInput = Partial<
  Omit<SiteBranding, 'id' | 'updated_at' | 'updated_by'>
>;

export const DEFAULT_SITE_BRANDING: SiteBranding = {
  id: 'current',
  app_name: 'KofyOne',
  tagline: 'Learn Today. Build Tomorrow.',
  description:
    'A student-focused resource discovery platform to discover, search, explore, save, and revisit official technology resources.',
  primary_logo_url: null,
  compact_logo_url: null,
  square_icon_url: null,
  favicon_url: null,
  logo_alt: 'KofyOne Brand Logo',
  brand_color: '#B94A50',
  updated_at: new Date().toISOString(),
};
