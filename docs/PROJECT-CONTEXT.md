# KofyOne — Project Context & Source of Truth

## 1. Project Identity
- **Product Name**: KofyOne
- **Tagline**: Learn Today. Build Tomorrow.
- **Mission**: A student-focused resource discovery platform to discover, search, explore, save, and revisit official technology ecosystem resources.

---

## 2. Product Scope & Strategy
- **Ecosystem Scope**: Multi-Provider Platform supporting **Microsoft**, **AWS**, **Google Cloud**, and **Other** (OpenAI, GitHub, modern student tech tools).
- **Canonical Categories**: Five foundational discovery categories: **Student**, **AI**, **Cloud**, **Developer**, and **Productivity**.
- **Platform Architecture**:
  - The architecture is strictly platform-independent.
  - Core database entities (`platforms`, `resources`, `categories`, `tracking_configs`) use generic identifiers and relations.
  - Dynamic Branding CMS (`site_branding`) and Legal/Site Pages CMS (`site_pages`) empower administrative management without code deployments.

---

## 3. Locked Technology Stack
- **Frontend Framework**: Next.js 16 (App Router with Turbopack), React 19, TypeScript 5
- **Styling**: Tailwind CSS v4 with `@tailwindcss/postcss`
- **UI Architecture**: Modular, accessible, responsive component system with Lucide icons
- **Authentication**: Streamlined Username + Password/PIN auth mapped internally to `${username}@myapp.local` for Supabase SSR cookies, salted `bcryptjs` security questions for self-service password recovery, and Cloudflare Turnstile anti-bot verification
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security & custom RPCs)
- **Search Engine**: PostgreSQL Full-Text Search (`tsvector`, `tsquery`, GIN indexes)
- **Object & Media Storage**: Supabase Storage (`kofyone-media` bucket) with optional Cloudflare R2 CDN
- **Hosting**: Vercel / Cloudflare Workers (`vinext`)
- **Version Control**: Git & GitHub

> **Rule**: Do not replace or modify this stack unless an unresolvable technical blocker is formally identified and documented.

---

## 4. Architecture Principles
1. **Separation of Concerns**: Strict boundary between UI, application logic, authentication, database access, search, analytics, storage, URL tracking, platform configuration, and admin utilities.
2. **Platform Abstraction**: All resources link to generic platform references. Multi-provider platform taxonomy loaded dynamically.
3. **Admin-Controlled Dynamic Content**: Platforms, categories, resource lists, site branding, legal pages, and tracking attribution are database-backed and manageable through the Admin Portal.
4. **No Premature Complexity**: Native PostgreSQL full-text search and storage over third-party microservices.
5. **Production Orientation**: Strict TypeScript typings, zero `any` shortcuts, robust error boundaries, accessible UI.

---

## 5. Microsoft Contributor Tracking Architecture
- **Concept**: Contributor & referral attribution allows tracking visits driven by student ambassadors and community leaders.
- **Current Attribution Parameter**: `wt.mc_id`
- **Current Attribution Value**: `studentamb_504640`
- **Architectural Requirement**:
  - **NEVER** hard-code this parameter or value into application logic, page components, or hardcoded strings.
  - Attribution configs reside in the `tracking_configs` database table and are loaded dynamically.
  - Outbound clicks route through `/go/[slug]`, which dynamically appends attribution via `lib/tracking/url-builder.ts` and records telemetry via `increment_resource_click` RPC.

---

## 6. Security Principles
- **Zero Exposed Secrets**: No API keys, service role tokens, or private credentials committed to source code.
- **Row Level Security (RLS)**: Enforced across all Supabase PostgreSQL tables; direct client access revoked on sensitive security tables (`user_security_questions`, `security_verification_attempts`, `password_reset_tokens`).
- **Client/Server Isolation**:
  - Supabase Service Role client (`lib/supabase/admin.ts` and `config/env.ts`) throws runtime errors if loaded in browser contexts.
  - Public browser operations use restricted Anon keys strictly guarded by RLS.
- **URL & Input Sanitization**: All external URLs validated against official platform domains prior to rendering or redirection.
- **Audit Logging**: Sensitive administrative actions recorded in `audit_logs`.

---

## 7. Current Development Status
- **Current Status**: MVP Ready for Testing / Private Beta Candidate
- **Accomplishments Completed**:
  - Multi-provider discovery directory (Microsoft, AWS, Google Cloud, Other) with 5 canonical categories.
  - Streamlined Username + Password/PIN authentication with persistent session cookies.
  - Salted bcrypt security questions with 2-failure 1-hour lockout protection.
  - Cloudflare Turnstile human verification integration.
  - Outbound contributor tracking engine with database-driven click logging.
  - Admin Portal with Resource, Platform, Category, Branding, and Legal CMS editors.
  - Clean Next.js 16 Turbopack build compiling 50 routes.

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
