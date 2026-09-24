# KofyOne — System Architecture Specification

## 1. High-Level Architectural Overview

KofyOne is structured as a modular, platform-independent resource discovery system built on Next.js App Router, Supabase (PostgreSQL + RLS), PostHog, and Cloudflare R2.

```
                          ┌───────────────────────────┐
                          │    Next.js Client (UI)    │
                          │ React 19 / Tailwind CSS   │
                          └─────────────┬─────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  lib/tracking/       │     │  lib/search/         │     │  lib/analytics/      │
│  Dynamic Attribution │     │  Postgres FTS Engine │     │  PostHog Telemetry   │
└──────────┬───────────┘     └──────────┬───────────┘     └──────────┬───────────┘
           │                            │                            │
           ▼                            ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                          Supabase PostgreSQL Backend                           │
│  - platforms           - categories             - resources                    │
│  - tracking_configs    - resource_categories    - user_favorites               │
│  - audit_logs          - user_recently_viewed   - RLS Policies & FTS Functions │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure & Modular Separation

The codebase enforces strict separation of concerns across standard directories:

```
kofyone/
├── app/                      # Next.js App Router
│   ├── (admin)/              # Admin Portal route group (guarded)
│   ├── (auth)/               # Authentication route group (sign in/up)
│   ├── (public)/             # Public user-facing discovery route group
│   ├── globals.css           # Global Tailwind CSS tokens
│   ├── layout.tsx            # Global layout with font, nav, and telemetry
│   └── page.tsx              # Architectural showcase & brand hero
├── components/               # Modular UI Layer
│   ├── common/               # Shared cross-cutting components (e.g. AnalyticsProvider)
│   ├── layout/               # Header, Footer, Sidebar, Navigation
│   └── ui/                   # Reusable Design System (Button, Badge, Card, Input)
├── config/                   # Configuration & Constants
│   ├── platforms.ts          # Initial platform configurations & defaults
│   └── site.ts               # Brand name, tagline, navigation menus, links
├── docs/                     # Source of Truth Documentation
│   ├── phases/               # Phase completion reports (Phase 0, Phase 1...)
│   ├── ARCHITECTURE.md       # Full architecture specification
│   └── PROJECT-CONTEXT.md    # Product vision, stack, and AI continuity rules
├── hooks/                    # Reusable React Hooks
│   ├── use-analytics.ts      # Typed PostHog telemetry hooks
│   └── use-tracking.ts       # Dynamic URL tracking and outbound click hook
├── lib/                      # Core Business Logic & Infrastructure
│   ├── analytics/            # PostHog analytics client & event dispatcher
│   ├── search/               # PostgreSQL Full-Text Search service abstraction
│   ├── storage/              # Cloudflare R2 object storage client & URL generator
│   ├── supabase/             # Supabase clients (browser, server, admin/service-role)
│   ├── tracking/             # Dynamic URL attribution builder & domain validator
│   └── utils.ts              # Tailwind class merge & formatting utilities
├── public/                   # Static public assets
├── supabase/                 # Database Migrations & Schemas
│   └── migrations/           # Versioned PostgreSQL DDL & RLS migration scripts
└── types/                    # Strictly Typed Domain Models
    ├── analytics.ts          # PostHog event names and payloads
    ├── category.ts           # Category interfaces
    ├── database.ts           # Supabase database schema representation
    ├── platform.ts           # Generic Platform model interface
    ├── resource.ts           # Resource model and metadata interfaces
    ├── search.ts             # Search queries, filters, and result pagination
    └── tracking.ts           # Dynamic tracking configuration interfaces
