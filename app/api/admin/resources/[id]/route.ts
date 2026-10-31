import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin';
import { getResourceByIdOrSlug, updateResourceById, deleteResourceById, getActivePlatforms, getActiveCategories } from '@/lib/supabase/db';
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const { id } = await params;
    const resource = await getResourceByIdOrSlug(id);

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, resource });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve resource.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getResourceByIdOrSlug(id);
    if (!existing) {
      return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : existing.name;
    const slug = typeof body.slug === 'string' && body.slug.trim() ? slugify(body.slug) : existing.slug;
    const description = typeof body.description === 'string' ? body.description.trim() : existing.description;
    const official_url = typeof body.official_url === 'string' ? body.official_url.trim() : existing.official_url;
    const platform_slug = typeof body.platform_slug === 'string'
      ? body.platform_slug.trim().toLowerCase()
      : existing.platform?.slug || 'microsoft';
    const category_slug = typeof body.category_slug === 'string' ? body.category_slug : existing.categories[0]?.slug;
    const subcategory = typeof body.subcategory === 'string' ? body.subcategory.trim() : existing.subcategory;
    const featured = body.featured !== undefined ? Boolean(body.featured) : existing.featured;
    const is_published = body.is_published !== undefined ? Boolean(body.is_published) : existing.is_published;
    const logo_url = body.logo_url !== undefined ? (typeof body.logo_url === 'string' && body.logo_url.trim() ? body.logo_url.trim() : null) : existing.logo_url;

    // Tags
    let tags = existing.tags || [];
    if (body.tags !== undefined) {
      tags = Array.isArray(body.tags)
        ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
        : typeof body.tags === 'string' && body.tags.trim()
        ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];
    }

    // Contributor ID validation: strictly for Microsoft resources only!
    const isMicrosoft = isMicrosoftPlatform(platform_slug);
    let contributor_id: string | null = null;
    if (isMicrosoft) {
      if (body.contributor_id !== undefined) {
        contributor_id = typeof body.contributor_id === 'string' && body.contributor_id.trim()
          ? body.contributor_id.trim()
          : null;
      } else {
        contributor_id = existing.contributor_id || null;
      }
    } else {
      contributor_id = null;
    }

    if (!name) {
      return NextResponse.json({ error: 'Resource name is required.' }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: 'Resource description is required.' }, { status: 400 });
    }
    if (!official_url || (!official_url.startsWith('http://') && !official_url.startsWith('https://'))) {
      return NextResponse.json({ error: 'A valid official URL starting with http:// or https:// is required.' }, { status: 400 });
    }

    const [categoriesRes, platformsRes] = await Promise.all([
      getActiveCategories(),
      getActivePlatforms(),
    ]);

    const matchedPlatform = platformsRes.data.find((p) => p.slug === platform_slug) || existing.platform;
    const matchedCategory = categoriesRes.data.find((c) => c.slug === category_slug) || existing.categories[0];

    const updates: Partial<ResourceWithRelations> = {
      name,
      slug,
      description,
      official_url,
      logo_url,
      featured,
      is_published,
      platform_id: matchedPlatform.id,
      platform: matchedPlatform,
      categories: [matchedCategory],
      contributor_id,
      subcategory: subcategory || null,
      tags,
      metadata: {
        ...existing.metadata,
        subcategory: subcategory || undefined,
        tags,
      },
      updated_at: new Date().toISOString(),
    };

    if (contributor_id) {
      updates.tracking_config = {
        id: existing.tracking_config?.id || 'tc-' + Date.now(),
        platform_id: matchedPlatform.id,
        tracking_parameter: 'wt.mc_id',
        tracking_value: contributor_id,
        is_enabled: true,
        created_at: existing.tracking_config?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else {
      updates.tracking_config = null;
    }

    // Try admin_save_resource RPC
    try {
      const supabase = hasAdminCredentials() ? createAdminClient() : await createClient();
      await (supabase.rpc as unknown as (
        fn: string,
        args: { p_payload: Record<string, unknown> }
      ) => Promise<unknown>)('admin_save_resource', {
        p_payload: {
          id: existing.id,
          original_slug: existing.slug,
          slug,
          ...updates,
          platform_slug: matchedPlatform.slug,
          category_slug: matchedCategory.slug,
        },
      });
    } catch {
      // Non-fatal
    }

    const updatedResource = await updateResourceById(id, updates);

    await recordAuditLog({
      action: 'update_resource',
      entityType: 'resource',
      entityId: id,
      details: { name: updates.name, platform_id: matchedPlatform.id },
      actorId: profile.id,
    });

    try {
      revalidatePath('/');
      revalidatePath('/resources');
      revalidatePath(`/resources/${id}`);
      if (existing.slug) revalidatePath(`/resources/${existing.slug}`);
      revalidatePath('/admin/resources');
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true, resource: updatedResource || existing });
  } catch (err) {
    console.error('Error updating resource:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update resource.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getResourceByIdOrSlug(id);
    const identifiersToDelete = [id];
    if (existing?.slug && existing.slug !== id) {
      identifiersToDelete.push(existing.slug);
    }

    // Call atomic RPC
    try {
      const supabase = hasAdminCredentials() ? createAdminClient() : await createClient();
      await (supabase.rpc as unknown as (
        fn: string,
        args: { p_identifier: string }
      ) => Promise<unknown>)('admin_delete_resource', { p_identifier: identifiersToDelete.join(',') });
    } catch {
      // Non-fatal
    }

    let deleted = false;
    for (const ident of identifiersToDelete) {
      const resDel = await deleteResourceById(ident);
      if (resDel) deleted = true;
    }

    await recordAuditLog({
      action: 'delete_resource',
      entityType: 'resource',
      entityId: id,
      details: { deleted: true },
      actorId: profile.id,
    });

    try {
      revalidatePath('/');
      revalidatePath('/resources');
      revalidatePath('/admin/resources');
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: deleted });
  } catch (err) {
    console.error('Error deleting resource:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete resource.' },
      { status: 500 }
    );
  }
}
