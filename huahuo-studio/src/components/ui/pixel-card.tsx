import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * 像素化卡片变体配置
 */
const pixelCardVariants = cva(
  // 基础样式
  [
    'relative',
    'border-2 border-black',
    'bg-bg-secondary',
  ],
  {
    variants: {
      // 变体
      variant: {
        default: '',
        elevated: 'bg-bg-elevated',
        outlined: 'bg-transparent border-border',
        gradient: 'bg-gradient-to-br from-bg-secondary to-bg-tertiary',
      },
      // 是否有像素阴影
      shadow: {
        true: 'shadow-pixel',
        false: '',
      },
      // 内边距
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      // 是否可交互（悬停效果）
      interactive: {
        true: 'cursor-pointer transition-all duration-150 hover:shadow-pixel-hover hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-pixel-active active:translate-x-[4px] active:translate-y-[4px]',
        false: '',
      },
      // 发光效果
      glow: {
        pink: 'shadow-glow-pink',
        cyan: 'shadow-glow-cyan',
        none: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      shadow: true,
      padding: 'md',
      interactive: false,
      glow: 'none',
    },
  }
);

/**
 * 像素化卡片属性
 */
export interface PixelCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pixelCardVariants> {
  /** 是否显示装饰角标 */
  cornerDecoration?: boolean;
}

/**
 * 像素化卡片组件
 *
 * @example
 * ```tsx
 * <PixelCard padding="lg" shadow>
 *   <h3>项目名称</h3>
 *   <p>项目描述</p>
 * </PixelCard>
 *
 * <PixelCard variant="elevated" interactive>
 *   可点击的卡片
 * </PixelCard>
 * ```
 */
const PixelCard = forwardRef<HTMLDivElement, PixelCardProps>(
  (
    {
      className,
      variant,
      shadow,
      padding,
      interactive,
      glow,
      cornerDecoration,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          pixelCardVariants({
            variant,
            shadow,
            padding,
            interactive,
            glow,
          }),
          className
        )}
        {...props}
      >
        {/* 装饰角标 */}
        {cornerDecoration && (
          <>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary-main border border-black" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-secondary-main border border-black" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-secondary-main border border-black" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary-main border border-black" />
          </>
        )}
        {children}
      </div>
    );
  }
);

PixelCard.displayName = 'PixelCard';

/**
 * 卡片头部
 */
const PixelCardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
));
PixelCardHeader.displayName = 'PixelCardHeader';

/**
 * 卡片标题
 */
const PixelCardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'font-pixel text-lg text-text-primary tracking-wide',
      className
    )}
    {...props}
  />
));
PixelCardTitle.displayName = 'PixelCardTitle';

/**
 * 卡片描述
 */
const PixelCardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-secondary', className)}
    {...props}
  />
));
PixelCardDescription.displayName = 'PixelCardDescription';

/**
 * 卡片内容
 */
const PixelCardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
PixelCardContent.displayName = 'PixelCardContent';

/**
 * 卡片底部
 */
const PixelCardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 border-t border-border', className)}
    {...props}
  />
));
PixelCardFooter.displayName = 'PixelCardFooter';

export {
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardDescription,
  PixelCardContent,
  PixelCardFooter,
  pixelCardVariants,
};
export default PixelCard;
