import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'brand';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';

  const variants = {
    default: 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900',
    secondary: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
    outline: 'border border-zinc-200 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    brand: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300',
  };

  return <div className={cn(baseStyles, variants[variant], className)} {...props} />;
}
