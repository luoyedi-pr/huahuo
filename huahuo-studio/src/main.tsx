import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { TaskNotificationProvider } from './contexts/TaskNotificationContext';
import './styles/globals.css';

// 创建路由器实例
const router = createRouter({ routeTree });

// 类型声明
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TaskNotificationProvider>
      <RouterProvider router={router} />
    </TaskNotificationProvider>
  </React.StrictMode>
);
