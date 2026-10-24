/**
 * KofyOne - URL Tracking Engine
 * Dynamic, platform-agnostic URL attribution utility with Microsoft-exclusive
 * Contributor ID enforcement.
 *
 * Appends campaign/contributor tracking parameters (such as Microsoft's wt.mc_id)
 * ONLY to Microsoft resources, preserving query parameters and URL fragments.
 * Never attaches Microsoft tracking parameters to AWS, Google, or other non-Microsoft resources.
 */

import type { TrackingConfig, TrackedUrlOptions } from '../../types/tracking.ts';

export interface ResourceTrackingContext {
  platformSlug?: string;
  platformName?: string;
  contributorId?: string | null;
}

/**
 * Determines whether a given platform is Microsoft.
 */
export function isMicrosoftPlatform(platformSlugOrName?: string | null): boolean {
  if (!platformSlugOrName) return false;
  const normalized = platformSlugOrName.toLowerCase().trim();
  return (
    normalized === 'microsoft' ||
    normalized === 'microsoft-learn' ||
    normalized.includes('microsoft') ||
    normalized.includes('azure')
  );
}

/**
 * Builds a tracked destination URL.
 *
 * Rules:
 * 1. Microsoft Contributor ID applies exclusively to Microsoft resources.
 * 2. When Microsoft is the provider and a Contributor ID exists, attaches/updates `wt.mc_id`.
 * 3. When AWS, Google, or Other is the provider, NEVER attaches Microsoft tracking parameters.
 * 4. Preserves existing unrelated query parameters and hash fragments (#fragment).
 * 5. Does not invent a Contributor ID if none is supplied.
 */
export function buildTrackedUrl(
  rawUrl: string,
  config?: TrackingConfig | null,
  options?: TrackedUrlOptions,
  context?: ResourceTrackingContext
): string {
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl);

    // Identify provider: either from context or from config
    const providerIdentifier = context?.platformSlug || context?.platformName;
    const isMicrosoft = providerIdentifier
      ? isMicrosoftPlatform(providerIdentifier)
      : true; // If no context provided, defer to config presence

    // Microsoft Contributor ID: apply ONLY if provider is Microsoft
    if (isMicrosoft) {
      const explicitContributorId = context?.contributorId;
      if (explicitContributorId && explicitContributorId.trim()) {
        url.searchParams.set('wt.mc_id', explicitContributorId.trim());
      } else if (config && config.is_enabled) {
        const paramName = options?.overrideParam || config.tracking_parameter || 'wt.mc_id';
        const paramValue = options?.overrideValue || config.tracking_value;
        if (paramName && paramValue) {
          url.searchParams.set(paramName, paramValue);
        }
      }
    } else {
      // Non-Microsoft provider (AWS, Google, Other):
      // Ensure no Microsoft tracking parameter is attached
      if (url.searchParams.has('wt.mc_id')) {
        url.searchParams.delete('wt.mc_id');
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
