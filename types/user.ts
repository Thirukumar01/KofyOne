/**
 * KofyOne - User & Profile Domain Types
 */

export type UserRole = 'student' | 'educator' | 'admin' | 'guest';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  username?: string | null;
  full_name: string | null;
  display_name?: string | null;
  avatar_url: string | null;
  bio?: string | null;
  preferred_platform: string | null;
  theme_preference?: 'light' | 'dark' | 'system' | null;
  resource_sort_preference?: 'featured' | 'popular' | 'newest' | null;
  card_layout_preference?: 'comfortable' | 'compact' | null;
  role_focus?: 'student' | 'developer' | 'educator' | null;
  created_at: string;
  updated_at: string;
}

export type UpdateUserProfileInput = Partial<
  Pick<
    UserProfile,
    | 'full_name'
    | 'display_name'
    | 'avatar_url'
    | 'bio'
    | 'preferred_platform'
    | 'theme_preference'
    | 'resource_sort_preference'
    | 'card_layout_preference'
    | 'role_focus'
  >
>;

export interface UserSession {
  user: UserProfile;
  access_token: string;
  expires_at: number;
}
