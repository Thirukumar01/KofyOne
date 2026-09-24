/**
 * KofyOne - Search Service
 * Modular search layer wrapping PostgreSQL Full-Text Search (tsvector / websearch_to_tsquery).
 * Designed with a clean interface so the underlying engine can be upgraded or swapped
 * without breaking application call sites.
 */

import { SearchQuery, SearchResults, SearchResultItem } from '@/types/search';
import { ResourceWithRelations } from '@/types/resource';
import { createClient } from '@/lib/supabase/server';

export interface ISearchService {
  search(query: SearchQuery): Promise<SearchResults>;
}

export class PostgresSearchService implements ISearchService {
  async search(searchQuery: SearchQuery): Promise<SearchResults> {
    const { query, filters, page = 1, limit = 20 } = searchQuery;
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Call stored search procedure if available in Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('search_resources', {
      search_term: query,
      filter_platform_id: filters?.platformId,
      filter_category_id: filters?.categoryIds?.[0],
      result_limit: limit,
      result_offset: offset,
    });

    if (error) {
      // In Phase 0 / unmigrated dev state, return empty result set gracefully
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const items: SearchResultItem[] = ((data as unknown[]) || []).map((row: unknown) => {
      const typedRow = row as ResourceWithRelations & { rank: number };
      return {
        resource: typedRow,
        rank: typedRow.rank || 0,
      };
    });

    return {
      items,
      total: items.length,
      page,
      limit,
      totalPages: Math.ceil(items.length / limit) || 1,
    };
  }
}

// Export singleton instance of search service
export const searchService = new PostgresSearchService();
