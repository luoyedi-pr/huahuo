import { cn } from '@/lib/utils';
import { IconMenu, IconSearch } from '@/components/ui/pixel-icons';
import { PixelButton } from '@/components/ui/pixel-button';

interface ToolbarProps {
  title?: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function Toolbar({ title, onMenuClick, actions, className }: ToolbarProps) {
  return (
    <header
      className={cn(
        'h-14 bg-bg-secondary border-b-2 border-black',
        'flex items-center justify-between pl-4 pr-36', // pr-36 为 Windows 标题栏按钮预留空间
        'app-drag-region', // Electron 拖拽区域
        className
      )}
    >
      {/* 左侧 */}
      <div className="flex items-center gap-4 app-no-drag">
        {onMenuClick && (
          <PixelButton
            variant="ghost"
            size="icon"
            shadow={false}
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <IconMenu size={20} />
          </PixelButton>
        )}
        {title && (
          <h2 className="font-pixel text-sm text-text-primary">{title}</h2>
        )}
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-2 app-no-drag">
        {actions}
      </div>
    </header>
  );
}

/** 工具栏搜索框 */
export function ToolbarSearch({
  placeholder = '搜索...',
  value,
  onChange,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="relative">
      <IconSearch
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'w-48 pl-9 pr-3 py-1.5',
          'bg-bg-tertiary border-2 border-black',
          'text-sm text-text-primary placeholder:text-text-muted',
          'focus:outline-none focus:border-primary-main',
          'transition-colors'
        )}
      />
    </div>
  );
}

export default Toolbar;
