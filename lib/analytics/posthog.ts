/**
 * KofyOne - PostHog Analytics Client
 * Provides a strongly typed wrapper around PostHog browser telemetry.
 */

import posthog from 'posthog-js';
import { AnalyticsEventName, AnalyticsEventPayloadMap, UserAnalyticsProperties } from '@/types/analytics';

let isInitialized = false;

/**
 * Initializes the PostHog analytics SDK.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined' || isInitialized) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.info('PostHog API key not detected. Analytics tracking is running in dry-run mode.');
    }
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    person_profiles: 'identified_only',
    capture_pageview: false, // Pageviews handled explicitly in App Router
    capture_pageleave: true,
    autocapture: false, // Explicit tracking preferred over uncontrolled DOM capture
  });

  isInitialized = true;
}

/**
 * Dispatches a strongly typed analytics event to PostHog.
 */
export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventPayloadMap[E]
): void {
  if (typeof window === 'undefined') return;

  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Analytics Event] ${event}:`, properties);
  }

  if (isInitialized) {
    posthog.capture(event, properties);
  }
}

/**
 * Associates an identified user with session telemetry.
 */
export function identifyUser(userId: string, properties?: UserAnalyticsProperties): void {
  if (typeof window === 'undefined' || !isInitialized) return;

  posthog.identify(userId, properties);
}

/**
 * Resets user identification on sign out.
 */
export function resetAnalytics(): void {
  if (typeof window === 'undefined' || !isInitialized) return;

  posthog.reset();
}
