import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * 像素化进度条变体配置
 */
const pixelProgressVariants = cva(
  // 基础样式
  [
    'relative w-full overflow-hidden',
    'bg-bg-tertiary',
    'border-2 border-black',
  ],
  {
    variants: {
      // 尺寸
      size: {
        sm: 'h-4',
        md: 'h-6',
        lg: 'h-8',
      },
      // 是否有像素阴影
      shadow: {
        true: 'shadow-pixel-sm',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      shadow: false,
    },
  }
);

/**
 * 进度条填充变体
 */
const progressFillVariants = cva(
  'h-full transition-all duration-300 ease-out',
  {
    variants: {
      variant: {
        primary: 'bg-primary-main',
        secondary: 'bg-secondary-main',
        success: 'bg-status-success',
        warning: 'bg-status-warning',
        error: 'bg-status-error',
        gradient: 'bg-gradient-to-r from-primary-main to-secondary-main',
      },
      animated: {
        true: 'animate-pulse-slow',
        false: '',
      },
      striped: {
        true: 'bg-[length:20px_20px] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      animated: false,
      striped: false,
    },
  }
);

/**
 * 像素化进度条属性
 */
export interface PixelProgressProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pixelProgressVariants>,
    VariantProps<typeof progressFillVariants> {
  /** 进度值 (0-100) */
  value: number;
  /** 是否显示百分比文字 */
  showValue?: boolean;
  /** 自定义显示文字 */
  displayText?: string;
  /** 是否不确定状态 */
  indeterminate?: boolean;
}

/**
 * 像素化进度条组件
 *
 * @example
 * ```tsx
 * <PixelProgress value={60} showValue />
 *
 * <PixelProgress
 *   value={75}
 *   variant="gradient"
 *   striped
 *   displayText="正在渲染..."
 * />
 *
 * <PixelProgress indeterminate variant="secondary" />
 * ```
 */
const PixelProgress = forwardRef<HTMLDivElement, PixelProgressProps>(
  (
    {
      className,
      size,
      shadow,
      variant,
      animated,
      striped,
      value,
      showValue,
      displayText,
      indeterminate,
      ...props
    },
    ref
  ) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div
        ref={ref}
        className={cn(pixelProgressVariants({ size, shadow }), className)}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        {...props}
      >
        {/* 进度填充 */}
        <div
          className={cn(
            progressFillVariants({ variant, animated, striped }),
            indeterminate && 'animate-[indeterminate_1.5s_ease-in-out_infinite] w-1/3'
          )}
          style={indeterminate ? undefined : { width: `${clampedValue}%` }}
        />

        {/* 进度文字 */}
        {(showValue || displayText) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-pixel text-text-primary text-pixel-shadow">
              {displayText || `${Math.round(clampedValue)}%`}
            </span>
          </div>
        )}
      </div>
    );
  }
);

PixelProgress.displayName = 'PixelProgress';

/**
 * 分步进度条属性
 */
export interface PixelStepProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 步骤列表 */
  steps: Array<{
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }>;
  /** 当前步骤索引 */
  currentStep?: number;
}

/**
 * 像素化分步进度条
 *
 * @example
 * ```tsx
 * <PixelStepProgress
 *   steps={[
 *     { label: '解析剧本', status: 'completed' },
 *     { label: '生成分镜', status: 'active' },
 *     { label: '渲染图像', status: 'pending' },
 *     { label: '合成视频', status: 'pending' },
 *   ]}
 * />
 * ```
 */
const PixelStepProgress = forwardRef<HTMLDivElement, PixelStepProgressProps>(
  ({ className, steps, ...props }, ref) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed':
          return 'bg-status-success border-status-success';
        case 'active':
          return 'bg-primary-main border-primary-main animate-pulse';
        case 'error':
          return 'bg-status-error border-status-error';
        default:
          return 'bg-bg-tertiary border-border';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'completed':
          return '✓';
        case 'active':
          return '●';
        case 'error':
          return '✖';
        default:
          return '○';
      }
    };

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center flex-1">
              {/* 步骤圆点 */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 flex items-center justify-center',
                    'border-2 text-xs font-pixel',
                    getStatusColor(step.status)
                  )}
                >
                  {getStatusIcon(step.status)}
                </div>
                <span className="mt-2 text-xs text-text-secondary text-center max-w-[80px]">
                  {step.label}
                </span>
              </div>

              {/* 连接线 */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    step.status === 'completed'
                      ? 'bg-status-success'
                      : 'bg-border'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

PixelStepProgress.displayName = 'PixelStepProgress';

export { PixelProgress, PixelStepProgress, pixelProgressVariants };
export default PixelProgress;
