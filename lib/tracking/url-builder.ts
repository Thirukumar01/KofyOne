/**
 * KofyOne - URL Tracking Engine
 * Dynamic, platform-agnostic URL attribution utility.
 *
 * Appends campaign/contributor tracking parameters (such as Microsoft's wt.mc_id)
 * from database-driven configuration without hardcoded values in UI components.
 */

import { TrackingConfig, TrackedUrlOptions } from '@/types/tracking';

/**
 * Builds a tracked destination URL using the provided TrackingConfig.
 *
 * @param rawUrl The official resource URL
 * @param config Optional active tracking configuration from DB/context
 * @param options Optional overrides or additional query parameters
 * @returns Fully formatted tracked URL string
 */
export function buildTrackedUrl(
  rawUrl: string,
  config?: TrackingConfig | null,
  options?: TrackedUrlOptions
): string {
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl);

    // Apply primary tracking parameter if enabled
    if (config && config.is_enabled) {
      const paramName = options?.overrideParam || config.tracking_parameter;
      const paramValue = options?.overrideValue || config.tracking_value;

      if (paramName && paramValue) {
        url.searchParams.set(paramName, paramValue);
      }
    }

    // Apply any additional query parameters
    if (options?.additionalParams) {
      for (const [key, value] of Object.entries(options.additionalParams)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  } catch {
    // If rawUrl is not a valid absolute URL, return as-is
    return rawUrl;
  }
}

/**
 * Validates whether a URL belongs to the expected official platform domain.
 */
export function validatePlatformDomain(rawUrl: string, expectedDomain: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname === expectedDomain || parsed.hostname.endsWith(`.${expectedDomain}`);
  } catch {
    return false;
  }
}
