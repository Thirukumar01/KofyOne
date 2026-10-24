/**
 * KofyOne - Cloudflare Turnstile Server-Side Verification Helper
 *
 * Enforces server-side validation against Cloudflare's Siteverify endpoint:
 * https://challenges.cloudflare.com/turnstile/v0/siteverify
 *
 * Security Principles:
 * 1. Zero logging of secret keys, client response tokens, or internal credentials.
 * 2. Fail-closed policy in production if TURNSTILE_SECRET_KEY is absent.
 * 3. Graceful, actionable configuration guidance in development environments.
 * 4. Token replay and expiration detection via Cloudflare's duplicate check.
 */

import type { TurnstileVerificationResult } from '@/types/turnstile';

const CLOUDFLARE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Validates a Turnstile response token with Cloudflare's Siteverify API.
 *
 * @param token - The response token submitted by the client widget.
 * @param remoteIp - Optional client IP address (from cf-connecting-ip or x-forwarded-for).
 * @param action - Optional expected action name (e.g., 'login', 'signup').
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
  action?: string
): Promise<TurnstileVerificationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Verify Server Secret Configuration
  if (!secretKey) {
    if (isProduction) {
      console.error('[Turnstile Security Alert] Missing TURNSTILE_SECRET_KEY in production.');
      return {
        success: false,
        error: 'Security verification service is misconfigured on the server. Please contact support.',
        errorCode: 'missing-server-secret',
      };
    }

    return {
      success: false,
      error:
        'Cloudflare Turnstile is unconfigured on this development server. Please add NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to .env.local (refer to .env.example for official test keys).',
      errorCode: 'unconfigured-dev-secret',
    };
  }

  // 2. Reject Missing or Empty Tokens
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return {
      success: false,
      error: 'Human verification is required. Please complete the verification challenge.',
      errorCode: 'missing-input-response',
    };
  }

  const cleanToken = token.trim();

  // 3. Reject Malformed / Excessively Large Tokens
  if (cleanToken.length > 2048) {
    return {
      success: false,
      error: 'Verification token format is invalid.',
      errorCode: 'invalid-input-response',
    };
  }

  // 4. Submit Verification to Cloudflare
  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', cleanToken);

    if (remoteIp && typeof remoteIp === 'string') {
      formData.append('remoteip', remoteIp.trim());
    }

    const res = await fetch(CLOUDFLARE_SITEVERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!res.ok) {
      console.warn(`[Turnstile] Cloudflare Siteverify returned HTTP ${res.status}`);
      return {
        success: false,
        error: 'The verification service is temporarily unavailable. Please retry shortly.',
        errorCode: 'service-unavailable',
      };
    }

    const payload = (await res.json()) as {
      success: boolean;
      'error-codes'?: string[];
      challenge_ts?: string;
      hostname?: string;
      action?: string;
    };

    if (payload.success === true) {
      // Optional action matching check
      if (action && payload.action && payload.action !== action) {
        return {
          success: false,
          error: 'Verification token action mismatch. Please refresh and try again.',
          errorCode: 'action-mismatch',
        };
      }

      return {
        success: true,
        challengeTs: payload.challenge_ts,
        hostname: payload.hostname,
        action: payload.action,
      };
    }

    // 5. Map Cloudflare Error Codes to User-Friendly, Actionable Messages
    const codes = Array.isArray(payload['error-codes']) ? payload['error-codes'] : [];
    const primaryCode = codes[0] || 'verification-failed';

    let userMessage = 'Human verification failed. Please try again.';

    if (codes.includes('timeout-or-duplicate')) {
      userMessage = 'The verification challenge has expired or was already used. Please complete a new verification.';
    } else if (codes.includes('invalid-input-response')) {
      userMessage = 'Verification response was invalid or rejected. Please retry the challenge.';
    } else if (codes.includes('missing-input-response')) {
      userMessage = 'Verification token was not received. Please complete the challenge.';
    } else if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) {
      userMessage = 'Turnstile server secret configuration is invalid. Please contact the administrator.';
    }

    return {
      success: false,
      error: userMessage,
      errorCode: primaryCode,
    };
  } catch (error) {
    // Zero logging of credentials; log high-level diagnostic only
    const msg = error instanceof Error ? error.message : 'Unknown network failure';
    console.error(`[Turnstile] Verification connection error: ${msg}`);
    return {
      success: false,
      error: 'Unable to connect to the verification service. Please check your network connection and retry.',
      errorCode: 'network-failure',
    };
  }
}
