/**
 * KofyOne - Category Entity Types
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateCategoryInput = Omit<Category, 'id' | 'created_at' | 'updated_at'>;

export type UpdateCategoryInput = Partial<CreateCategoryInput>;
