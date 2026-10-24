# Cloudflare Turnstile Human Verification Setup Guide

This guide details how to configure Cloudflare Turnstile with **Managed Mode** for KofyOne to protect user authentication, registration, and administrative access from automated bots, credential stuffing, and replay attacks.

---

## 1. Cloudflare Dashboard Setup

1. **Log in to Cloudflare:**
   - Navigate to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and sign in with your Cloudflare account.
2. **Access Turnstile:**
   - In the left-hand navigation sidebar, click on **Turnstile** (under Account Home or Security).
3. **Add a New Widget:**
   - Click the **Add widget** button.
4. **Configure Widget Details:**
   - **Widget name:** Enter a descriptive name, e.g., `KofyOne Web Auth`.
   - **Domains / Hostnames:**
     - Add `localhost` (for local development and staging verification).
     - Add `127.0.0.1` (optional, for loopback testing).
     - Add your actual production domain when ready (e.g., `kofyone.com` or `kofyone.vercel.app`).
   - **Widget Mode:** Select **Managed** mode.
     - *Managed Mode* lets Cloudflare run non-interactive browser telemetry checks automatically, presenting an interactive checkbox challenge only when suspicious signals or bot patterns are observed.
   - **Pre-Clearance:** Set to *Disabled* (recommended for standard single-page app auth flows).
5. **Create & Obtain Keys:**
   - Click **Create**.
   - Cloudflare will generate two distinct keys:
     - **Site Key (Public):** e.g., `0x4AAAAAA...` (safe to expose in client-side code).
     - **Secret Key (Private):** e.g., `0x4AAAAAA...` (**CONFIDENTIAL: NEVER share, log, or commit to Git**).

---

## 2. Local Environment Configuration

1. **Open your local environment file:**
   Open `.env.local` in your project root (note: `.env.local` is ignored by Git and never committed):

2. **Add or update the Turnstile keys:**
   ```env
   # Cloudflare Turnstile Human Verification (Managed Mode)
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_actual_cloudflare_site_key
   TURNSTILE_SECRET_KEY=your_actual_cloudflare_secret_key
   ```

3. **Restart the development server:**
   Environment variables are loaded on Next.js startup. Restart your local server:
   ```powershell
   npm run dev
   ```

---

## 3. Official Dummy Test Keys (For Local Development & Automated CI)

Cloudflare provides official dummy testing keys that work immediately on `localhost` without requiring an active Cloudflare account:

| Scenario | Client Site Key (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) | Server Secret Key (`TURNSTILE_SECRET_KEY`) | Expected Outcome |
|---|---|---|---|
| **Always Passes** (Default) | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` | Automatically passes and verifies successfully. |
| **Always Blocks / Fails** | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` | Rejects the challenge to test retry & error UX. |
| **Forces Challenge** | `3x00000000000000000000FF` | `1x0000000000000000000000000000000AA` | Requires user interaction (clicking the box). |

---

## 4. Production Deployment Configuration (Vercel / Cloudflare)

When deploying KofyOne to your production host (e.g., Vercel):

1. **Go to Project Settings:**
   - In your Vercel Dashboard, select your KofyOne project → **Settings** → **Environment Variables**.
2. **Add Environment Variables:**
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Paste your production Cloudflare site key (Select: Production, Preview).
   - `TURNSTILE_SECRET_KEY`: Paste your production Cloudflare secret key (Select: Production, Preview).
3. **Redeploy:**
   - Trigger a new deployment so Next.js embeds the client site key into the production build and supplies the server secret to edge/serverless functions.

---

## 5. Defense-in-Depth Architecture

- **Server-Side Enforcement:** Calling `POST /api/auth/login` or `POST /api/auth/signup` directly via curl or automated tools without a valid token immediately returns `403 Forbidden` before running any database or Supabase Auth queries.
- **Single-Use Tokens:** Cloudflare tokens cannot be replayed or shared between sessions. On expired or duplicate use, Cloudflare Siteverify returns `timeout-or-duplicate`.
- **Zero Logging:** Secret keys and challenge tokens are strictly excluded from console logs, server traces, and client responses.
- **Fail-Closed in Production:** In production mode (`NODE_ENV=production`), if `TURNSTILE_SECRET_KEY` is missing, endpoints fail closed with a 500 error rather than silently bypassing verification.
