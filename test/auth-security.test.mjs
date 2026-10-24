/**
 * KofyOne - Automated Authentication & Authorization Security Test Suite
 * Executable with: node --test test/auth-security.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import Pure Modules
import { getSafeRedirectUrl } from '../lib/auth/redirect.ts';
import { validatePassword } from '../lib/auth/password.ts';

describe('Safe Post-Login Redirect Validator (Open Redirect & SSRF Defense)', () => {
  test('allows safe relative application paths', () => {
    assert.equal(getSafeRedirectUrl('/dashboard'), '/dashboard');
    assert.equal(getSafeRedirectUrl('/profile'), '/profile');
    assert.equal(getSafeRedirectUrl('/settings/security'), '/settings/security');
    assert.equal(getSafeRedirectUrl('/admin'), '/admin');
    assert.equal(getSafeRedirectUrl('/resources?cat=ai#overview'), '/resources?cat=ai#overview');
  });

  test('rejects external absolute URLs with protocol', () => {
    assert.equal(getSafeRedirectUrl('https://evil.com'), '/');
    assert.equal(getSafeRedirectUrl('http://attacker.com/steal-token'), '/');
    assert.equal(getSafeRedirectUrl('ftp://example.com'), '/');
  });

  test('rejects protocol-relative URLs (//evil.com)', () => {
    assert.equal(getSafeRedirectUrl('//evil.com'), '/');
    assert.equal(getSafeRedirectUrl('///evil.com'), '/');
    assert.equal(getSafeRedirectUrl('/\\evil.com'), '/');
  });

  test('rejects javascript and data URIs', () => {
    assert.equal(getSafeRedirectUrl('javascript:alert(1)'), '/');
    assert.equal(getSafeRedirectUrl('data:text/html;base64,PHNjcmlwdD4='), '/');
    assert.equal(getSafeRedirectUrl('vbscript:msgbox(1)'), '/');
  });

  test('rejects control characters, newlines, and backslashes', () => {
    assert.equal(getSafeRedirectUrl('/dashboard\r\nLocation: https://evil.com'), '/');
    assert.equal(getSafeRedirectUrl('\\admin'), '/');
    assert.equal(getSafeRedirectUrl('/admin\\test'), '/');
  });

  test('falls back to custom fallback if provided', () => {
    assert.equal(getSafeRedirectUrl('https://evil.com', '/dashboard'), '/dashboard');
    assert.equal(getSafeRedirectUrl('', '/resources'), '/resources');
    assert.equal(getSafeRedirectUrl(null, '/favorites'), '/favorites');
  });
});

describe('Password Policy & Strength Evaluation', () => {
  test('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('Short1!');
    assert.ok(result.errors.includes('Must be at least 8 characters long'));
    assert.equal(result.score, 0);
  });

  test('requires lowercase, uppercase, digit, and special character', () => {
    const noUpper = validatePassword('lowercase123!');
    assert.ok(noUpper.errors.includes('Must include at least one uppercase letter'));

    const noLower = validatePassword('UPPERCASE123!');
    assert.ok(noLower.errors.includes('Must include at least one lowercase letter'));

    const noNum = validatePassword('NoNumbersHere!');
    assert.ok(noNum.errors.includes('Must include at least one number'));

    const noSpecial = validatePassword('NoSpecial1234');
    assert.ok(noSpecial.errors.includes('Must include at least one special character (!@#$%^&*...)'));
  });

  test('approves and scores strong complex passwords', () => {
    const strong = validatePassword('KofyOne@2026!Secure');
    assert.equal(strong.errors.length, 0);
    assert.ok(strong.score >= 3);
    assert.ok(['Good', 'Strong'].includes(strong.label));
  });
});

describe('Database Migration & RLS Security Inspection', () => {
  const migrationPath = path.resolve('supabase/migrations/20261011000000_auth_roles_hardening.sql');

  test('migration file exists and is populated', () => {
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.length > 500, 'Migration must have substantial content');
  });

  test('user_roles table enforces ON DELETE CASCADE and check constraint', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes('REFERENCES auth.users(id) ON DELETE CASCADE'));
    assert.ok(content.includes("CHECK (role IN ('student', 'educator', 'admin', 'guest'))"));
  });

  test('direct table access to user_roles is revoked from anon and authenticated', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes('REVOKE ALL ON public.user_roles FROM anon, authenticated;'));
  });

  test('is_admin() specifies SECURITY DEFINER and fixed search_path', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes('SECURITY DEFINER'));
    assert.ok(content.includes("SET search_path = ''"));
    assert.ok(content.includes('FROM public.user_roles'));
  });

  test('profiles table has least-privilege column grants (no self-updating role or email)', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes('REVOKE ALL ON public.profiles FROM authenticated;'));
    assert.ok(content.includes('GRANT UPDATE (full_name, avatar_url, preferred_platform) ON public.profiles TO authenticated;'));
  });
});

describe('Account Deletion & Admin Boundaries Inspection', () => {
  const deleteRoutePath = path.resolve('app/api/account/delete/route.ts');
  const adminLayoutPath = path.resolve('app/(admin)/admin/layout.tsx');

  test('delete account route derives target ID strictly from session token (not body)', () => {
    const content = fs.readFileSync(deleteRoutePath, 'utf8');
    assert.ok(content.includes('await supabase.auth.getUser()'));
    assert.ok(content.includes('const targetUserId = user.id;'));
    assert.ok(!content.includes('targetUserId = body.userId'));
    assert.ok(content.includes("confirmationText !== 'DELETE'"));
  });

  test('admin layout strictly guards all admin routes at Server Component layer', () => {
    const content = fs.readFileSync(adminLayoutPath, 'utf8');
    assert.ok(content.includes('getCurrentUserProfile()'));
    assert.ok(content.includes("redirect('/login?next=/admin')"));
    assert.ok(content.includes("redirect('/access-denied')"));
  });
});
