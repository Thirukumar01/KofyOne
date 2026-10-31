import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminCredentials } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/data/audit-logs';

export const dynamic = 'force-dynamic';

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
    const body = await request.json();
    const supabase = hasAdminCredentials() ? createAdminClient() : await createClient();

    const payload = { id, ...body };
    const { data: rpcRes, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: { p_payload: Record<string, unknown> }
    ) => Promise<{ data: { success?: boolean; category?: unknown; error?: string } | null; error: unknown }>)(
      'admin_save_category',
      { p_payload: payload }
    );

    if (error || rpcRes?.error) {
      return NextResponse.json(
        { error: rpcRes?.error || 'Failed to update category.' },
        { status: 400 }
      );
    }

    await recordAuditLog({
      action: 'update_category',
      entityType: 'category',
      entityId: id,
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
