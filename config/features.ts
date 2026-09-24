/**
 * KofyOne - Feature Flags Configuration
 * Centralized toggles to control capability rollout cleanly across phases.
 */

export const featureFlags = {
  enableSearch: true,
  enableFavorites: true,
  enableRecentlyViewed: true,
  enableAnalytics: true,
  // Guarded features pending subsequent implementation phases
  enableAdminPortal: false,
  enableMultiPlatform: false, // Locked to Microsoft ecosystem in initial scope
} as const;

export type FeatureFlags = typeof featureFlags;
