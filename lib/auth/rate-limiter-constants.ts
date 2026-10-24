/**
 * KofyOne - Rate Limiter Policy Constants
 */

export const MAX_FAILED_ATTEMPTS = 2;
export const LOCKOUT_WINDOW_MS = 60 * 60 * 1000; // 1 hour (3600000ms)

export const LOCKOUT_ERROR_MESSAGE =
  'Maximum verification attempts reached. Please try again after 1 hour.';
