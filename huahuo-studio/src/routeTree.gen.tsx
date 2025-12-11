import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import AppLayout from './components/layout/AppLayout';
import ProjectLayout from './components/layout/ProjectLayout';

// 全局页面
const HomePage = lazy(() => import('./routes/index'));
const AutomationPage = lazy(() => import('./routes/automation'));
const SettingsPage = lazy(() => import('./routes/settings'));

// 项目内页面
const ProjectOverviewPage = lazy(() => import('./routes/project/overview'));
const ProjectScriptPage = lazy(() => import('./routes/project/script'));
const ProjectCharactersPage = lazy(() => import('./routes/project/characters'));
const ProjectScenesPage = lazy(() => import('./routes/project/scenes'));
const ProjectStoryboardPage = lazy(() => import('./routes/project/storyboard'));
const ProjectRenderPage = lazy(() => import('./routes/project/render'));
const ProjectExportPage = lazy(() => import('./routes/project/export'));

// 加载中占位
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="font-pixel text-primary-main text-lg mb-2">Loading...</div>
        <div className="flex gap-1 justify-center">
          <span className="w-2 h-2 bg-primary-main animate-pulse" />
          <span className="w-2 h-2 bg-secondary-main animate-pulse" style={{ animationDelay: '0.1s' }} />
          <span className="w-2 h-2 bg-primary-main animate-pulse" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}

// 包装懒加载组件
function withSuspense(Component: React.LazyExoticComponent<React.ComponentType>) {
  return function WrappedComponent() {
    return (
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    );
  };
}

// ==================== 根路由 ====================
export const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

// ==================== 全局路由 ====================

// 首页（项目列表）
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: withSuspense(HomePage),
});

// 一键生成
export const automationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/automation',
  component: withSuspense(AutomationPage),
});

// 设置
export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: withSuspense(SettingsPage),
});

// ==================== 项目路由 ====================

// 项目根路由
export const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/project/$projectId',
  component: () => (
    <ProjectLayout>
      <Outlet />
    </ProjectLayout>
  ),
});

// 项目概览
export const projectOverviewRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/',
  component: withSuspense(ProjectOverviewPage),
});

// 项目剧本
export const projectScriptRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/script',
  component: withSuspense(ProjectScriptPage),
});

// 项目角色
export const projectCharactersRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/characters',
  component: withSuspense(ProjectCharactersPage),
});

// 项目场景
export const projectScenesRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/scenes',
  component: withSuspense(ProjectScenesPage),
});

// 项目分镜
export const projectStoryboardRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/storyboard',
  component: withSuspense(ProjectStoryboardPage),
});

// 项目渲染
export const projectRenderRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/render',
  component: withSuspense(ProjectRenderPage),
});

// 项目导出
export const projectExportRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/export',
  component: withSuspense(ProjectExportPage),
});

// ==================== 路由树 ====================
export const routeTree = rootRoute.addChildren([
  indexRoute,
  automationRoute,
  settingsRoute,
  projectRoute.addChildren([
    projectOverviewRoute,
    projectScriptRoute,
    projectCharactersRoute,
    projectScenesRoute,
    projectStoryboardRoute,
    projectRenderRoute,
    projectExportRoute,
  ]),
]);
