/**
 * KofyOne - Safe Post-Authentication Redirect Validator
 * Prevents Open Redirect and SSRF attacks by strictly validating destination paths.
 */

const FORBIDDEN_PATTERNS = [
  /^[/\\]{2,}/,          // Protocol-relative (//example.com) or Windows share paths
  /[/\\]{2,}/,          // Multiple slashes that might be misinterpreted by some routers
  /^[a-z][a-z0-9+.-]*:/i, // Absolute URIs with schemes (https:, javascript:, data:, etc.)
  /[\r\n\t\0]/,         // Control characters
  /\\/,                 // Backslashes
];

/**
 * Returns a sanitized, safe relative path for post-login redirection.
 * If the input path is external, malformed, or untrusted, returns the fallback path.
 */
export function getSafeRedirectUrl(
  input: string | null | undefined,
  fallback = '/'
): string {
  if (!input || typeof input !== 'string') {
    return fallback;
  }

  const trimmed = input.trim();

  // Must start with a single forward slash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  // Reject all forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return fallback;
    }
  }

  // Try parsing against a dummy origin to ensure pathname sanity
  try {
    const parsed = new URL(trimmed, 'https://kofyone.local');
    if (parsed.origin !== 'https://kofyone.local') {
      return fallback;
    }
    // Return pathname + search + hash
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
