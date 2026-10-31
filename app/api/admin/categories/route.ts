import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin';
import { getActiveCategories } from '@/lib/supabase/db';
import { recordAuditLog } from '@/lib/data/audit-logs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const { data: categories, error } = await getActiveCategories();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, categories });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve categories.' },
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
    const supabase = hasAdminCredentials() ? createAdminClient() : await createClient();

    const { data: rpcRes, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: { p_payload: Record<string, unknown> }
    ) => Promise<{ data: { success?: boolean; category?: unknown; error?: string } | null; error: unknown }>)(
      'admin_save_category',
      { p_payload: body }
    );

    if (error || rpcRes?.error) {
      return NextResponse.json(
        { error: rpcRes?.error || 'Failed to save category.' },
        { status: 400 }
      );
    }

    await recordAuditLog({
      action: 'save_category',
      entityType: 'category',
      entityId: body.slug || body.name,
      details: { name: body.name },
      actorId: profile.id,
    });

    try {
      revalidatePath('/admin/categories');
      revalidatePath('/categories');
      revalidatePath('/resources');
      revalidatePath('/');
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true, category: rpcRes?.category });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.slug || body.identifier;
    }

    if (!id) {
      return NextResponse.json({ error: 'Category identifier is required.' }, { status: 400 });
    }

    const supabase = hasAdminCredentials() ? createAdminClient() : await createClient();
    await (supabase.rpc as unknown as (
      fn: string,
      args: { p_identifier: string }
    ) => Promise<unknown>)('admin_delete_category', { p_identifier: id });

    await recordAuditLog({
      action: 'delete_category',
      entityType: 'category',
      entityId: id,
      details: { deleted: true },
      actorId: profile.id,
    });

    try {
      revalidatePath('/admin/categories');
      revalidatePath('/categories');
      revalidatePath('/resources');
      revalidatePath('/');
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete category.' },
      { status: 500 }
    );
  }
}
