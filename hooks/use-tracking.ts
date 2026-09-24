/**
 * KofyOne - useTracking Hook
 * React hook to generate tracked official URLs and capture outbound clicks.
 */

'use client';

import { useMemo, useCallback } from 'react';
import { TrackingConfig, TrackedUrlOptions } from '@/types/tracking';
import { buildTrackedUrl } from '@/lib/tracking/url-builder';
import { trackEvent } from '@/lib/analytics/posthog';

interface UseTrackingProps {
  resourceId?: string;
  resourceName?: string;
  officialUrl: string;
  platformId?: string;
  trackingConfig?: TrackingConfig | null;
  options?: TrackedUrlOptions;
}

export function useTracking({
  resourceId,
  resourceName,
  officialUrl,
  platformId,
  trackingConfig,
  options,
}: UseTrackingProps) {
  const trackedUrl = useMemo(() => {
    return buildTrackedUrl(officialUrl, trackingConfig, options);
  }, [officialUrl, trackingConfig, options]);

  const handleResourceClick = useCallback(() => {
    if (resourceId && resourceName && platformId) {
      trackEvent('resource_opened', {
        resource_id: resourceId,
        resource_name: resourceName,
        official_url: officialUrl,
        tracked_url: trackedUrl,
        platform_id: platformId,
        tracking_applied: Boolean(trackingConfig?.is_enabled),
      });
    }
  }, [resourceId, resourceName, platformId, officialUrl, trackedUrl, trackingConfig]);

  return {
    trackedUrl,
    handleResourceClick,
    isTrackingApplied: Boolean(trackingConfig?.is_enabled),
  };
}
