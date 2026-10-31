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
    <div className="relative flex flex-col gap-3 rounded-2xl border border-[#F0DCDD] bg-[#FCECEB]/80 p-4 shadow-xs dark:border-[#2E2C30] dark:bg-[#1E1E22] sm:flex-row sm:items-center sm:justify-between transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#B94A50] text-white dark:text-[#F6F5F3] shadow-xs">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B94A50] dark:text-[#D98C91]">
              Personalized Discovery
            </span>
            <span className="rounded-full bg-[rgba(185,74,80,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[#B94A50] dark:bg-[rgba(217,140,145,0.15)] dark:text-[#D98C91]">
              {preferredPlatform} Focus
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#292526] dark:text-[#F6F5F3]">
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
              className="h-8 text-xs font-medium border-[#F0DCDD] hover:bg-[#FCECEB] dark:border-[#2E2C30] dark:hover:bg-[#252429]"
            >
              View All Platforms
            </Button>
          </Link>
        ) : (
          <Link href={`/resources?provider=${targetSlug}`}>
            <Button
              size="sm"
              className="h-8 text-xs font-semibold bg-[#B94A50] hover:bg-[#A13D43] dark:hover:bg-[#C85A60] active:bg-[#8D3338] text-white dark:text-[#F6F5F3] flex items-center gap-1.5"
            >
              <Filter className="h-3 w-3" />
              Filter to {preferredPlatform} {matchedCount ? `(${matchedCount})` : ''}
            </Button>
          </Link>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-1 text-[#777171] hover:bg-[#FCECEB] hover:text-[#292526] dark:text-[#A8A2A2] dark:hover:bg-[#252429] dark:hover:text-[#F6F5F3] transition-colors"
          title="Dismiss recommendation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
