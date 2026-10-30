import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.title === 'string') updates.title = body.title.trim();
    if (typeof body.description === 'string') updates.description = body.description.trim();
    if (typeof body.event_date === 'string') updates.event_date = body.event_date.trim();
    if (typeof body.location === 'string') updates.location = body.location.trim();
    if (typeof body.category === 'string') updates.category = body.category.trim();
    if (body.official_url !== undefined) updates.official_url = body.official_url;
    if (typeof body.is_published === 'boolean') updates.is_published = body.is_published;

    const supabase = await createClient();
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
    const client = adminClient || supabase;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('events') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await recordAuditLog({
      action: 'update_event',
      entityType: 'event',
      entityId: id,
      details: updates,
      actorId: profile.id,
    });

    return NextResponse.json({ success: true, event: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update event.' },
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

    const supabase = await createClient();
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
    const client = adminClient || supabase;

    const { error } = await client.from('events').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await recordAuditLog({
      action: 'delete_event',
      entityType: 'event',
      entityId: id,
      details: { deleted: true },
      actorId: profile.id,
    });

    return NextResponse.json({ success: true, message: 'Event successfully removed.' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete event.' },
      { status: 500 }
    );
  }
}
