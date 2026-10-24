/**
 * KofyOne - Secure Security Answer Normalization & Hashing
 *
 * Implements cryptographic hashing and verification for security answers.
 * Answers are normalized, salted, and hashed using bcrypt.
 * Plaintext answers are NEVER stored or returned.
 */

import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Normalizes a security answer consistently before hashing or verification:
 * - Trims leading and trailing whitespace
 * - Collapses consecutive internal whitespace to a single space
 * - Converts to lowercase for case-insensitive matching
 */
export function normalizeSecurityAnswer(answer: string): string {
  if (typeof answer !== 'string') return '';
  return answer
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Hashes a normalized security answer using bcrypt with a unique salt.
 * Uses 12 salt rounds for strong security against brute force.
 */
export async function hashSecurityAnswer(answer: string): Promise<string> {
  const normalized = normalizeSecurityAnswer(answer);
  if (!normalized || normalized.length < 2) {
    throw new Error('Security answer must be at least 2 characters long.');
  }

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(normalized, salt);
}

/**
 * Verifies a submitted security answer against a stored bcrypt hash.
 * Compares using bcrypt's timing-safe comparison.
 * Never attempts to decrypt the hash.
 */
export async function verifySecurityAnswer(
  submittedAnswer: string,
  storedHash: string
): Promise<boolean> {
  if (!submittedAnswer || !storedHash) {
    return false;
  }

  const normalized = normalizeSecurityAnswer(submittedAnswer);
  if (!normalized) {
    return false;
  }

  try {
    return await bcrypt.compare(normalized, storedHash);
  } catch {
    return false;
  }
}
