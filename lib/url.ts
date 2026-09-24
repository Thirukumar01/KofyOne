/**
 * KofyOne - General URL Utilities
 * Reusable, robust URL validation, normalization, and parameter manipulation.
 */

import { buildTrackedUrl, validatePlatformDomain } from './tracking/url-builder';

/**
 * Checks whether a given string is a valid absolute HTTP/HTTPS URL.
 */
export function isValidUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts normalized hostname/domain from a URL string.
 */
export function extractDomain(urlString: string): string | null {
  try {
    const parsed = new URL(urlString.trim());
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Safely appends query parameters to a URL while preserving existing query
 * parameters, avoiding duplicates, and retaining hash fragments.
 */
export function appendQueryParams(
  rawUrl: string,
  params: Record<string, string | number | boolean | null | undefined>
): string {
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl.trim());

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Removes specific query parameters from a URL string while preserving
 * other parameters and hash fragments.
 */
export function removeQueryParams(rawUrl: string, paramKeys: string[]): string {
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl.trim());

    for (const key of paramKeys) {
      url.searchParams.delete(key);
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

export { buildTrackedUrl, validatePlatformDomain };
