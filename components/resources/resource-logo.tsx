import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export const OFFICIAL_LOGOS: Record<string, string> = {
  'microsoft-learn': '/logos/microsoft.svg',
  'azure-for-students': '/logos/azure-students.svg',
  'azure-free-account': '/logos/azure.svg',
  'azure-architecture-center': '/logos/azure.svg',
  'azure-ai-foundry': '/logos/azure-ai.svg',
  'microsoft-copilot-learn': '/logos/copilot.svg',
  'microsoft-copilot-studio': '/logos/copilot-studio.svg',
  'github-student-developer-pack': '/logos/github.svg',
  'github-skills': '/logos/github-skills.svg',
  'visual-studio-community': '/logos/visual-studio.svg',
  'microsoft-365-education': '/logos/m365.svg',
};

export function resolveResourceLogo(slug?: string, logoUrl?: string | null): string {
  if (logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('/') || logoUrl.startsWith('data:'))) {
    return logoUrl;
  }
  if (slug) {
    const normalized = slug.toLowerCase();
    if (OFFICIAL_LOGOS[normalized]) {
      return OFFICIAL_LOGOS[normalized];
    }
    if (normalized.includes('copilot') && normalized.includes('studio')) {
      return '/logos/copilot-studio.svg';
    }
    if (normalized.includes('copilot')) {
      return '/logos/copilot.svg';
    }
    if (normalized.includes('azure') && normalized.includes('student')) {
      return '/logos/azure-students.svg';
    }
    if (normalized.includes('ai') || normalized.includes('foundry')) {
      return '/logos/azure-ai.svg';
    }
    if (normalized.includes('azure')) {
      return '/logos/azure.svg';
    }
    if (normalized.includes('github') && normalized.includes('skill')) {
      return '/logos/github-skills.svg';
    }
    if (normalized.includes('github')) {
      return '/logos/github.svg';
    }
    if (normalized.includes('visual-studio') || normalized.includes('vscode')) {
      return '/logos/visual-studio.svg';
    }
    if (normalized.includes('365') || normalized.includes('office')) {
      return '/logos/m365.svg';
    }
  }
  return '/logos/microsoft.svg';
}

interface ResourceLogoProps {
  slug?: string;
  name?: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
  containerClassName?: string;
}

export function ResourceLogo({
  slug,
  name,
  logoUrl,
  size = 40,
  className,
  containerClassName,
}: ResourceLogoProps) {
  const logoSrc = resolveResourceLogo(slug, logoUrl);

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900',
        containerClassName
      )}
    >
      <Image
        src={logoSrc}
        alt={name ? `${name} logo` : 'Resource logo'}
        width={size}
        height={size}
        unoptimized
        className={cn('h-full w-full object-contain', className)}
      />
    </div>
  );
}
