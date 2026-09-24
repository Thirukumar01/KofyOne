/**
 * KofyOne - Platform Entity Types
 * Generic platform model supporting multi-platform scaling (Microsoft first).
 */

export interface Platform {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string;
  domain: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type CreatePlatformInput = Omit<Platform, 'id' | 'created_at' | 'updated_at'>;

export type UpdatePlatformInput = Partial<CreatePlatformInput>;
