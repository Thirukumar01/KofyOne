/**
 * KofyOne - Security Answer Verification Rate Limiter
 *
 * Implements a strict rolling 1-hour window lockout policy:
 * - Maximum of TWO failed attempts per account identifier within 1 hour.
 * - After 2 failed attempts, blocked for 1 hour from the second failure.
 * - Exact required error: "Maximum verification attempts reached. Please try again after 1 hour."
 * - Server-side enforcement resistant to browser refreshes, tabs, or frontend state resets.
 */

import { getDynamicClient, getDynamicAdminClient } from '@/lib/supabase/rpc-helper';
import {
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_WINDOW_MS,
  LOCKOUT_ERROR_MESSAGE,
} from './rate-limiter-constants';

export { MAX_FAILED_ATTEMPTS, LOCKOUT_WINDOW_MS, LOCKOUT_ERROR_MESSAGE };

// In-memory sliding log for fast concurrent coordination within Node process
interface AttemptRecord {
  timestamp: number;
  success: boolean;
}

const memoryAttempts = new Map<string, AttemptRecord[]>();

function cleanOldMemoryAttempts(identifier: string, now: number) {
  const records = memoryAttempts.get(identifier);
  if (!records) return;
  const filtered = records.filter((r) => now - r.timestamp < LOCKOUT_WINDOW_MS);
  if (filtered.length === 0) {
    memoryAttempts.delete(identifier);
  } else {
    memoryAttempts.set(identifier, filtered);
  }
}

/**
 * Checks if the account identifier is currently locked out.
 * Returns { isLocked: boolean, remainingMs: number }
 */
export async function checkLockout(identifier: string): Promise<{
  isLocked: boolean;
  remainingMs: number;
}> {
  const normalized = identifier.trim().toLowerCase();
  const now = Date.now();

  // 1. Fast in-memory check
  cleanOldMemoryAttempts(normalized, now);
  const memRecords = memoryAttempts.get(normalized) || [];
  const failedMemRecords = memRecords.filter((r) => !r.success);

  if (failedMemRecords.length >= MAX_FAILED_ATTEMPTS) {
    const oldestLockoutFailure = failedMemRecords[0].timestamp;
    const elapsed = now - oldestLockoutFailure;
    if (elapsed < LOCKOUT_WINDOW_MS) {
      return { isLocked: true, remainingMs: LOCKOUT_WINDOW_MS - elapsed };
    }
  }

  // 2. Database check (primary cross-instance persistence)
  try {
    const dynamicClient = await getDynamicClient();

    // Call RPC count_recent_failed_attempts
    const { data: count, error } = await dynamicClient.rpc('count_recent_failed_attempts', {
      p_identifier: normalized,
    });

    if (!error && typeof count === 'number' && count >= MAX_FAILED_ATTEMPTS) {
      return { isLocked: true, remainingMs: LOCKOUT_WINDOW_MS };
    }

    // Direct table query fallback if RPC unavailable
    if (error) {
      const adminClient = getDynamicAdminClient();
      const client = adminClient ?? dynamicClient;
      const oneHourAgo = new Date(now - LOCKOUT_WINDOW_MS).toISOString();
      const { data: rows } = await client
        .from('security_verification_attempts')
        .select('created_at, success')
        .eq('account_identifier', normalized)
        .eq('success', false)
        .gte('created_at', oneHourAgo);

      if (Array.isArray(rows) && rows.length >= MAX_FAILED_ATTEMPTS) {
        return { isLocked: true, remainingMs: LOCKOUT_WINDOW_MS };
      }
    }
  } catch (err) {
    console.warn('[RateLimiter] DB lockout check warning:', err);
  }

  return { isLocked: false, remainingMs: 0 };
}

/**
 * Records a verification attempt (both in-memory and in the database).
 */
export async function recordAttempt(
  identifier: string,
  success: boolean,
  userId: string | null = null,
  ipAddress: string | null = null
): Promise<void> {
  const normalized = identifier.trim().toLowerCase();
  const now = Date.now();

  // 1. Record in memory
  cleanOldMemoryAttempts(normalized, now);
  const records = memoryAttempts.get(normalized) || [];
  records.push({ timestamp: now, success });
  memoryAttempts.set(normalized, records);

  // If successful, reset in-memory failures for this account
  if (success) {
    memoryAttempts.delete(normalized);
  }

  // 2. Record in database
  try {
    const dynamicClient = await getDynamicClient();

    const { error: rpcError } = await dynamicClient.rpc('record_verification_attempt', {
      p_identifier: normalized,
      p_user_id: userId,
      p_success: success,
      p_ip: ipAddress,
    });

    if (rpcError) {
      const adminClient = getDynamicAdminClient();
      const client = adminClient ?? dynamicClient;
      await client.from('security_verification_attempts').insert({
        account_identifier: normalized,
        user_id: userId,
        success,
        ip_address: ipAddress,
      });
    }
  } catch (err) {
    console.warn('[RateLimiter] DB record attempt warning:', err);
  }
}

/**
 * Clears failed attempts for an account (e.g. after a successful password reset).
 */
export function clearMemoryAttempts(identifier: string): void {
  const normalized = identifier.trim().toLowerCase();
  memoryAttempts.delete(normalized);
}
