/**
 * KofyOne - Resource Entity Types
 * Official educational/developer resource model linked to a platform and categories.
 */

import { Platform } from './platform';
import { Category } from './category';
import { TrackingConfig } from './tracking';

export interface ResourceMetadata {
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'all-levels';
  duration?: string;
  is_free?: boolean;
  requires_auth?: boolean;
  audience?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export interface Resource {
  id: string;
  platform_id: string;
  name: string;
  slug: string;
  description: string;
  official_url: string;
  logo_url: string | null;
  featured: boolean;
  is_published: boolean;
  display_order: number;
  tracking_config_id: string | null;
  view_count: number;
  click_count: number;
  subcategory?: string | null;
  tags?: string[];
  contributor_id?: string | null;
  metadata: ResourceMetadata;
  created_at: string;
  updated_at: string;
}

export interface ResourceWithRelations extends Resource {
  platform: Platform;
  categories: Category[];
  tracking_config?: TrackingConfig | null;
}

export type CreateResourceInput = Omit<
  Resource,
  'id' | 'view_count' | 'click_count' | 'created_at' | 'updated_at'
> & {
  category_ids?: string[];
};

export type UpdateResourceInput = Partial<CreateResourceInput>;
