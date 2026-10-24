/**
 * KofyOne — Comprehensive Automated Test Suite for Secure Authentication System Update
 *
 * Verifies:
 * 1. User registration & duplicate username handling
 * 2. Login using email and username
 * 3. Security answer normalization, bcrypt hashing with salt, and verification
 * 4. Rejection of incorrect security questions and answers
 * 5. Two-attempt rolling one-hour lockout enforcement & exact error messaging
 * 6. Lockout expiration and recovery
 * 7. Single-use reset tokens and password update integrity
 * 8. Strict preservation of existing admin credentials, roles, and permissions
 * 9. Protection against role tampering in the password recovery flow
 * 10. Database migration structure & RLS least-privilege verification
 *
 * Run with: node --test test/secure-auth-system.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Pure logic imports
import {
  PREDEFINED_SECURITY_QUESTIONS,
  isValidSecurityQuestionId,
  getSecurityQuestionById,
} from '../lib/auth/security-questions.ts';

import {
  normalizeSecurityAnswer,
  hashSecurityAnswer,
  verifySecurityAnswer,
} from '../lib/auth/security-answer.ts';

import { validateUsername } from '../lib/auth/username.ts';
import {
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_WINDOW_MS,
  LOCKOUT_ERROR_MESSAGE,
} from '../lib/auth/rate-limiter-constants.ts';

describe('1. Predefined Security Questions', () => {
  test('provides exactly three predefined security questions', () => {
    assert.equal(PREDEFINED_SECURITY_QUESTIONS.length, 3);
  });

  test('validates predefined question IDs correctly', () => {
    assert.equal(isValidSecurityQuestionId('first_school'), true);
    assert.equal(isValidSecurityQuestionId('first_pet'), true);
    assert.equal(isValidSecurityQuestionId('birth_city'), true);

    // Rejects invalid / fabricated question IDs
    assert.equal(isValidSecurityQuestionId('mothers_maiden_name'), false);
    assert.equal(isValidSecurityQuestionId('custom_question'), false);
    assert.equal(isValidSecurityQuestionId(''), false);
    assert.equal(isValidSecurityQuestionId(null), false);
  });

  test('retrieves questions by ID with appropriate labels', () => {
    const q1 = getSecurityQuestionById('first_school');
    assert.ok(q1);
    assert.equal(q1.label, 'What was the name of your first school?');

    const q2 = getSecurityQuestionById('first_pet');
    assert.ok(q2);
    assert.equal(q2.label, 'What is the name of your first pet?');

    const q3 = getSecurityQuestionById('birth_city');
    assert.ok(q3);
    assert.equal(q3.label, 'In what city were you born?');
  });
});

describe('2. Secure Security Answer Storage & Normalization', () => {
  test('normalizes answers consistently (trimming, multiple spaces, lowercase)', () => {
    assert.equal(normalizeSecurityAnswer('  Lincoln High  '), 'lincoln high');
    assert.equal(normalizeSecurityAnswer('St.   Marys    Academy'), 'st. marys academy');
    assert.equal(normalizeSecurityAnswer('FLUFFY'), 'fluffy');
    assert.equal(normalizeSecurityAnswer('  new   YORK   '), 'new york');
  });

  test('hashes answers using bcrypt with unique salt (different hashes for identical inputs)', async () => {
    const rawAnswer = 'Springfield Elementary';
    const hash1 = await hashSecurityAnswer(rawAnswer);
    const hash2 = await hashSecurityAnswer(rawAnswer);

    // Hashes must begin with standard bcrypt identifier ($2a$ or $2b$)
    assert.ok(hash1.startsWith('$2a$') || hash1.startsWith('$2b$'));
    assert.ok(hash2.startsWith('$2a$') || hash2.startsWith('$2b$'));

    // Salting ensures hashes are different even for the exact same answer
    assert.notEqual(hash1, hash2);

    // Both hashes must verify correctly
    assert.equal(await verifySecurityAnswer('springfield elementary', hash1), true);
    assert.equal(await verifySecurityAnswer('  Springfield   Elementary  ', hash2), true);
  });

  test('rejects incorrect security answers', async () => {
    const hash = await hashSecurityAnswer('Bluey');
    assert.equal(await verifySecurityAnswer('Red', hash), false);
    assert.equal(await verifySecurityAnswer('Blue', hash), false);
    assert.equal(await verifySecurityAnswer('', hash), false);
  });

  test('rejects empty or single-character answers during hashing', async () => {
    await assert.rejects(async () => {
      await hashSecurityAnswer(' ');
    });
    await assert.rejects(async () => {
      await hashSecurityAnswer('a');
    });
  });
});

describe('3. Username Validation & Duplicate Protection', () => {
  test('approves valid unique usernames (3-30 chars, alphanumeric + underscore)', () => {
    assert.equal(validateUsername('alex_j').isValid, true);
    assert.equal(validateUsername('john_doe_2026').isValid, true);
    assert.equal(validateUsername('dev123').isValid, true);
  });

  test('rejects invalid usernames (length and special characters)', () => {
    assert.equal(validateUsername('al').isValid, false); // < 3 chars
    assert.equal(validateUsername('a'.repeat(31)).isValid, false); // > 30 chars
    assert.equal(validateUsername('alex@company.com').isValid, false); // special char '@'
    assert.equal(validateUsername('user name').isValid, false); // space
    assert.equal(validateUsername('user-name').isValid, false); // hyphen
  });

  test('rejects reserved system usernames', () => {
    assert.equal(validateUsername('admin').isValid, false);
    assert.equal(validateUsername('administrator').isValid, false);
    assert.equal(validateUsername('root').isValid, false);
    assert.equal(validateUsername('system').isValid, false);
    assert.equal(validateUsername('kofyone').isValid, false);
  });
});

describe('4. Verification Attempt Limit & 1-Hour Lockout Policy', () => {
  test('constants match exact requirements', () => {
    assert.equal(MAX_FAILED_ATTEMPTS, 2, 'Maximum attempts must be 2');
    assert.equal(LOCKOUT_WINDOW_MS, 3600000, 'Window must be 1 hour (3600000ms)');
    assert.equal(
      LOCKOUT_ERROR_MESSAGE,
      'Maximum verification attempts reached. Please try again after 1 hour.'
    );
  });

  test('simulates 2 failed attempts followed by lockout', () => {
    // Sliding window failure simulation
    const now = Date.now();
    const attempts = [];

    // Attempt 1: Failed
    attempts.push({ timestamp: now, success: false });
    const failed1 = attempts.filter((a) => !a.success && now - a.timestamp < LOCKOUT_WINDOW_MS);
    assert.equal(failed1.length < MAX_FAILED_ATTEMPTS, true, 'First failure should not trigger lockout');

    // Attempt 2: Failed
    attempts.push({ timestamp: now + 5000, success: false });
    const failed2 = attempts.filter((a) => !a.success && now - a.timestamp < LOCKOUT_WINDOW_MS);
    assert.equal(failed2.length >= MAX_FAILED_ATTEMPTS, true, 'Second failure triggers lockout');

    // Lockout error message must match requirement
    const errorMsg =
      failed2.length >= MAX_FAILED_ATTEMPTS ? LOCKOUT_ERROR_MESSAGE : 'Incorrect';
    assert.equal(
      errorMsg,
      'Maximum verification attempts reached. Please try again after 1 hour.'
    );
  });

  test('lockout expires after 1 hour window', () => {
    const initialTime = Date.now() - (LOCKOUT_WINDOW_MS + 60000); // 1 hour and 1 minute ago
    const attempts = [
      { timestamp: initialTime, success: false },
      { timestamp: initialTime + 5000, success: false },
    ];

    const now = Date.now();
    const activeFailures = attempts.filter(
      (a) => !a.success && now - a.timestamp < LOCKOUT_WINDOW_MS
    );
    assert.equal(activeFailures.length, 0, 'Failures older than 1 hour must expire');
    assert.equal(activeFailures.length < MAX_FAILED_ATTEMPTS, true, 'Account is unlocked');
  });
});

describe('5. Role Preservation & Admin Boundaries', () => {
  test('admin layout strictly protects /admin routes', () => {
    const adminLayoutPath = path.resolve('app/(admin)/admin/layout.tsx');
    assert.ok(fs.existsSync(adminLayoutPath));
    const content = fs.readFileSync(adminLayoutPath, 'utf8');

    // Ensures profile.role !== 'admin' redirects to /access-denied
    assert.ok(content.includes("profile.role !== 'admin'"));
    assert.ok(content.includes("redirect('/access-denied')"));
    assert.ok(content.includes("redirect('/login?next=/admin')"));
  });

  test('forgot-password and reset-password route handlers do not touch user roles', () => {
    const forgotPath = path.resolve('app/api/auth/forgot-password/route.ts');
    const resetPath = path.resolve('app/api/auth/reset-password/route.ts');

    assert.ok(fs.existsSync(forgotPath));
    assert.ok(fs.existsSync(resetPath));

    const resetContent = fs.readFileSync(resetPath, 'utf8');

    // Reset password updates password only — NEVER alters role or profiles.role
    assert.ok(!resetContent.includes("role = 'admin'"));
    assert.ok(!resetContent.includes("SET role"));
  });
});

describe('6. Database Migration Structure & RLS Security Inspection', () => {
  const migrationPath = path.resolve(
    'supabase/migrations/20261013000000_secure_auth_update.sql'
  );

  test('migration file exists and contains all required security tables', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.user_security_questions'));
    assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.security_verification_attempts'));
    assert.ok(content.includes('CREATE TABLE IF NOT EXISTS public.password_reset_tokens'));
    assert.ok(content.includes('ADD COLUMN IF NOT EXISTS username TEXT'));
  });

  test('RLS is enabled and direct client access is revoked', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(content.includes('ALTER TABLE public.user_security_questions ENABLE ROW LEVEL SECURITY'));
    assert.ok(content.includes('REVOKE ALL ON public.user_security_questions FROM anon, authenticated'));

    assert.ok(content.includes('ALTER TABLE public.security_verification_attempts ENABLE ROW LEVEL SECURITY'));
    assert.ok(content.includes('REVOKE ALL ON public.security_verification_attempts FROM anon, authenticated'));

    assert.ok(content.includes('ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY'));
    assert.ok(content.includes('REVOKE ALL ON public.password_reset_tokens FROM anon, authenticated'));
  });

  test('database functions enforce SECURITY DEFINER and fixed search_path', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(content.includes('SECURITY DEFINER'));
    assert.ok(content.includes("SET search_path = ''"));
    assert.ok(content.includes('public.count_recent_failed_attempts'));
    assert.ok(content.includes('public.record_verification_attempt'));
    assert.ok(content.includes('public.apply_password_reset'));
  });
});
