/**
 * KofyOne - Search Types
 * Modular search interfaces designed around PostgreSQL Full-Text Search.
 */

import { ResourceWithRelations } from './resource';

export interface SearchFilters {
  platformId?: string;
  categoryIds?: string[];
  featuredOnly?: boolean;
}

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  page?: number;
  limit?: number;
}

export interface SearchResultItem {
  resource: ResourceWithRelations;
  rank: number;
  headline?: string;
}

export interface SearchResults {
  items: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
