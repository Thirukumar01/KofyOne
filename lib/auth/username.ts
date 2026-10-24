/**
 * KofyOne - Username Validation Utilities
 *
 * Rules:
 * - 3 to 30 characters in length.
 * - Alphanumeric characters and underscores only.
 * - Case-insensitive uniqueness enforced across the platform.
 * - Reserved words protected.
 */

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'api',
  'kofyone',
  'support',
  'moderator',
  'superuser',
]);

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
  normalized: string;
}

export function validateUsername(username: unknown): UsernameValidationResult {
  if (typeof username !== 'string') {
    return {
      isValid: false,
      error: 'Username is required.',
      normalized: '',
    };
  }

  const clean = username.trim().toLowerCase();

  if (!clean) {
    return {
      isValid: false,
      error: 'Username is required.',
      normalized: '',
    };
  }

  if (clean.length < 3) {
    return {
      isValid: false,
      error: 'Username must be at least 3 characters long.',
      normalized: clean,
    };
  }

  if (clean.length > 30) {
    return {
      isValid: false,
      error: 'Username cannot exceed 30 characters.',
      normalized: clean,
    };
  }

  if (!USERNAME_REGEX.test(clean)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, and underscores (_).',
      normalized: clean,
    };
  }

  if (RESERVED_USERNAMES.has(clean)) {
    return {
      isValid: false,
      error: 'This username is reserved. Please choose a different one.',
      normalized: clean,
    };
  }

  return {
    isValid: true,
    normalized: clean,
  };
}
