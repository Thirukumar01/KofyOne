import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { INITIAL_PLATFORMS } from '@/config/platforms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const activePlatform = INITIAL_PLATFORMS[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center">
        <Badge variant="brand" className="mb-4">
          Phase 0 Foundation • Microsoft Ecosystem First
        </Badge>

        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
          {siteConfig.name}
        </h1>

        <p className="mt-4 text-xl font-medium text-blue-600 sm:text-2xl dark:text-blue-400">
          {siteConfig.tagline}
        </p>

        <p className="mt-4 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          {siteConfig.description}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/resources">
            <Button size="lg" className="shadow-md">
              Explore Resources
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline" size="lg">
              Admin Portal
            </Button>
          </Link>
        </div>
      </section>

      {/* Architecture Foundations Grid */}
      <section className="mt-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Locked Architecture & Foundations
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Platform-independent architecture designed for high scalability and security.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Active Ecosystem</CardTitle>
                <Badge variant="success">Active</Badge>
              </div>
              <CardDescription>First Supported Platform</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {activePlatform.name}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Domain: {activePlatform.domain} • Dynamic attribution configured.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Database & Security</CardTitle>
                <Badge variant="outline">PostgreSQL</Badge>
              </div>
              <CardDescription>Supabase RLS</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                PostgreSQL with Row Level Security policies, protecting student data and resource integrity.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Discovery & Search</CardTitle>
                <Badge variant="outline">Full-Text</Badge>
              </div>
              <CardDescription>PostgreSQL FTS</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Fast tsvector ranking by title, description, category, and metadata with zero external engine bloat.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">URL Tracking Engine</CardTitle>
                <Badge variant="brand">Dynamic</Badge>
              </div>
              <CardDescription>Contributor Attribution</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Clean parameter injection for student ambassador tracking without hardcoded values in UI logic.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Telemetry</CardTitle>
                <Badge variant="outline">PostHog</Badge>
              </div>
              <CardDescription>Privacy-First Analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Type-safe client and server events tracking discovery, views, favorites, and referrals.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Asset Delivery</CardTitle>
                <Badge variant="outline">Cloudflare R2</Badge>
              </div>
              <CardDescription>Object Storage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                High-performance global CDN delivery for resource logos, platform badges, and student media.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
