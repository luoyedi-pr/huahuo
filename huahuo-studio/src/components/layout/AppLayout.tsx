import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { TaskNotificationPanel } from '../ui/TaskNotificationPanel';

interface AppLayoutProps {
  children: React.ReactNode;
}

/** 响应式断点 */
const BREAKPOINTS = {
  compact: 768,    // < 768px
  standard: 1280,  // 768-1279px
  wide: 1536,      // 1280-1535px
  ultrawide: 1536, // >= 1536px
};

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      // 自动折叠侧边栏
      if (width < BREAKPOINTS.compact) {
        setSidebarCollapsed(true);
      } else if (width >= BREAKPOINTS.wide) {
        setSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 获取当前布局模式
  const getLayoutMode = () => {
    if (windowWidth < BREAKPOINTS.compact) return 'compact';
    if (windowWidth < BREAKPOINTS.standard) return 'standard';
    if (windowWidth < BREAKPOINTS.ultrawide) return 'wide';
    return 'ultrawide';
  };

  const layoutMode = getLayoutMode();

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-bg-primary">
      {/* 侧边栏 */}
      <Sidebar collapsed={sidebarCollapsed || layoutMode === 'compact'} />

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>

      {/* 任务通知面板 */}
      <TaskNotificationPanel />
    </div>
  );
}

/** 页面容器 */
export function PageContainer({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex-1 overflow-auto',
        padded && 'p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

/** 页面标题区 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-pixel text-2xl text-text-primary mb-1">{title}</h1>
        {description && (
          <div className="text-sm text-text-secondary">{description}</div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default AppLayout;
