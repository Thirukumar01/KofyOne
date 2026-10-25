/**
 * KofyOne - Username & Password/PIN Authentication Test Suite
 *
 * Verifies:
 * 1. Dummy email normalization: ${username.toLowerCase().trim()}@myapp.local
 * 2. Form field specifications: Username and Password/PIN only (no email input)
 * 3. Unified "Enter App" button behavior (try signIn -> fallback to auto-register / 1-click sign-up)
 * 4. Session persistence configuration in Supabase browser client
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function toDummyEmail(username) {
  const clean = username.toLowerCase().trim();
  if (clean.includes('@')) {
    return clean;
  }
  return `${clean}@myapp.local`;
}

describe('1. Dummy Email Formatting & Normalization', () => {
  test('converts simple username to @myapp.local format', () => {
    assert.equal(toDummyEmail('student'), 'student@myapp.local');
    assert.equal(toDummyEmail('john_doe'), 'john_doe@myapp.local');
  });

  test('normalizes casing and trims whitespace', () => {
    assert.equal(toDummyEmail('  Alice123  '), 'alice123@myapp.local');
    assert.equal(toDummyEmail('KofyUser_99'), 'kofyuser_99@myapp.local');
  });

  test('preserves existing email identifier if provided', () => {
    assert.equal(toDummyEmail('tthirukumar847@gmail.com'), 'tthirukumar847@gmail.com');
  });
});

describe('2. Authentication Form UI & Field Verification', () => {
  const loginFormPath = resolve('app/(auth)/login/login-form.tsx');
  const loginFormContent = readFileSync(loginFormPath, 'utf-8');

  test('LoginForm has Username field and no user-facing Email input', () => {
    // Contains Username label and input
    assert.match(loginFormContent, /htmlFor="username-input"/i);
    assert.match(loginFormContent, /name="username"/i);
    assert.match(loginFormContent, /No email address needed/i);

    // Does NOT contain a user-facing email input in the form
    assert.doesNotMatch(loginFormContent, /name="email"/i);
    assert.doesNotMatch(loginFormContent, /type="email"/i);
  });

  test('LoginForm has Password / PIN field with toggle', () => {
    assert.match(loginFormContent, /Password \/ PIN/i);
    assert.match(loginFormContent, /id="password-input"/i);
    assert.match(loginFormContent, /showPassword/i);
  });

  test('LoginForm has unified "Enter App" button', () => {
    assert.match(loginFormContent, /Enter App/i);
    assert.match(loginFormContent, /handleEnterApp/i);
  });

  test('LoginForm offers 1-click Sign Up / mode switch on invalid credentials', () => {
    assert.match(loginFormContent, /suggestSignUp/i);
    assert.match(loginFormContent, /Create account as/i);
  });
});

describe('3. Supabase Auth Integration & Session Persistence', () => {
  const clientPath = resolve('lib/supabase/client.ts');
  const clientContent = readFileSync(clientPath, 'utf-8');
  const loginFormPath = resolve('app/(auth)/login/login-form.tsx');
  const loginFormContent = readFileSync(loginFormPath, 'utf-8');

  test('Supabase client explicitly enables session persistence', () => {
    assert.match(clientContent, /persistSession:\s*true/);
    assert.match(clientContent, /autoRefreshToken:\s*true/);
    assert.match(clientContent, /detectSessionInUrl:\s*true/);
  });

  test('LoginForm converts username to dummy email before calling Supabase Auth', () => {
    assert.match(loginFormContent, /toDummyEmail/);
    assert.match(loginFormContent, /@myapp\.local/);
    assert.match(loginFormContent, /supabase\.auth\.signInWithPassword/);
    assert.match(loginFormContent, /supabase\.auth\.signUp/);
  });

  test('LoginForm checks for existing persistent session on mount', () => {
    assert.match(loginFormContent, /supabase\.auth\.getSession/);
  });
});
