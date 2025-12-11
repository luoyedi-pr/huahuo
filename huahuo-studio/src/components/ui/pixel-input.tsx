import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * 像素化输入框变体配置
 */
const pixelInputVariants = cva(
  // 基础样式
  [
    'w-full px-3 py-2',
    'bg-bg-tertiary',
    'border-2 border-black',
    'text-text-primary placeholder:text-text-muted',
    'focus:outline-none focus:border-primary-main',
    'transition-colors duration-150',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      // 尺寸
      size: {
        sm: 'text-xs py-1.5 px-2',
        md: 'text-sm py-2 px-3',
        lg: 'text-base py-3 px-4',
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
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
      shadow: false,
    },
  }
);

/**
 * 像素化输入框属性
 */
export interface PixelInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof pixelInputVariants> {
  /** 左侧图标 */
  leftIcon?: React.ReactNode;
  /** 右侧图标/按钮 */
  rightElement?: React.ReactNode;
  /** 错误信息 */
  error?: string;
  /** 标签 */
  label?: string;
  /** 帮助文本 */
  helperText?: string;
}

/**
 * 像素化输入框组件
 *
 * @example
 * ```tsx
 * <PixelInput placeholder="输入项目名称" />
 *
 * <PixelInput
 *   label="API Key"
 *   placeholder="sk-..."
 *   type="password"
 *   helperText="从 Google AI Studio 获取"
 * />
 *
 * <PixelInput
 *   state="error"
 *   error="请输入有效的 API Key"
 * />
 * ```
 */
const PixelInput = forwardRef<HTMLInputElement, PixelInputProps>(
  (
    {
      className,
      size,
      state,
      shadow,
      leftIcon,
      rightElement,
      error,
      label,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `pixel-input-${Math.random().toString(36).slice(2)}`;
    const actualState = error ? 'error' : state;

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

        {/* 输入框容器 */}
        <div className="relative">
          {/* 左侧图标 */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </div>
          )}

          {/* 输入框 */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              pixelInputVariants({ size, state: actualState, shadow }),
              leftIcon && 'pl-10',
              rightElement && 'pr-10',
              className
            )}
            {...props}
          />

          {/* 右侧元素 */}
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>

        {/* 错误信息 */}
        {error && (
          <p className="text-xs text-status-error flex items-center gap-1">
            <span>✖</span>
            {error}
          </p>
        )}

        {/* 帮助文本 */}
        {helperText && !error && (
          <p className="text-xs text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

PixelInput.displayName = 'PixelInput';

export { PixelInput, pixelInputVariants };
export default PixelInput;
