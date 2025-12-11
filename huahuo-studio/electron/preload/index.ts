import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API
const electronAPI = {
  // 通用 IPC 调用
  invoke: (channel: string, ...args: unknown[]) => {
    const allowedChannels = [
      // 窗口控制
      'window:minimize',
      'window:maximize',
      'window:close',
      // 应用信息
      'app:version',
      'app:path',
      // 项目管理
      'project:create',
      'project:get',
      'project:update',
      'project:list',
      'project:delete',
      'project:stats',
      // 剧本
      'script:load',
      'script:save',
      'script:parse-local',
      'script:parse-ai',
      'script:parse-phase1',
      'script:parse-phase2',
      'script:save-parsed',
      // 角色
      'character:create',
      'character:get',
      'character:update',
      'character:delete',
      'character:list',
      'character:generate-avatar',
      'character:generate-appearance',
      'character:generate-views',
      'character:add-avatar',
      'character:set-avatar',
      'character:cleanup-duplicates',
      // 场景
      'scene:list',
      'scene:get',
      'scene:create',
      'scene:create-batch',
      'scene:update',
      'scene:delete',
      'scene:cleanup-duplicates',
      'scene:generate-image',
      'scene:generate-all-images',
      // 分镜
      'storyboard:create',
      'storyboard:create-batch',
      'storyboard:get',
      'storyboard:update',
      'storyboard:delete',
      'storyboard:move',
      'storyboard:list',
      'storyboard:generate-image',
      'storyboard:generate-all-images',
      // 渲染
      'render:list',
      'render:create',
      'render:create-batch',
      'render:update',
      'render:pause',
      'render:resume',
      'render:cancel',
      'render:status',
      // AI API
      'ai:generate-text',
      'ai:generate-image',
      'ai:generate-video',
      // 设置
      'settings:get',
      'settings:update',
      'settings:get-api-config',
      'settings:get-llm-config',
      'settings:get-image-config',
      'settings:get-video-config',
      'settings:test-connection',
      'settings:test-llm-connection',
      'settings:test-image-connection',
      'settings:test-video-connection',
      'settings:backup-database',
      'settings:import-database',
      'settings:get-database-info',
      'settings:get-text-models',
      'settings:get-image-models',
      'settings:get-video-models',
      'settings:get-aspect-ratios',
      'settings:get-image-sizes',
      'settings:get-storage-path',
      'settings:select-storage-path',
      'settings:fetch-llm-models',
      'settings:fetch-image-models',
      'settings:fetch-video-models',
      // 导出
      'export:preview',
      'export:select-path',
      'export:video',
      'export:check-ffmpeg',
      'export:open-folder',
      // 文件操作
      'file:select',
      'file:save-dialog',
      'file:read',
      'file:write',
      // 风格管理
      'style:list',
      'style:get',
      'style:categories',
    ];

    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }

    throw new Error(`不允许的 IPC 通道: ${channel}`);
  },

  // 事件监听
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const allowedChannels = [
      'render:progress',
      'render:complete',
      'render:error',
      'ai:progress',
      'project:changed',
      'export:progress',
      'scene:batch-progress',
      'storyboard:batch-progress',
    ];

    if (allowedChannels.includes(channel)) {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
        callback(...args);
      };
      ipcRenderer.on(channel, subscription);

      // 返回取消订阅函数
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }

    throw new Error(`不允许的事件通道: ${channel}`);
  },

  // 移除监听
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback as any);
  },
};

// 暴露到 window 对象
contextBridge.exposeInMainWorld('electron', electronAPI);

// 类型声明
export type ElectronAPI = typeof electronAPI;
