import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'brand';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';

  const variants = {
    default:
      'bg-[#292526] text-[#F6F5F3] dark:bg-[#F6F5F3] dark:text-[#292526]',
    secondary:
      'bg-[#FCECEB] text-[#777171] dark:bg-[#252429] dark:text-[#A8A2A2]',
    outline:
      'border border-[#F0DCDD] text-[#292526] dark:border-[#2E2C30] dark:text-[#F6F5F3]',
    success:
      'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    brand:
      'bg-[rgba(185,74,80,0.12)] text-[#B94A50] border border-[rgba(185,74,80,0.20)] dark:bg-[rgba(217,140,145,0.15)] dark:text-[#D98C91] dark:border-[rgba(217,140,145,0.25)]',
  };

  return <div className={cn(baseStyles, variants[variant], className)} {...props} />;
}
