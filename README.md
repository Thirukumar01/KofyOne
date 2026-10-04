# KofyOne

KofyOne is an independent discovery platform for official Microsoft learning, cloud, AI, developer, and productivity resources. It helps people discover, search, open, save, and revisit resources without claiming Microsoft ownership or affiliation.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase Auth/Postgres/RLS, and optional PostHog analytics.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required environment variables:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

`SUPABASE_SERVICE_ROLE_KEY` is optional and server-only. Never expose it as a `NEXT_PUBLIC_*` variable or commit it.

## Supabase

Apply migrations with the Supabase CLI:

```bash
npx supabase db push
npx supabase db advisors
```

The migrations create catalog tables, user-owned favorites/history, profiles, role-based admin policies, search, indexes, and the deterministic Microsoft seed catalog. Configure Auth email redirect URLs to include `/auth/callback`.

## Commands

```bash
npm run dev
npm run type-check
npm run lint
npm run build
npm run start
```

## Security and admin

Public catalog data is limited by RLS to active/published records. Favorites and recently viewed data are scoped to `auth.uid()`. Admin authorization is checked server-side against the `profiles` table; the client cannot promote itself. Supabase service-role credentials, if used for future admin mutations, must remain in server-only code.
