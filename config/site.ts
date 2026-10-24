/**
 * KofyOne - Site Configuration
 * Central source of truth for site-wide metadata, brand, and navigation hierarchy.
 */

export const siteConfig = {
  name: 'KofyOne',
  tagline: 'Learn Today. Build Tomorrow.',
  description:
    'A student-focused resource discovery platform to discover, search, explore, save, and revisit official Microsoft learning and developer resources.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  creator: 'KofyOne Community',
  links: {
    github: 'https://github.com/kofyone',
    documentation: '/docs',
  },
  mainNav: [
    { title: 'Explore Resources', href: '/resources' },
    { title: 'Categories', href: '/categories' },
    { title: 'Platforms', href: '/platforms' },
    { title: 'Favorites', href: '/favorites' },
    { title: 'Recently Viewed', href: '/recent' },
    { title: 'Updates', href: '/updates' },
    { title: 'Events', href: '/events' },
  ],
  adminNav: [
    { title: 'Dashboard', href: '/admin' },
    { title: 'Resources', href: '/admin/resources' },
    { title: 'Platforms', href: '/admin/platforms' },
    { title: 'Categories', href: '/admin/categories' },
    { title: 'Legal & Pages', href: '/admin/legal' },
    { title: 'Branding', href: '/admin/branding' },
    { title: 'Updates', href: '/admin/updates' },
    { title: 'Events', href: '/admin/events' },
    { title: 'Users', href: '/admin/users' },
    { title: 'Analytics', href: '/admin/analytics' },
    { title: 'Audit Logs', href: '/admin/audit-logs' },
    { title: 'Settings', href: '/admin/settings' },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
