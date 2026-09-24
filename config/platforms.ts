/**
 * KofyOne - Platform Registry Configuration
 * Defines the initial platform registrations.
 *
 * NOTE: The application architecture is platform-agnostic.
 * Microsoft is the first active platform. Other platforms will be added
 * via the Admin Portal and database migrations when scheduled.
 */

export interface InitialPlatformConfig {
  slug: string;
  name: string;
  description: string;
  website_url: string;
  domain: string;
  is_active: boolean;
  display_order: number;
  default_tracking?: {
    parameter: string;
    default_value: string;
    is_enabled: boolean;
  };
}

export const INITIAL_PLATFORMS: InitialPlatformConfig[] = [
  {
    slug: 'microsoft',
    name: 'Microsoft',
    description:
      'Official Microsoft student programs, developer certifications, Azure cloud sandbox, and AI development resources.',
    website_url: 'https://learn.microsoft.com',
    domain: 'microsoft.com',
    is_active: true,
    display_order: 1,
    default_tracking: {
      parameter: 'wt.mc_id',
      // Attribution key configured as initial seed value, editable via Admin Portal/Database
      default_value: 'studentamb_504640',
      is_enabled: true,
    },
  },
];

export const DEFAULT_PLATFORM_SLUG = 'microsoft';
