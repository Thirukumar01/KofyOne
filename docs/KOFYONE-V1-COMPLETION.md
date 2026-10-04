# KofyOne V1 completion

## Status

**PARTIAL** — the repository now contains the production catalog, discovery routes, authentication entry point, profile-backed admin guard, RLS hardening, and deployment documentation. Authenticated browser E2E and linked Supabase verification require project credentials and are **BLOCKED** in this environment.

## Architecture

KofyOne is a Next.js App Router application using server-rendered Supabase queries, Supabase Auth with cookie sessions, PostgreSQL full-text search, and a small shared Tailwind UI layer. Microsoft is the only active platform and the five canonical categories are Student, AI, Cloud, Developer, and Productivity.

## Completed

- Public home, resources search/filter/pagination, resource detail metadata, categories, platforms, favorites, and recently viewed routes.
- Magic-link sign-in through Supabase Auth and a Next.js 16 `proxy.ts` session refresh boundary.
- Profile-backed role lookup and server-side admin route protection.
- Centralized outbound URL tracking; destinations remain official URLs and tracking configuration is database-backed.
- V1 schema hardening migration with profiles, admin helper, catalog indexes, canonical categories, ten official destinations, and ownership RLS.
- Explicit configuration errors instead of placeholder Supabase services.

## Database and security

The initial schema remains additive and is extended by `20261004000000_v1_hardening.sql`. Public reads are limited to active/published catalog rows; favorites and history are user-owned; catalog writes require `public.is_admin()`. Service-role access remains server-only. No credentials are committed.

## Validation

Run `npm run type-check`, `npm run lint`, and `npm run build`. Run `npx supabase db push --dry-run` and `npx supabase db advisors` from an authenticated Supabase project. Authenticated RLS, admin mutations, tracking events, and browser flows are **NOT TESTED** without legitimate credentials.

## Deployment

Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only if administrative server actions are added. Apply migrations before deploying and configure Supabase Auth redirect URLs for `/auth/callback`.
