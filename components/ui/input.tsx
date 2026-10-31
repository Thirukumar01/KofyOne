import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border border-[#F0DCDD] bg-[#FCECEB] px-3 py-2 text-sm text-[#292526] placeholder:text-[#777171] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B94A50] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2E2C30] dark:bg-[#252429] dark:text-[#F6F5F3] dark:placeholder:text-[#A8A2A2] dark:focus-visible:ring-[#D98C91] transition-colors',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
