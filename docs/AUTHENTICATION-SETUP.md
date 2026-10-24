# KofyOne — Authentication & Authorization Setup Guide

This document describes the complete configuration for KofyOne's production-grade authentication and role-based access control (RBAC) system built on Next.js 16 App Router and Supabase SSR.

---

## Architecture Overview

1. **Authentication Layer**:
   - Email & Password with real-time strength validation.
   - Magic Link / Email OTP (PKCE code exchange).
   - Google OAuth (`provider: 'google'`).
   - Microsoft Entra ID OAuth (`provider: 'azure'`).
   - Browser sessions are stored strictly in secure HTTP-only cookies via `@supabase/ssr`. No tokens or passwords are saved to `localStorage` or `sessionStorage`.

2. **Authorization & RBAC**:
   - Private `public.user_roles` table stores user roles (`student`, `educator`, `admin`, `guest`) linked to `auth.users(id) ON DELETE CASCADE`.
   - Direct access to `user_roles` is revoked from `anon` and `authenticated` clients.
   - Database function `public.is_admin()` uses `SECURITY DEFINER` with fixed `search_path = ''` to inspect roles.
   - Initial administrators are assigned exclusively via direct SQL operation after verifying the user's UUID.
   - Route guarding is enforced in `proxy.ts` (Next.js 16 request interceptor) and independently in Server Components (`app/(admin)/admin/layout.tsx`).

---

## 1. Supabase Dashboard Configuration

### A. URL Configuration
Navigate to **Authentication → URL Configuration** in your Supabase Dashboard:

- **Site URL**:
  - Development: `http://localhost:3000`
  - Production: `https://your-domain.com`
- **Redirect URLs (Allowlist)**:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback*`
  - `https://your-domain.com/auth/callback`
  - `https://your-domain.com/auth/callback*`

### B. Email Provider
Navigate to **Authentication → Providers → Email**:
- Enable the **Email** provider.
- Optional: Toggle "Confirm email" based on whether you require immediate email verification or instant sign-in.
- Configure custom SMTP if higher email throughput is required.

---

## 2. Google OAuth Configuration

### Step 1: Google Cloud Console
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select your project.
3. Navigate to **APIs & Services → OAuth consent screen**:
   - Choose **External** user type.
   - Enter your App name (`KofyOne`), user support email, and developer contact email.
   - Add scopes: `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
4. Navigate to **APIs & Services → Credentials**:
   - Click **Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: `KofyOne Supabase Client`.
   - **Authorized redirect URIs**:
     ```
     https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
     ```
   - Click **Create** and copy your **Client ID** and **Client Secret**.

### Step 2: Supabase Dashboard
1. Go to **Authentication → Providers → Google**.
2. Toggle **Enable Google provider**.
3. Paste the **Client ID** and **Client Secret** obtained from Google Cloud.
4. Save changes.

---

## 3. Microsoft Entra ID (Azure) OAuth Configuration

KofyOne focuses on the official Microsoft ecosystem. Supabase integrates with Microsoft Entra ID using the provider key `azure`.

### Step 1: Microsoft Entra Admin Center / Azure Portal
1. Visit the [Microsoft Entra admin center](https://entra.microsoft.com/) or Azure Portal.
2. Navigate to **Identity → Applications → App registrations**.
3. Click **New registration**:
   - **Name**: `KofyOne`.
   - **Supported account types**: Select *Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)* to allow both students and organization accounts.
   - **Redirect URI**:
     - Platform: **Web**.
     - URI: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
4. Click **Register**.
5. Copy the **Application (client) ID** and **Directory (tenant) ID** (use `common` for multi-tenant & personal Microsoft accounts).
6. Under **Certificates & secrets → Client secrets**:
   - Click **New client secret**.
   - Copy the secret **Value** immediately.

### Step 2: Supabase Dashboard
1. Go to **Authentication → Providers → Azure**.
2. Toggle **Enable Azure provider**.
3. Paste your **Client ID** (Application ID) and **Secret** (Secret Value).
4. Set **Azure Tenant URL**:
   - For multi-tenant and personal Microsoft accounts, set to: `common`
   - Or your specific tenant ID if organization-exclusive.
5. Save changes.

---

## 4. Applying Database Migrations

Run the new migration in your Supabase project:
```bash
# Using Supabase CLI (if linked):
npx supabase db push

# Or execute the SQL file directly in the Supabase SQL Editor:
# supabase/migrations/20261011000000_auth_roles_hardening.sql
```

The migration automatically creates:
- `public.user_roles` table with RLS enabled.
- `public.is_admin()` and `public.get_current_user_role()` functions.
- `on_auth_user_created_profiles` trigger to auto-provision user profiles and default student roles.
- Least-privilege RLS policies on `public.profiles`.

---

## 5. Safely Assigning the First Administrator

Per security requirements, administrative privileges cannot be granted through signup forms, client headers, or unverified emails. The first administrator must be assigned directly via database execution:

1. Have the administrator sign up or log in once to create their record in `auth.users`.
2. Locate their exact user UUID in the Supabase Dashboard under **Authentication → Users** (or via SQL):
   ```sql
   SELECT id, email, created_at FROM auth.users WHERE email = 'your-admin-email@example.com';
   ```
3. Execute the following SQL in the Supabase SQL Editor:
   ```sql
   -- Assign administrator role by exact user UUID
   INSERT INTO public.user_roles (id, role)
   VALUES ('<USER_UUID_HERE>', 'admin')
   ON CONFLICT (id) DO UPDATE SET role = 'admin';

   -- Optionally synchronize the legacy profiles.role column
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = '<USER_UUID_HERE>';
   ```
4. Once assigned, this user can immediately access `/admin` and privileged operations.

---

## 6. Account Deletion Workflow

Account deletion is available under `/settings/security`:
1. The user must type `DELETE` to confirm.
2. For password accounts, current password reauthentication is strictly enforced.
3. The server route `POST /api/account/delete`:
   - Validates identity via `supabase.auth.getUser()`.
   - Cleans up user-owned records (`user_recently_viewed`, `user_roles`, `profiles`).
   - Deletes the `auth.users` record using the Supabase Service Role client (`SUPABASE_SERVICE_ROLE_KEY`).
   - Terminates all session cookies and redirects to `/account-deleted`.

---

## 7. Local Development & Deployment

### Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables in .env.local
cp .env.example .env.local

# 3. Start development server
npm run dev
```

### Production Deployment
When deploying to Cloudflare Pages, Vercel, or custom servers:
1. Set `NEXT_PUBLIC_SITE_URL` to your production URL.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Set `SUPABASE_SERVICE_ROLE_KEY` as a server-only environment variable.
4. Verify that callback URLs in Google, Azure, and Supabase allowlists match your production domain.
