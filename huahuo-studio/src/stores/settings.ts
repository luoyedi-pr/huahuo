import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ==================== 类型定义 ====================

export type ApiMode = 'official' | 'aggregator';

export interface ApiConfig {
  mode: ApiMode;
  official: {
    geminiKey: string;
    claudeKey: string;
  };
  aggregator: {
    baseUrl: string;
    apiKey: string;
  };
}

export interface GenerationSettings {
  defaultImageModel: string;
  defaultVideoModel: string;
  defaultImageSize: string;
  defaultVideoDuration: number;
}

export interface AppSettings {
  api: ApiConfig;
  generation: GenerationSettings;
  storagePath: string;
  theme: 'dark';
  language: 'zh-CN';
}

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  updateApiConfig: (config: Partial<ApiConfig>) => void;
  updateGenerationSettings: (settings: Partial<GenerationSettings>) => void;
  updateStoragePath: (path: string) => void;
  resetSettings: () => void;
}

// ==================== 默认值 ====================

const defaultSettings: AppSettings = {
  api: {
    mode: 'aggregator',
    official: {
      geminiKey: '',
      claudeKey: '',
    },
    aggregator: {
      baseUrl: 'https://api.api-yi.com',
      apiKey: '',
    },
  },
  generation: {
    defaultImageModel: 'gemini-2.0-flash',
    defaultVideoModel: 'veo-2',
    defaultImageSize: '1024x1024',
    defaultVideoDuration: 5,
  },
  storagePath: '',
  theme: 'dark',
  language: 'zh-CN',
};

// ==================== Store ====================

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      isLoaded: false,

      updateApiConfig: (config) =>
        set((state) => ({
          settings: {
            ...state.settings,
            api: { ...state.settings.api, ...config },
          },
        })),

      updateGenerationSettings: (genSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            generation: { ...state.settings.generation, ...genSettings },
          },
        })),

      updateStoragePath: (path) =>
        set((state) => ({
          settings: { ...state.settings, storagePath: path },
        })),

      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'huahuo-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoaded = true;
        }
      },
    }
  )
);
