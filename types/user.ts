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
  avatar_url: string | null;
  preferred_platform: string | null;
  created_at: string;
  updated_at: string;
}

export type UpdateUserProfileInput = Partial<
  Pick<UserProfile, 'full_name' | 'avatar_url' | 'preferred_platform'>
>;

export interface UserSession {
  user: UserProfile;
  access_token: string;
  expires_at: number;
}
