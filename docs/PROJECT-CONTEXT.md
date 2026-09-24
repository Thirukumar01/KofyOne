# KofyOne — Project Context & Source of Truth

## 1. Project Identity
- **Product Name**: KofyOne
- **Tagline**: Learn Today. Build Tomorrow.
- **Mission**: A student-focused resource discovery platform to discover, search, explore, save, and revisit official technology ecosystem resources.

---

## 2. Product Scope & Strategy
- **Initial Ecosystem Scope**: Microsoft Ecosystem Only.
- **Future Platform Strategy**:
  - The architecture is strictly platform-independent.
  - Core database entities (`Platform`, `Resource`, `Category`, `TrackingConfig`) use generic identifiers and relations.
  - Future platforms (e.g., Google, AWS, GitHub) will be onboarded via the Admin Portal and database migrations when planned.
  - **Constraint**: Do NOT create, hard-code, or mock future platforms now. Microsoft is the sole active platform in initial phases.

---

## 3. Locked Technology Stack
- **Frontend Framework**: Next.js (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **UI Architecture**: Modular, accessible, reusable component architecture
- **Authentication**: Supabase Auth (SSO, OAuth, Magic Links)
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security)
- **Search Engine**: PostgreSQL Full-Text Search (`tsvector`, `tsquery`, GIN indexes)
- **Analytics & Telemetry**: PostHog (typed events, privacy-respecting client/server dispatching)
- **Object & Media Storage**: Cloudflare R2 (metadata in PostgreSQL, assets served via global CDN)
- **Hosting**: Cloudflare Pages / Cloudflare edge runtime
- **Version Control**: Git & GitHub
- **AI Development Assistants**: Antigravity, GitHub Copilot

> **Rule**: Do not replace or modify this stack unless an unresolvable technical blocker is formally identified and documented.

---

## 4. Architecture Principles
1. **Separation of Concerns**: Strict boundary between UI, application logic, authentication, database access, search, analytics, storage, URL tracking, platform configuration, and admin utilities.
2. **Platform Abstraction**: All resources link to generic platform references. No Microsoft-specific hard-coding in core schemas or component logic.
3. **Admin-Controlled Dynamic Content**: Platforms, categories, resource lists, and tracking attribution must be database-backed and manageable through the future Admin Portal.
4. **No Premature Complexity**: No unneeded third-party integrations (e.g. no Algolia/Elasticsearch or microservices during early phases).
5. **Production Orientation**: Strict TypeScript typings, zero `any` shortcuts, robust error boundaries, accessible UI.

---

## 5. Microsoft Contributor Tracking Architecture
- **Concept**: Contributor & referral attribution allows tracking visits driven by student ambassadors and community leaders.
- **Current Attribution Parameter**: `wt.mc_id`
- **Current Attribution Value**: `studentamb_504640`
- **Architectural Requirement**:
  - **NEVER** hard-code this parameter or value into application logic, page components, or hardcoded strings.
  - Attribution configs reside in the `tracking_configs` database table and are loaded dynamically.
  - A generic URL builder (`lib/tracking/url-builder.ts` and `lib/url.ts`) and React hook (`hooks/use-tracking.ts`) apply the attribution parameter dynamically at runtime.

---

## 6. Security Principles
- **Zero Exposed Secrets**: No API keys, service role tokens, or private credentials committed to source code.
- **Row Level Security (RLS)**: Enforced on all Supabase PostgreSQL tables.
- **Client/Server Isolation**:
  - Supabase Service Role client (`lib/supabase/admin.ts` and `config/env.ts`) throws runtime errors if loaded in browser contexts.
  - Public browser operations use restricted Anon keys strictly guarded by RLS.
- **URL & Input Sanitization**: All external URLs validated against official platform domains prior to rendering or redirection.
- **Audit Logging**: Sensitive administrative actions recorded in `audit_logs`.

---

## 7. Current Development Phase
- **Current Phase**: Phase 1: Foundation Setup (COMPLETE)
- **Next Phase**: Phase 2: Database Setup, Supabase Integration & Core Schema Verification

### Development Roadmap:
- **Phase 0**: Project Foundation & Architecture (COMPLETE)
- **Phase 1**: Foundation Setup (COMPLETE)
- **Phase 2**: Database Setup, Supabase Integration & Core Schema Verification (UPCOMING)
- **Phase 3**: Authentication & User Profile Layer
- **Phase 4**: Resource Discovery Engine & Search System
- **Phase 5**: User Engagement (Favorites, Recently Viewed, History)
- **Phase 6**: Admin Portal (Platform, Resource, and Tracking Management)
- **Phase 7**: Telemetry, Asset Storage & Production Hardening

---

## 8. AI DEVELOPMENT CONTINUITY
*(Mandatory Instructions for Antigravity, GitHub Copilot, and Future AI Assistants)*

Before modifying or changing the project, future AI assistants must:

1. **Read PROJECT-CONTEXT.md first** before starting any work.
2. **Read ARCHITECTURE.md before modifying architecture** or adding new modules.
3. **Read the latest phase report** in `docs/phases/` to understand recent accomplishments.
4. **Inspect the current filesystem** and codebase before making changes to avoid duplicating or conflicting with existing code.
5. **Preserve existing functionality** unless a change is explicitly required by user requirements.
6. **Never recreate the project from scratch** unless explicitly instructed by the user.
7. **Never delete working code** to replace it with an assumed or speculative implementation.
8. **Never use an Antigravity scratch project** as the project source of truth. The repository in `C:\Users\thiru\kofyone` is the sole source of truth.
9. **Update documentation after completing work** (including PROJECT-CONTEXT.md and new phase reports).
10. **Do not assume missing conversation history means missing project state**; the filesystem and git commits are the absolute source of truth.

---

## 9. Branding Guidelines
- **Brand Name**: KofyOne
- **Tagline**: Learn Today. Build Tomorrow.
- **Status**: The visual identity and logo treatment are currently flexible and pending final creative sign-off.
  - Do NOT create, replace, recolor, or finalize logos without explicit instruction.
  - Keep styling modern, neutral, accessible, and theme-adaptive.
