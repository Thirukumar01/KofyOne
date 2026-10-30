import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditLogInput {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  actorId?: string | null;
}

/**
 * Records an immutable administrative or security action into public.audit_logs.
 * Safely falls back if database is not reachable.
 */
export async function recordAuditLog(input: AuditLogInput): Promise<boolean> {
  const { action, entityType, entityId = '', details = {}, actorId } = input;

  try {
    // 1. Try service-role admin client if configured
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createAdminClient();
      if (adminClient) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (adminClient.from('audit_logs') as any).insert({
          action,
          entity_type: entityType,
          entity_id: entityId,
          details,
          changes: details,
          actor_id: actorId || null,
        });
        if (!error) return true;
      }
    }

    // 2. Fall back to standard server client
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('audit_logs') as any).insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      changes: details,
      actor_id: actorId || null,
    });

    if (error) {
      console.warn('[AuditLog] Insert warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[AuditLog] Failed to record audit log:', err instanceof Error ? err.message : err);
    return false;
  }
}
