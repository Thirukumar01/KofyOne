/**
 * KofyOne - Site Configuration
 * Central source of truth for site-wide metadata, brand, and navigation hierarchy.
 */

export const adminNavGroups = [
  {
    group: 'Overview',
    items: [
      { title: 'Dashboard', href: '/admin' },
      { title: 'Analytics', href: '/admin/analytics' },
    ],
  },
  {
    group: 'Catalog',
    items: [
      { title: 'Resources', href: '/admin/resources' },
      { title: 'Platforms', href: '/admin/platforms' },
      { title: 'Categories', href: '/admin/categories' },
    ],
  },
  {
    group: 'Content & Brand',
    items: [
      { title: 'Branding', href: '/admin/branding' },
      { title: 'Legal & Pages', href: '/admin/legal' },
      { title: 'Updates', href: '/admin/updates' },
      { title: 'Events', href: '/admin/events' },
    ],
  },
  {
    group: 'System',
    items: [
      { title: 'Users', href: '/admin/users' },
      { title: 'Audit Logs', href: '/admin/audit-logs' },
      { title: 'Settings', href: '/admin/settings' },
    ],
  },
] as const;

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
    // Overview
    { title: 'Dashboard', href: '/admin', group: 'Overview' },
    { title: 'Analytics', href: '/admin/analytics', group: 'Overview' },
    // Catalog
    { title: 'Resources', href: '/admin/resources', group: 'Catalog' },
    { title: 'Platforms', href: '/admin/platforms', group: 'Catalog' },
    { title: 'Categories', href: '/admin/categories', group: 'Catalog' },
    // Content & Brand
    { title: 'Branding', href: '/admin/branding', group: 'Content & Brand' },
    { title: 'Legal & Pages', href: '/admin/legal', group: 'Content & Brand' },
    { title: 'Updates', href: '/admin/updates', group: 'Content & Brand' },
    { title: 'Events', href: '/admin/events', group: 'Content & Brand' },
    // System
    { title: 'Users', href: '/admin/users', group: 'System' },
    { title: 'Audit Logs', href: '/admin/audit-logs', group: 'System' },
    { title: 'Settings', href: '/admin/settings', group: 'System' },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
