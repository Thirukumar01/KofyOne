'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EcosystemBannerProps {
  preferredPlatform: string;
  currentProvider?: string;
  matchedCount?: number;
}

export function EcosystemBanner({
  preferredPlatform,
  currentProvider,
  matchedCount,
}: EcosystemBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !preferredPlatform) return null;

  // Normalize slug
  const normalized = preferredPlatform.toLowerCase();
  let targetSlug = 'microsoft';
  if (normalized.includes('aws')) targetSlug = 'aws';
  else if (normalized.includes('google')) targetSlug = 'google-cloud';
  else if (normalized.includes('other')) targetSlug = 'other';

  const isAlreadyFiltered =
    currentProvider === targetSlug ||
    (targetSlug === 'google-cloud' && currentProvider === 'google');

  const handleDismiss = () => {
    setDismissed(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`kofyone_dismiss_rec_${preferredPlatform}`, 'true');
      }
    } catch {
      // Ignore in restricted environments
    }
  };

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-orange-50/70 p-4 shadow-xs dark:border-orange-950/60 dark:from-orange-950/20 dark:via-zinc-900 dark:to-orange-950/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
              Personalized Discovery
            </span>
            <span className="rounded-full bg-orange-100 px-2 py-0.2 text-[10px] font-semibold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
              {preferredPlatform} Focus
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">
            {isAlreadyFiltered
              ? `Currently highlighting resources verified for your saved ${preferredPlatform} ecosystem focus.`
              : `Based on your profile settings, explore verified student credits, sandboxes, and certifications for ${preferredPlatform}.`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {isAlreadyFiltered ? (
          <Link href="/resources">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium border-orange-300 hover:bg-orange-100 dark:border-orange-900"
            >
              View All Platforms
            </Button>
          </Link>
        ) : (
          <Link href={`/resources?provider=${targetSlug}`}>
            <Button
              size="sm"
              className="h-8 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1.5"
            >
              <Filter className="h-3 w-3" />
              Filter to {preferredPlatform} {matchedCount ? `(${matchedCount})` : ''}
            </Button>
          </Link>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          title="Dismiss recommendation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
