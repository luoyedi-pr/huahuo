import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const pixelBadgeVariants = cva(
  ['inline-flex items-center justify-center', 'font-pixel text-xs uppercase', 'border-2 border-black', 'px-2 py-0.5'],
  {
    variants: {
      variant: {
        default: 'bg-bg-tertiary text-text-primary',
        primary: 'bg-primary-main text-white',
        secondary: 'bg-secondary-main text-bg-primary',
        success: 'bg-status-success text-white',
        warning: 'bg-status-warning text-bg-primary',
        error: 'bg-status-error text-white',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0',
        md: 'text-xs px-2 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface PixelBadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof pixelBadgeVariants> {}

const PixelBadge = forwardRef<HTMLSpanElement, PixelBadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span ref={ref} className={cn(pixelBadgeVariants({ variant, size }), className)} {...props} />
  )
);

PixelBadge.displayName = 'PixelBadge';
export { PixelBadge, pixelBadgeVariants };
export default PixelBadge;
