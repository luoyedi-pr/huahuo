import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * 像素化按钮变体配置
 */
const pixelButtonVariants = cva(
  // 基础样式
  [
    'relative inline-flex items-center justify-center gap-2',
    'font-pixel text-sm uppercase tracking-wider',
    'border-2 border-black',
    'transition-all duration-100 ease-out',
    'select-none cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      // 颜色变体
      variant: {
        primary: [
          'bg-primary-main text-white',
          'hover:bg-primary-light',
          'active:bg-primary-dark',
        ],
        secondary: [
          'bg-secondary-main text-bg-primary',
          'hover:bg-secondary-light',
          'active:bg-secondary-dark',
        ],
        accent: [
          'bg-accent-purple text-white',
          'hover:bg-accent-purple/90',
          'active:bg-accent-purple/80',
        ],
        ghost: [
          'bg-transparent text-text-primary',
          'border-border',
          'hover:bg-bg-tertiary hover:border-border-hover',
          'active:bg-bg-elevated',
        ],
        danger: [
          'bg-status-error text-white',
          'hover:bg-status-error/90',
          'active:bg-status-error/80',
        ],
        success: [
          'bg-status-success text-white',
          'hover:bg-status-success/90',
          'active:bg-status-success/80',
        ],
      },
      // 尺寸变体
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
        icon: 'p-2',
      },
      // 是否有像素阴影
      shadow: {
        true: 'shadow-pixel hover:shadow-pixel-hover hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-pixel-active active:translate-x-[4px] active:translate-y-[4px] disabled:shadow-pixel disabled:translate-x-0 disabled:translate-y-0',
        false: '',
      },
      // 是否发光
      glow: {
        pink: 'shadow-glow-pink',
        cyan: 'shadow-glow-cyan',
        none: '',
      },
      // 是否全宽
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      shadow: true,
      glow: 'none',
      fullWidth: false,
    },
  }
);

/**
 * 像素化按钮属性
 */
export interface PixelButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pixelButtonVariants> {
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 左侧图标 */
  leftIcon?: React.ReactNode;
  /** 右侧图标 */
  rightIcon?: React.ReactNode;
}

/**
 * 像素化按钮组件
 *
 * @example
 * ```tsx
 * <PixelButton variant="primary" size="md">
 *   开始创作
 * </PixelButton>
 *
 * <PixelButton variant="secondary" glow="cyan" leftIcon={<IconPlus />}>
 *   新建项目
 * </PixelButton>
 * ```
 */
const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  (
    {
      className,
      variant,
      size,
      shadow,
      glow,
      fullWidth,
      loading,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          pixelButtonVariants({
            variant,
            size,
            shadow,
            glow,
            fullWidth,
          }),
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="animate-pixel-blink">●</span>
            <span className="animate-pixel-blink animation-delay-200">●</span>
            <span className="animate-pixel-blink animation-delay-400">●</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

PixelButton.displayName = 'PixelButton';

export { PixelButton, pixelButtonVariants };
export default PixelButton;
