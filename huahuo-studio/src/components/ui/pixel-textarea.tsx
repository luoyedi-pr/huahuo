import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * 像素化文本域变体配置
 */
const pixelTextareaVariants = cva(
  // 基础样式
  [
    'w-full px-3 py-2',
    'bg-bg-tertiary',
    'border-2 border-black',
    'text-text-primary placeholder:text-text-muted',
    'focus:outline-none focus:border-primary-main',
    'transition-colors duration-150',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'resize-none',
  ],
  {
    variants: {
      // 尺寸
      size: {
        sm: 'text-xs py-1.5 px-2 min-h-[60px]',
        md: 'text-sm py-2 px-3 min-h-[100px]',
        lg: 'text-base py-3 px-4 min-h-[150px]',
      },
      // 状态
      state: {
        default: '',
        error: 'border-status-error focus:border-status-error',
        success: 'border-status-success focus:border-status-success',
      },
      // 是否有像素阴影
      shadow: {
        true: 'shadow-pixel-sm',
        false: '',
      },
      // 是否可调整大小
      resizable: {
        true: 'resize-y',
        false: 'resize-none',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
      shadow: false,
      resizable: false,
    },
  }
);

/**
 * 像素化文本域属性
 */
export interface PixelTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof pixelTextareaVariants> {
  /** 错误信息 */
  error?: string;
  /** 标签 */
  label?: string;
  /** 帮助文本 */
  helperText?: string;
  /** 字数统计 */
  showCount?: boolean;
  /** 最大字数 */
  maxLength?: number;
}

/**
 * 像素化文本域组件
 *
 * @example
 * ```tsx
 * <PixelTextarea placeholder="输入剧本内容..." />
 *
 * <PixelTextarea
 *   label="剧本"
 *   placeholder="请输入剧本内容"
 *   showCount
 *   maxLength={5000}
 * />
 * ```
 */
const PixelTextarea = forwardRef<HTMLTextAreaElement, PixelTextareaProps>(
  (
    {
      className,
      size,
      state,
      shadow,
      resizable,
      error,
      label,
      helperText,
      showCount,
      maxLength,
      value,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `pixel-textarea-${Math.random().toString(36).slice(2)}`;
    const actualState = error ? 'error' : state;
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full space-y-1.5">
        {/* 标签 */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}

        {/* 文本域 */}
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          className={cn(
            pixelTextareaVariants({ size, state: actualState, shadow, resizable }),
            className
          )}
          {...props}
        />

        {/* 底部信息 */}
        <div className="flex items-center justify-between">
          {/* 错误信息或帮助文本 */}
          <div>
            {error && (
              <p className="text-xs text-status-error flex items-center gap-1">
                <span>✖</span>
                {error}
              </p>
            )}
            {helperText && !error && (
              <p className="text-xs text-text-muted">{helperText}</p>
            )}
          </div>

          {/* 字数统计 */}
          {showCount && (
            <p className={cn(
              'text-xs',
              maxLength && currentLength >= maxLength
                ? 'text-status-error'
                : 'text-text-muted'
            )}>
              {currentLength}
              {maxLength && ` / ${maxLength}`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

PixelTextarea.displayName = 'PixelTextarea';

export { PixelTextarea, pixelTextareaVariants };
export default PixelTextarea;
