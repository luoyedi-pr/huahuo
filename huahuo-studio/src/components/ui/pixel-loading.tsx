import { cn } from '@/lib/utils';

export interface PixelLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

/**
 * 像素风格加载动画组件
 */
export function PixelLoading({ size = 'md', text, className }: PixelLoadingProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'flex gap-1',
          size === 'sm' && 'scale-75',
          size === 'lg' && 'scale-150'
        )}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-primary-main animate-pixel-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      {text && (
        <span
          className={cn(
            'font-pixel text-text-muted',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base'
          )}
        >
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * 像素风格 Spinner 组件
 */
export function PixelSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('inline-block', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="w-full h-full border-2 border-current border-t-transparent animate-spin"
        style={{ borderRadius: 0 }}
      />
    </div>
  );
}

export default PixelLoading;
