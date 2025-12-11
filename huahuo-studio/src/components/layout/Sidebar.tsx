import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import {
  IconHome, IconScript, IconCharacter, IconStoryboard,
  IconRender, IconSettings, IconMagic, IconChevronLeft,
  IconFolder, IconVideo, IconScene,
} from '@/components/ui/pixel-icons';
import { useProjectStore } from '@/stores/project';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

// 全局导航项
const globalNavItems: NavItem[] = [
  { path: '/', label: '工作台', icon: IconHome },
  { path: '/automation', label: '一键生成', icon: IconMagic },
];

// 项目内导航项（动态生成）
const getProjectNavItems = (projectId: string): NavItem[] => [
  { path: `/project/${projectId}`, label: '项目概览', icon: IconFolder },
  { path: `/project/${projectId}/script`, label: '剧本', icon: IconScript },
  { path: `/project/${projectId}/characters`, label: '角色', icon: IconCharacter },
  { path: `/project/${projectId}/scenes`, label: '场景', icon: IconScene },
  { path: `/project/${projectId}/storyboard`, label: '分镜', icon: IconStoryboard },
  { path: `/project/${projectId}/render`, label: '渲染', icon: IconRender },
  { path: `/project/${projectId}/export`, label: '导出', icon: IconVideo },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { projects } = useProjectStore();

  // 判断是否在项目内
  const isInProject = currentPath.startsWith('/project/');
  const projectId = isInProject ? currentPath.split('/')[2] : null;
  const currentProject = projectId ? projects.find((p) => p.id === projectId) : null;

  // 根据上下文选择导航项
  const navItems = isInProject && projectId
    ? getProjectNavItems(projectId)
    : globalNavItems;

  return (
    <aside
      className={cn(
        'h-full bg-bg-secondary border-r-2 border-black',
        'flex flex-col transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-center border-b-2 border-black px-4">
        {collapsed ? (
          <span className="text-2xl">🎆</span>
        ) : (
          <h1 className="font-pixel text-lg text-primary-main tracking-wider">
            花火 Studio
          </h1>
        )}
      </div>

      {/* 返回按钮 + 项目名（项目内显示） */}
      {isInProject && (
        <div className="border-b border-border">
          <Link
            to="/"
            className={cn(
              'flex items-center gap-2 px-4 py-3',
              'text-text-secondary hover:text-primary-main hover:bg-bg-tertiary',
              'transition-colors duration-150'
            )}
          >
            <IconChevronLeft size={18} className="shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-muted">返回项目列表</div>
                <div className="text-sm text-text-primary font-medium truncate">
                  {currentProject?.name || '未知项目'}
                </div>
              </div>
            )}
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            // 精确匹配或前缀匹配
            let isActive = false;
            if (item.path === '/' || item.path === `/project/${projectId}`) {
              isActive = currentPath === item.path;
            } else {
              isActive = currentPath.startsWith(item.path);
            }

            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5',
                    'border-2 transition-all duration-100',
                    'hover:translate-x-1',
                    isActive
                      ? 'bg-primary-main border-black text-white shadow-pixel-sm'
                      : 'bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary hover:border-black'
                  )}
                >
                  <Icon size={20} className="shrink-0" />
                  {!collapsed && (
                    <span className="font-medium text-sm truncate">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings（仅全局显示） */}
      {!isInProject && (
        <div className="border-t-2 border-black p-2">
          <Link
            to="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5',
              'border-2 transition-all duration-100',
              currentPath === '/settings'
                ? 'bg-bg-tertiary border-black text-text-primary'
                : 'bg-transparent border-transparent text-text-muted hover:text-text-primary hover:bg-bg-tertiary hover:border-black'
            )}
          >
            <IconSettings size={20} className="shrink-0" />
            {!collapsed && <span className="font-medium text-sm">设置</span>}
          </Link>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
