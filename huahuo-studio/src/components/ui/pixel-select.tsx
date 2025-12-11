import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { IconChevronDown } from './pixel-icons';

export interface SelectOption {
  value: string;
  label: string;
}

export interface PixelSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export function PixelSelect({
  value,
  onChange,
  options,
  label,
  placeholder = '请选择...',
  disabled = false,
  className,
  helperText,
}: PixelSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-xs font-medium text-text-secondary mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full px-3 py-2 text-left text-sm',
          'bg-bg-primary border-2 border-black shadow-pixel',
          'flex items-center justify-between gap-2',
          'transition-colors hover:bg-bg-secondary',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={cn(!selectedOption && 'text-text-muted')}>
          {selectedOption?.label || placeholder}
        </span>
        <IconChevronDown
          size={16}
          className={cn('transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-bg-primary border-2 border-black shadow-pixel max-h-48 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm',
                'hover:bg-bg-secondary transition-colors',
                option.value === value && 'bg-primary-main text-white'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {helperText && (
        <p className="mt-1 text-xs text-text-muted">{helperText}</p>
      )}
    </div>
  );
}
