/**
 * KofyOne - useAnalytics Hook
 * Convenience React hook for emitting analytics telemetry.
 */

'use client';

import { useCallback } from 'react';
import { trackEvent, identifyUser, resetAnalytics } from '@/lib/analytics/posthog';
import { AnalyticsEventName, AnalyticsEventPayloadMap, UserAnalyticsProperties } from '@/types/analytics';

export function useAnalytics() {
  const track = useCallback(
    <E extends AnalyticsEventName>(event: E, properties: AnalyticsEventPayloadMap[E]) => {
      trackEvent(event, properties);
    },
    []
  );

  const identify = useCallback((userId: string, properties?: UserAnalyticsProperties) => {
    identifyUser(userId, properties);
  }, []);

  const reset = useCallback(() => {
    resetAnalytics();
  }, []);

  return {
    track,
    identify,
    reset,
  };
}
