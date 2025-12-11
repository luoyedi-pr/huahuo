import { useCallback } from 'react';

/**
 * Type-safe IPC hook for calling Electron handlers
 */
export function useIpc() {
  const invoke = useCallback(async (channel: string, ...args: unknown[]) => {
    if (typeof window === 'undefined' || !window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.invoke(channel, ...args);
  }, []);

  const on = useCallback((channel: string, callback: (...args: unknown[]) => void) => {
    if (typeof window === 'undefined' || !window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.on(channel, callback);
  }, []);

  const off = useCallback((channel: string, callback: (...args: unknown[]) => void) => {
    if (typeof window === 'undefined' || !window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.off(channel, callback);
  }, []);

  return { invoke, on, off };
}

/**
 * Type definitions for IPC handlers
 */
export interface IpcHandlers {
  // Project
  'project:list': () => Promise<any[]>;
  'project:get': (projectId: string) => Promise<any>;
  'project:create': (data: { name: string; description?: string }) => Promise<string>;
  'project:update': (projectId: string, data: any) => Promise<void>;
  'project:delete': (projectId: string) => Promise<void>;

  // Script
  'script:load': (projectId: string) => Promise<any>;
  'script:save': (projectId: string, content: string) => Promise<void>;
  'script:parse-local': (content: string) => Promise<any>;
  'script:parse-ai': (content: string) => Promise<any>;
  'script:save-parsed': (projectId: string, parsedData: any) => Promise<void>;

  // Character
  'character:list': (projectId: string) => Promise<any[]>;
  'character:get': (characterId: string) => Promise<any>;
  'character:create': (projectId: string, data: any) => Promise<string>;
  'character:update': (characterId: string, data: any) => Promise<void>;
  'character:delete': (characterId: string) => Promise<void>;
  'character:generate-avatar': (characterId: string) => Promise<string>;
  'character:add-avatar': (characterId: string, avatarPath: string) => Promise<void>;
  'character:set-avatar': (characterId: string, avatarPath: string) => Promise<void>;

  // Storyboard
  'storyboard:list': (projectId: string) => Promise<any[]>;
  'storyboard:get': (shotId: string) => Promise<any>;
  'storyboard:create': (projectId: string, data: any) => Promise<string>;
  'storyboard:create-batch': (projectId: string, shotsData: any[]) => Promise<string[]>;
  'storyboard:update': (shotId: string, data: any) => Promise<void>;
  'storyboard:delete': (shotId: string) => Promise<void>;
  'storyboard:move': (shotId: string, newIndex: number) => Promise<void>;
  'storyboard:generate-image': (shotId: string) => Promise<string>;

  // Render
  'render:list': (projectId: string) => Promise<any[]>;
  'render:create': (projectId: string, shotId: string, type: 'image' | 'video') => Promise<string>;
  'render:create-batch': (projectId: string, shotIds: string[], type: 'image' | 'video') => Promise<string[]>;
  'render:update': (taskId: string, data: any) => Promise<void>;
  'render:cancel': (taskId: string) => Promise<void>;
  'render:pause': (taskId: string) => Promise<void>;
  'render:resume': (taskId: string) => Promise<void>;
  'render:status': () => Promise<any>;

  // Settings
  'settings:get': () => Promise<any>;
  'settings:update': (updates: any) => Promise<void>;
  'settings:get-api-config': () => Promise<any>;
  'settings:test-connection': () => Promise<any>;

  // AI
  'ai:generate-text': (prompt: string, systemPrompt?: string) => Promise<string>;
  'ai:generate-image': (shotId: string) => Promise<string>;
  'ai:generate-video': (shotId: string) => Promise<string>;
}

/**
 * Helper to create typed IPC calls
 */
export function createIpcCall<K extends keyof IpcHandlers>(channel: K) {
  return async (...args: Parameters<IpcHandlers[K]>) => {
    if (typeof window === 'undefined' || !window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.invoke(channel, ...args) as ReturnType<IpcHandlers[K]>;
  };
}
