import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/data/audit-logs';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getCurrentUserProfile();
    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
    }

    const { id: targetUserId } = await params;
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 });
    }

    // Safety guard: Prevents an administrator from demoting their own currently active account
    if (caller.id === targetUserId) {
      return NextResponse.json(
        { error: 'Security restriction: Administrators cannot alter or demote their own account role.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const newRole = body.role === 'admin' ? 'admin' : 'student';

    const supabase = await createClient();
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
    const clientToUse = adminClient || supabase;

    // 1. Update or upsert user_roles
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (clientToUse.from('user_roles') as any)
        .upsert({ user_id: targetUserId, role: newRole }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('[AdminUsers] user_roles upsert notice:', e);
    }

    // 2. Update profiles table
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (clientToUse.from('profiles') as any)
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', targetUserId);
    } catch (e) {
      console.warn('[AdminUsers] profiles update notice:', e);
    }

    // 3. Record audit trail
    await recordAuditLog({
      action: 'toggle_user_role',
      entityType: 'user_role',
      entityId: targetUserId,
      details: { new_role: newRole, target_user_id: targetUserId, performed_by: caller.email },
      actorId: caller.id,
    });

    return NextResponse.json({
      success: true,
      message: `User role successfully updated to ${newRole}.`,
      role: newRole,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update user role.' },
      { status: 500 }
    );
  }
}
