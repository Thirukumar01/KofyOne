'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SiteBranding } from '@/types/branding';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BrandingLogoProps {
  branding?: Partial<SiteBranding> | null;
  variant?: 'primary' | 'compact' | 'square' | 'favicon';
  className?: string;
  showText?: boolean;
}

export function BrandingLogo({
  branding,
  variant = 'primary',
  className,
  showText = true,
}: BrandingLogoProps) {
  const [imgError, setImgError] = useState(false);

  const appName = branding?.app_name || 'KofyOne';
  const logoAlt = branding?.logo_alt || `${appName} Logo`;

  // Select appropriate logo URL based on requested variant
  let logoUrl = branding?.primary_logo_url;
  if (variant === 'compact') {
    logoUrl = branding?.compact_logo_url || branding?.square_icon_url || branding?.primary_logo_url;
  } else if (variant === 'square') {
    logoUrl = branding?.square_icon_url || branding?.compact_logo_url || branding?.primary_logo_url;
  } else if (variant === 'favicon') {
    logoUrl = branding?.favicon_url || branding?.square_icon_url || branding?.primary_logo_url;
  }

  const hasCustomLogo = Boolean(logoUrl) && !imgError;

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      {hasCustomLogo && logoUrl ? (
        <div
          className={cn(
            'relative overflow-hidden flex items-center justify-center transition-transform',
            variant === 'compact' || variant === 'square'
              ? 'h-8 w-8 rounded-lg'
              : variant === 'favicon'
              ? 'h-5 w-5 rounded-md'
              : 'h-8 w-auto min-w-[32px]'
          )}
        >
          <Image
            src={logoUrl}
            alt={logoAlt}
            width={120}
            height={32}
            unoptimized
            onError={() => setImgError(true)}
            className={cn(
              'object-contain max-h-full max-w-full',
              variant === 'square' || variant === 'compact' ? 'rounded-lg' : ''
            )}
            style={{ width: 'auto', height: '100%' }}
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-sm transition-transform hover:scale-105',
            variant === 'compact' || variant === 'square'
              ? 'h-8 w-8'
              : variant === 'favicon'
              ? 'h-5 w-5'
              : 'h-8 w-8'
          )}
        >
          <Sparkles className={cn(variant === 'favicon' ? 'h-3 w-3' : 'h-4 w-4')} />
        </div>
      )}

      {showText && variant !== 'compact' && variant !== 'square' && variant !== 'favicon' && (
        <span className="font-brand text-2xl sm:text-3xl font-normal tracking-wide text-zinc-900 dark:text-zinc-50 leading-none">
          {appName}
        </span>
      )}
    </div>
  );
}
