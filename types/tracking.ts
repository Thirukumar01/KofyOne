/**
 * KofyOne - Contributor & Referral Tracking Types
 * Decouples platform-specific campaign attribution (e.g. Microsoft wt.mc_id)
 * from core business logic so it remains admin-configurable.
 */

export interface TrackingConfig {
  id: string;
  platform_id: string;
  tracking_parameter: string;
  tracking_value: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateTrackingConfigInput = Omit<TrackingConfig, 'id' | 'created_at' | 'updated_at'>;

export type UpdateTrackingConfigInput = Partial<CreateTrackingConfigInput>;

export interface TrackedUrlOptions {
  overrideParam?: string;
  overrideValue?: string;
  additionalParams?: Record<string, string>;
}
