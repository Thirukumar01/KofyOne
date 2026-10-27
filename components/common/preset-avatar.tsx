'use client';

import React from 'react';
import {
  GraduationCap,
  Code,
  Cloud,
  Cpu,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { getPresetAvatar } from '@/config/avatars';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  GraduationCap,
  Code,
  Cloud,
  Cpu,
  Rocket,
  Sparkles,
};

interface PresetAvatarProps {
  avatarId?: string | null;
  size?: number; // size in px, defaults to 36
  className?: string;
  showBorder?: boolean;
}

export function PresetAvatar({
  avatarId,
  size = 36,
  className,
  showBorder = true,
}: PresetAvatarProps) {
  const avatar = getPresetAvatar(avatarId);
  const IconComponent = ICON_MAP[avatar.iconName] || GraduationCap;
  const iconSize = Math.max(12, Math.round(size * 0.52));

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 rounded-full shadow-xs transition-transform',
        avatar.bgClasses,
        showBorder && 'ring-2 ring-white/20 dark:ring-white/10',
        className
      )}
      title={`${avatar.name} (${avatar.title})`}
      aria-label={`${avatar.name} Avatar`}
    >
      <IconComponent
        style={{ width: iconSize, height: iconSize }}
        className="text-white drop-shadow-xs"
        strokeWidth={2.2}
      />
    </div>
  );
}