```

---

## 3. Database Architecture & Schema Design

Database engine: **PostgreSQL 15+ hosted on Supabase**.

### Core Tables
1. **`platforms`**: Generic platforms. First record: Microsoft (`slug = 'microsoft'`).
2. **`tracking_configs`**: Campaign attribution configurations per platform (e.g. parameter `wt.mc_id`, value `studentamb_504640`).
3. **`categories`**: Topic classification (Student Programs, Cloud & Azure, Certifications, AI & Copilot, Developer Tools).
4. **`resources`**: Official educational and developer assets with metadata, official URLs, view/click counters, and generated `search_vector`.
5. **`resource_categories`**: Many-to-many join table between resources and categories.
6. **`user_favorites`**: Many-to-many relationship linking `auth.users` to saved resources.
7. **`user_recently_viewed`**: User visit history and timestamp tracking.
8. **`audit_logs`**: Administrative change logs with before/after state diffs.

### Row Level Security (RLS) Strategy
- Public read access is granted only to active platforms, enabled tracking configs, active categories, and published resources.
- Personal user data (`user_favorites`, `user_recently_viewed`) is strictly restricted to matching `auth.uid()`.
- Administrative mutations require `role = 'admin'` or execution via the isolated Server-Side Service Role client.

---

## 4. Platform Abstraction Layer

The platform architecture is fully decoupled from Microsoft:
- The `Platform` interface (`types/platform.ts`) defines generic metadata (`id`, `name`, `slug`, `website_url`, `domain`, `is_active`, `display_order`).
- `Resource` references `platform_id` rather than embedding vendor-specific logic.
- Adding a future platform requires zero database schema modifications or component rewrites—only an administrative insert into `platforms`.

---

## 5. URL Attribution & Tracking Engine

Student ambassadors and community contributors need attribution on official ecosystem links.

### Separation of Concerns:
- **Storage**: `tracking_configs` stores the parameter and value.
- **Decoration**: `buildTrackedUrl(officialUrl, trackingConfig)` in `lib/tracking/url-builder.ts` safely parses the destination URL and injects the attribution parameter without breaking existing query strings or anchor tags.
- **Domain Validation**: `validatePlatformDomain(url, platformDomain)` prevents phishing or unauthorized open redirects.
- **Interaction**: The `useTracking` hook decorates links in client components and automatically triggers a `resource_opened` analytics event.

---

## 6. PostgreSQL Full-Text Search Architecture

Instead of incurring external search engine operational costs, KofyOne leverages PostgreSQL native Full-Text Search:

1. **`search_vector` Column**: A stored `TSVECTOR` generated on the `resources` table with weighted terms:
   - Weight `A`: Resource Name
   - Weight `B`: Resource Description
2. **Indexing**: GIN index (`idx_resources_search_vector`) enables sub-millisecond keyword lookup.
3. **Search Procedure**: Stored procedure `search_resources(...)` performs ranked search using `plainto_tsquery` or `websearch_to_tsquery` combined with platform and category filters.
4. **Service Abstraction**: `PostgresSearchService` in `lib/search/search-service.ts` implements `ISearchService`, allowing plug-and-play evolution in future phases.

---

## 7. Analytics & Telemetry Architecture

Telemetry is powered by **PostHog**:
- Client-side event dispatching uses `trackEvent(eventName, payload)` with strict TypeScript validation against `AnalyticsEventPayloadMap`.
- Supported events:
  - `user_signed_in`
  - `resource_viewed`
  - `resource_opened`
  - `resource_favorited`
  - `platform_selected`
  - `category_selected`
  - `search_performed`
  - `event_viewed`
  - `notification_opened`
- Privacy: IP autocapture is disabled by default; analytics operates in dry-run mode when no API key is configured.

---

## 8. Media & Storage Architecture (Cloudflare R2)

Object storage uses Cloudflare R2:
- Binary assets (logos, screenshots, banners) are stored in R2 buckets.
- PostgreSQL stores only CDN keys and public URLs.
- The `CloudflareR2StorageClient` (`lib/storage/r2-client.ts`) generates public URLs and provides pre-signed upload URL capabilities for Phase 3 asset management.

---

## 9. Security & Access Control

- **Client vs. Server Separation**:
  - `lib/supabase/client.ts` uses the Anon key and runs in the browser.
  - `lib/supabase/admin.ts` uses the Service Role key and throws an immediate error if executed in client-side code.
- **Environment Isolation**: `.env.example` documents all parameters; real secrets must never be committed.
- **Route Guarding**: Route groups `(admin)` are architected for middleware session validation in Phase 2.
