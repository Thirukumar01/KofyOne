/**
 * KofyOne - Analytics Types
 * Strongly typed PostHog events for student resource discovery & engagement.
 */

export type AnalyticsEventName =
  | 'user_signed_in'
  | 'resource_viewed'
  | 'resource_opened'
  | 'resource_favorited'
  | 'platform_selected'
  | 'category_selected'
  | 'search_performed'
  | 'event_viewed'
  | 'notification_opened';

export interface AnalyticsEventPayloadMap {
  user_signed_in: {
    user_id: string;
    auth_provider?: string;
  };
  resource_viewed: {
    resource_id: string;
    resource_name: string;
    platform_id: string;
    platform_name: string;
    category_ids?: string[];
  };
  resource_opened: {
    resource_id: string;
    resource_name: string;
    official_url: string;
    tracked_url: string;
    platform_id: string;
    tracking_applied: boolean;
  };
  resource_favorited: {
    resource_id: string;
    is_favorited: boolean;
  };
  platform_selected: {
    platform_id: string;
    platform_slug: string;
  };
  category_selected: {
    category_id: string;
    category_slug: string;
  };
  search_performed: {
    query: string;
    results_count: number;
    platform_filter?: string;
    category_filter?: string;
  };
  event_viewed: {
    event_id: string;
    event_title: string;
  };
  notification_opened: {
    notification_id: string;
    notification_type: string;
  };
}

export interface UserAnalyticsProperties {
  user_id?: string;
  email?: string;
  role?: 'student' | 'educator' | 'admin';
  preferred_platform?: string;
}
