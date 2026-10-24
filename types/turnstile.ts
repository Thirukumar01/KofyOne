/**
 * KofyOne - Cloudflare Turnstile Type Definitions
 */

export interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  cData?: string;
  callback?: (token: string) => void;
  'error-callback'?: (errorCode?: string) => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  tabindex?: number;
  'response-field'?: boolean;
  'response-field-name'?: string;
  size?: 'normal' | 'flexible' | 'compact';
  retry?: 'auto' | 'never';
  'retry-interval'?: number;
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  appearance?: 'always' | 'execute' | 'interaction-only';
}

export interface TurnstileObject {
  render: (
    container: string | HTMLElement,
    options: TurnstileRenderOptions
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
  isExpired: (widgetId?: string) => boolean;
}

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  challengeTs?: string;
  hostname?: string;
  action?: string;
}

declare global {
  interface Window {
    turnstile?: TurnstileObject;
    onTurnstileLoaded?: () => void;
  }
}
