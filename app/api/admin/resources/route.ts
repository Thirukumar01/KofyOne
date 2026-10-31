import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin';
import { saveCustomResource } from '@/lib/data/custom-resources';
import { getActiveCategories, getActivePlatforms, getAllAdminResources } from '@/lib/supabase/db';
import { isMicrosoftPlatform } from '@/lib/tracking/url-builder';
import { recordAuditLog } from '@/lib/data/audit-logs';
import type { ResourceWithRelations } from '@/types/resource';

export const dynamic = 'force-dynamic';

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const resources = await getAllAdminResources();
    return NextResponse.json({ success: true, resources });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve resources.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    let slug = typeof body.slug === 'string' ? slugify(body.slug) : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const official_url = typeof body.official_url === 'string' ? body.official_url.trim() : '';
    const platform_slug = typeof body.platform_slug === 'string' ? body.platform_slug.trim().toLowerCase() : 'microsoft';
    const category_slug = typeof body.category_slug === 'string' ? body.category_slug : 'ai';
    const subcategory = typeof body.subcategory === 'string' ? body.subcategory.trim() : '';
    const tags = Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : typeof body.tags === 'string' && body.tags.trim()
      ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];
    const featured = Boolean(body.featured);
    const is_published = body.is_published !== undefined ? Boolean(body.is_published) : true;
    const logo_url = typeof body.logo_url === 'string' && body.logo_url.trim() ? body.logo_url.trim() : null;

    // Contributor ID validation: ONLY applicable to Microsoft resources
    const isMicrosoft = isMicrosoftPlatform(platform_slug);
    const rawContributorId = typeof body.contributor_id === 'string' ? body.contributor_id.trim() : '';
    const contributor_id = isMicrosoft && rawContributorId ? rawContributorId : null;

    // Field validation - Accept any valid http or https URL across any provider
    if (!name) {
      return NextResponse.json({ error: 'Resource name is required.' }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: 'Resource description is required.' }, { status: 400 });
    }
    if (!official_url || (!official_url.startsWith('http://') && !official_url.startsWith('https://'))) {
      return NextResponse.json(
        { error: 'A valid official URL starting with http:// or https:// is required.' },
        { status: 400 }
      );
    }
    if (!slug) {
      slug = slugify(name);
    }

    const [categoriesRes, platformsRes] = await Promise.all([
      getActiveCategories(),
      getActivePlatforms(),
    ]);

    const allCategories = categoriesRes.data;
    const allPlatforms = platformsRes.data;

    // Find or fallback platform
    const matchedPlatform =
      allPlatforms.find((p) => p.slug === platform_slug || p.id === body.platform_id) ||
      allPlatforms[0];

    // Find or fallback category
    const matchedCategory =
      allCategories.find((c) => c.slug === category_slug || c.id === body.category_id) ||
      allCategories[0];

    // Check slug uniqueness across existing resources and append suffix if collision
    const existing = await getAllAdminResources();
    if (existing.some((r) => r.slug === slug)) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const newResource: ResourceWithRelations = {
      id: 'custom-' + Date.now(),
      platform_id: matchedPlatform.id,
      name,
      slug,
      description,
      official_url,
      logo_url,
      featured,
      is_published,
      display_order: 0,
      tracking_config_id: null,
      view_count: 0,
      click_count: 0,
      contributor_id,
      subcategory: subcategory || null,
      tags,
      metadata: {
        subcategory: subcategory || undefined,
        tags,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      platform: matchedPlatform,
      tracking_config: contributor_id
        ? {
            id: 'tc-' + Date.now(),
            platform_id: matchedPlatform.id,
            tracking_parameter: 'wt.mc_id',
            tracking_value: contributor_id,
            is_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : null,
      categories: [matchedCategory],
    };

    // Save to custom resources storage
    saveCustomResource(newResource);

    await recordAuditLog({
      action: 'create_resource',
      entityType: 'resource',
      entityId: newResource.slug,
      details: { name: newResource.name, platform: matchedPlatform.name },
      actorId: profile.id,
    });

    // Also attempt Supabase insert with initialized counters
    try {
      const supabase = hasAdminCredentials() ? createAdminClient() : await createClient();

      // Resolve platform UUID in database
      const { data: dbPlatform } = await (supabase.from('platforms') as unknown as {
        select: (cols: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { id: string } | null }> } };
      })
        .select('id')
        .eq('slug', matchedPlatform.slug)
        .maybeSingle();

      const platformId = dbPlatform?.id || (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchedPlatform.id) ? matchedPlatform.id : null);

      const { data: dbCat } = await (supabase.from('categories') as unknown as {
        select: (cols: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { id: string } | null }> } };
      })
        .select('id')
        .eq('slug', matchedCategory.slug)
        .maybeSingle();

      const categoryId = dbCat?.id || (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchedCategory.id) ? matchedCategory.id : null);

      if (platformId) {
        const { data: insertedRow } = await (supabase.from('resources') as unknown as {
          insert: (row: Record<string, unknown>) => { select: (cols: string) => { maybeSingle: () => Promise<{ data: { id: string } | null }> } };
        })
          .insert({
            name,
            slug,
            description,
            official_url,
            platform_id: platformId,
            featured,
            is_published,
            is_active: true,
            view_count: 0,
            views_count: 0,
            click_count: 0,
            clicks_count: 0,
            logo_url,
            contributor_id,
            subcategory,
          })
          .select('id')
          .maybeSingle();

        if (insertedRow?.id && categoryId) {
          await (supabase.from('resource_categories') as unknown as {
            insert: (row: Record<string, unknown>) => Promise<unknown>;
          }).insert({
            resource_id: insertedRow.id,
            category_id: categoryId,
          });
        }
      }
    } catch {
      // Non-fatal if Supabase insert fails or table is offline
    }

    // Revalidate paths so newly added resources appear immediately
    try {
      revalidatePath('/');
      revalidatePath('/resources');
      revalidatePath('/admin/resources');
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true, resource: newResource });
  } catch (err) {
    console.error('Error adding resource:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create resource.' },
      { status: 500 }
    );
  }
}
