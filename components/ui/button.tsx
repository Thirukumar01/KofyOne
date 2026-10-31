import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary:
        'bg-[#B94A50] text-white hover:bg-[#A13D43] active:bg-[#8D3338] dark:text-[#F6F5F3] dark:hover:bg-[#C85A60] dark:active:bg-[#A13D43] focus-visible:ring-[#B94A50] dark:focus-visible:ring-[#D98C91] shadow-sm',
      secondary:
        'bg-[#FCECEB] text-[#292526] hover:bg-[#F0DCDD] dark:bg-[#252429] dark:text-[#F6F5F3] dark:hover:bg-[#2E2C30] focus-visible:ring-[#B94A50]',
      outline:
        'border border-[#F0DCDD] bg-transparent text-[#292526] hover:bg-[#FCECEB] dark:border-[#2E2C30] dark:text-[#F6F5F3] dark:hover:bg-[#252429] focus-visible:ring-[#B94A50]',
      ghost:
        'hover:bg-[#FCECEB] text-[#777171] hover:text-[#292526] dark:hover:bg-[#252429] dark:text-[#A8A2A2] dark:hover:text-[#F6F5F3] focus-visible:ring-[#B94A50]',
      destructive:
        'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
