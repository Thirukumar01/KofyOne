import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center text-zinc-500 dark:text-zinc-400',
        className
      )}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent" />
      <span className="mt-3 text-sm font-medium">{message}</span>
      <span className="sr-only">Loading content, please wait</span>
    </div>
  );
}
