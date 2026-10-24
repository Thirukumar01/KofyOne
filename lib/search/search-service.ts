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

    const search = query.replace(/[%_,]/g, ' ').trim();
    let request = supabase.from('resources').select('*').eq('is_published', true);
    if (search) request = request.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    if (filters?.platformId) request = request.eq('platform_id', filters.platformId);
    const { data, error } = await request
      .order('featured', { ascending: false })
      .order('display_order', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Resource search failed: ${error.message}`);

    const items: SearchResultItem[] = ((data as unknown[]) || []).map((row: unknown) => {
      const typedRow = row as ResourceWithRelations & { rank: number };
      return {
        resource: typedRow,
        rank: typedRow.rank || 0,
      };
    });

    try {
      const { getCustomResources } = await import('@/lib/data/custom-resources');
      const customMatches = getCustomResources().filter((r) => {
        if (!r.is_published) return false;
        if (search && !`${r.name} ${r.description}`.toLowerCase().includes(search.toLowerCase())) return false;
        if (filters?.platformId && r.platform_id !== filters.platformId) return false;
        return true;
      });
      const existingIds = new Set(items.map((i) => i.resource.id));
      for (const c of customMatches) {
        if (!existingIds.has(c.id)) {
          items.unshift({ resource: c, rank: 1 });
        }
      }
    } catch {}

    return {
      items,
      total: items.length < limit ? offset + items.length : offset + items.length + 1,
      page,
      limit,
      totalPages: items.length < limit ? Math.max(1, Math.ceil((offset + items.length) / limit)) : page + 1,
    };
  }
}

// Export singleton instance of search service
export const searchService = new PostgresSearchService();
