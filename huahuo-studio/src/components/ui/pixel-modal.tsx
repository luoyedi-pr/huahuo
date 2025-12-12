import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from './pixel-icons';
import { cn } from '../../lib/utils';

interface PixelModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PixelModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: PixelModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          'w-full bg-bg-secondary border-2 border-black shadow-pixel animate-in zoom-in-95 duration-200',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b-2 border-black bg-primary-main text-white">
          <h3 className="font-pixel text-sm">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 p-3 border-t-2 border-black bg-bg-tertiary">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
