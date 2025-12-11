import { eq } from 'drizzle-orm';
import { getDatabase, schema, getDatabasePath, closeDatabase, initDatabase } from '../database';
import { existsSync, copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { app, dialog } from 'electron';
import { setStoragePath as setUtilsStoragePath } from './utils';

const { settings } = schema;

// 服务商类型
export type ProviderType = 'apiyi' | 'aliyun' | 'official' | 'custom';

export interface AppSettings {
  // ============ LLM 服务商配置 ============
  llmProvider: ProviderType;
  llmApiyiApiKey: string;
  llmAliyunApiKey: string;
  llmOfficialGeminiKey: string;
  llmOfficialClaudeKey: string;
  llmCustomBaseUrl: string;
  llmCustomApiKey: string;
  defaultTextModel: string;

  // ============ 图像服务商配置 ============
  imageProvider: ProviderType;
  imageApiyiApiKey: string;
  imageAliyunApiKey: string;
  imageOfficialGeminiKey: string;
  imageCustomBaseUrl: string;
  imageCustomApiKey: string;
  defaultImageModel: string;
  defaultImageSize: string;
  imageAspectRatio: string;

  // ============ 视频服务商配置 ============
  videoProvider: ProviderType;
  videoApiyiApiKey: string;
  videoAliyunApiKey: string;
  videoCustomBaseUrl: string;
  videoCustomApiKey: string;
  defaultVideoModel: string;
  defaultVideoDuration: number;

  // ============ 旧版兼容字段（迁移用） ============
  apiMode?: 'official' | 'apiyi' | 'aggregator';
  geminiApiKey?: string;
  claudeApiKey?: string;
  apiyiApiKey?: string;
  aggregatorBaseUrl?: string;
  aggregatorApiKey?: string;

  // 存储
  storagePath: string;
}

const defaultSettings: AppSettings = {
  // LLM 服务商配置
  llmProvider: 'apiyi',
  llmApiyiApiKey: '',
  llmAliyunApiKey: '',
  llmOfficialGeminiKey: '',
  llmOfficialClaudeKey: '',
  llmCustomBaseUrl: '',
  llmCustomApiKey: '',
  defaultTextModel: 'gemini-2.0-flash',

  // 图像服务商配置
  imageProvider: 'apiyi',
  imageApiyiApiKey: '',
  imageAliyunApiKey: '',
  imageOfficialGeminiKey: '',
  imageCustomBaseUrl: '',
  imageCustomApiKey: '',
  defaultImageModel: 'gemini-3-pro-image-preview',
  defaultImageSize: '2K',
  imageAspectRatio: '16:9',

  // 视频服务商配置
  videoProvider: 'apiyi',
  videoApiyiApiKey: '',
  videoAliyunApiKey: '',
  videoCustomBaseUrl: '',
  videoCustomApiKey: '',
  defaultVideoModel: 'sora_video2',
  defaultVideoDuration: 5,

  // 存储
  storagePath: '',
};

/**
 * 获取单个设置值
 */
export async function getSetting(key: string): Promise<string | null> {
  const db = getDatabase();
  const [setting] = await db.select().from(settings).where(eq(settings.key, key));
  return setting?.value || null;
}

/**
 * 设置单个值
 */
export async function setSetting(key: string, value: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const [existing] = await db.select().from(settings).where(eq(settings.key, key));

  if (existing) {
    await db
      .update(settings)
      .set({ value, updatedAt: now })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value, updatedAt: now });
  }
}

/**
 * 获取所有设置
 */
export async function getAllSettings(): Promise<AppSettings> {
  const db = getDatabase();
  const allSettings = await db.select().from(settings);

  const result: AppSettings = { ...defaultSettings };

  for (const setting of allSettings) {
    if (setting.key in result) {
      const key = setting.key as keyof AppSettings;
      if (typeof defaultSettings[key] === 'number') {
        (result as any)[key] = parseFloat(setting.value);
      } else {
        (result as any)[key] = setting.value;
      }
    }
  }

  // 旧版数据迁移：如果检测到旧版配置但没有新版配置，自动迁移
  if (result.apiMode && !result.llmProvider) {
    // 迁移 LLM 配置
    if (result.apiMode === 'apiyi' && result.apiyiApiKey) {
      result.llmProvider = 'apiyi';
      result.llmApiyiApiKey = result.apiyiApiKey;
      result.imageProvider = 'apiyi';
      result.imageApiyiApiKey = result.apiyiApiKey;
      result.videoProvider = 'apiyi';
      result.videoApiyiApiKey = result.apiyiApiKey;
    } else if (result.apiMode === 'official') {
      result.llmProvider = 'official';
      result.llmOfficialGeminiKey = result.geminiApiKey || '';
      result.llmOfficialClaudeKey = result.claudeApiKey || '';
      result.imageProvider = 'official';
      result.imageOfficialGeminiKey = result.geminiApiKey || '';
    } else if (result.apiMode === 'aggregator') {
      result.llmProvider = 'custom';
      result.llmCustomBaseUrl = result.aggregatorBaseUrl || '';
      result.llmCustomApiKey = result.aggregatorApiKey || '';
      result.imageProvider = 'custom';
      result.imageCustomBaseUrl = result.aggregatorBaseUrl || '';
      result.imageCustomApiKey = result.aggregatorApiKey || '';
    }
  }

  // 同步存储路径到 utils 模块，确保文件保存到正确位置
  if (result.storagePath) {
    setUtilsStoragePath(result.storagePath);
  } else {
    setUtilsStoragePath(null);
  }

  return result;
}

/**
 * 批量更新设置
 */
export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      await setSetting(key, String(value));
    }
  }
}

/**
 * 获取 LLM API 配置
 */
export async function getLlmApiConfig() {
  const settings = await getAllSettings();
  const provider = settings.llmProvider || 'apiyi';

  switch (provider) {
    case 'apiyi':
      return {
        provider: 'apiyi' as const,
        baseUrl: 'https://api.apiyi.com',
        apiKey: settings.llmApiyiApiKey,
        textModel: settings.defaultTextModel,
      };
    case 'aliyun':
      return {
        provider: 'aliyun' as const,
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
        apiKey: settings.llmAliyunApiKey,
        textModel: settings.defaultTextModel || 'qwen-plus',
      };
    case 'official':
      return {
        provider: 'official' as const,
        geminiApiKey: settings.llmOfficialGeminiKey,
        claudeApiKey: settings.llmOfficialClaudeKey,
        textModel: settings.defaultTextModel,
      };
    case 'custom':
    default:
      return {
        provider: 'custom' as const,
        baseUrl: settings.llmCustomBaseUrl,
        apiKey: settings.llmCustomApiKey,
        textModel: settings.defaultTextModel,
      };
  }
}

/**
 * 获取图像生成 API 配置
 */
export async function getImageApiConfig() {
  const settings = await getAllSettings();
  const provider = settings.imageProvider || 'apiyi';

  switch (provider) {
    case 'apiyi':
      return {
        provider: 'apiyi' as const,
        baseUrl: 'https://api.apiyi.com',
        apiKey: settings.imageApiyiApiKey,
        imageModel: settings.defaultImageModel,
        imageSize: settings.defaultImageSize,
        imageAspectRatio: settings.imageAspectRatio,
      };
    case 'aliyun':
      return {
        provider: 'aliyun' as const,
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
        apiKey: settings.imageAliyunApiKey,
        imageModel: settings.defaultImageModel || 'qwen-image-plus',
        imageSize: settings.defaultImageSize,
        imageAspectRatio: settings.imageAspectRatio,
      };
    case 'official':
      return {
        provider: 'official' as const,
        geminiApiKey: settings.imageOfficialGeminiKey,
        imageModel: settings.defaultImageModel,
        imageSize: settings.defaultImageSize,
        imageAspectRatio: settings.imageAspectRatio,
      };
    case 'custom':
    default:
      return {
        provider: 'custom' as const,
        baseUrl: settings.imageCustomBaseUrl,
        apiKey: settings.imageCustomApiKey,
        imageModel: settings.defaultImageModel,
        imageSize: settings.defaultImageSize,
        imageAspectRatio: settings.imageAspectRatio,
      };
  }
}

/**
 * 获取视频生成 API 配置
 */
export async function getVideoApiConfig() {
  const settings = await getAllSettings();
  const provider = settings.videoProvider || 'apiyi';

  switch (provider) {
    case 'apiyi':
      return {
        provider: 'apiyi' as const,
        baseUrl: 'https://api.apiyi.com',
        apiKey: settings.videoApiyiApiKey,
        videoModel: settings.defaultVideoModel,
        videoDuration: settings.defaultVideoDuration,
      };
    case 'aliyun':
      return {
        provider: 'aliyun' as const,
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
        apiKey: settings.videoAliyunApiKey,
        videoModel: settings.defaultVideoModel || 'wan2.1-i2v-turbo',
        videoDuration: settings.defaultVideoDuration,
      };
    case 'custom':
    default:
      return {
        provider: 'custom' as const,
        baseUrl: settings.videoCustomBaseUrl,
        apiKey: settings.videoCustomApiKey,
        videoModel: settings.defaultVideoModel,
        videoDuration: settings.defaultVideoDuration,
      };
  }
}

/**
 * 获取 API 配置（兼容旧版调用）
 * @deprecated 请使用 getLlmApiConfig, getImageApiConfig, getVideoApiConfig
 */
export async function getApiConfig() {
  const settings = await getAllSettings();

  // 优先使用新版配置
  if (settings.llmProvider) {
    const llmConfig = await getLlmApiConfig();
    const imageConfig = await getImageApiConfig();
    const videoConfig = await getVideoApiConfig();

    return {
      mode: llmConfig.provider as 'official' | 'apiyi' | 'aggregator',
      baseUrl: 'baseUrl' in llmConfig ? llmConfig.baseUrl : undefined,
      apiKey: 'apiKey' in llmConfig ? llmConfig.apiKey : undefined,
      geminiApiKey: 'geminiApiKey' in llmConfig ? llmConfig.geminiApiKey : undefined,
      claudeApiKey: 'claudeApiKey' in llmConfig ? llmConfig.claudeApiKey : undefined,
      textModel: llmConfig.textModel,
      imageModel: imageConfig.imageModel,
      imageSize: imageConfig.imageSize,
      imageAspectRatio: imageConfig.imageAspectRatio,
      videoModel: videoConfig.videoModel,
    };
  }

  // 旧版配置兼容
  if (settings.apiMode === 'official') {
    return {
      mode: 'official' as const,
      geminiApiKey: settings.geminiApiKey,
      claudeApiKey: settings.claudeApiKey,
      textModel: settings.defaultTextModel,
      imageModel: settings.defaultImageModel,
      imageSize: settings.defaultImageSize,
      imageAspectRatio: settings.imageAspectRatio,
      videoModel: settings.defaultVideoModel,
    };
  }

  if (settings.apiMode === 'apiyi') {
    return {
      mode: 'apiyi' as const,
      baseUrl: 'https://api.apiyi.com',
      apiKey: settings.apiyiApiKey,
      textModel: settings.defaultTextModel,
      imageModel: settings.defaultImageModel,
      imageSize: settings.defaultImageSize,
      imageAspectRatio: settings.imageAspectRatio,
      videoModel: settings.defaultVideoModel,
    };
  }

  return {
    mode: 'aggregator' as const,
    baseUrl: settings.aggregatorBaseUrl,
    apiKey: settings.aggregatorApiKey,
    textModel: settings.defaultTextModel,
    imageModel: settings.defaultImageModel,
    imageSize: settings.defaultImageSize,
    imageAspectRatio: settings.imageAspectRatio,
    videoModel: settings.defaultVideoModel,
  };
}

/**
 * 测试 LLM API 连接
 */
export async function testLlmConnection(): Promise<{ success: boolean; message: string }> {
  const config = await getLlmApiConfig();

  try {
    if (config.provider === 'official') {
      if (!config.geminiApiKey) {
        return { success: false, message: 'Gemini API Key 未配置' };
      }
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${config.geminiApiKey}`
      );
      if (!response.ok) {
        return { success: false, message: `Gemini API 错误: ${response.status}` };
      }
      return { success: true, message: 'Gemini 连接成功' };
    }

    if (!config.apiKey) {
      return { success: false, message: 'API Key 未配置' };
    }

    const response = await fetch(`${config.baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!response.ok) {
      return { success: false, message: `API 错误: ${response.status}` };
    }

    const providerName = config.provider === 'apiyi' ? 'API易' :
                        config.provider === 'aliyun' ? '阿里云' : '自定义服务';
    return { success: true, message: `${providerName} LLM 连接成功` };
  } catch (error) {
    const message = error instanceof Error ? error.message : '网络错误';
    return { success: false, message };
  }
}

/**
 * 测试图像 API 连接
 */
export async function testImageConnection(): Promise<{ success: boolean; message: string }> {
  const config = await getImageApiConfig();

  try {
    if (config.provider === 'official') {
      if (!config.geminiApiKey) {
        return { success: false, message: 'Gemini API Key 未配置' };
      }
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${config.geminiApiKey}`
      );
      if (!response.ok) {
        return { success: false, message: `Gemini API 错误: ${response.status}` };
      }
      return { success: true, message: 'Gemini 图像服务连接成功' };
    }

    if (!config.apiKey) {
      return { success: false, message: 'API Key 未配置' };
    }

    // 阿里云图像服务使用不同的测试接口
    if (config.provider === 'aliyun') {
      // 阿里云 DashScope 不支持 /v1/models，直接返回成功
      return { success: true, message: '阿里云图像服务配置完成' };
    }

    const response = await fetch(`${config.baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!response.ok) {
      return { success: false, message: `API 错误: ${response.status}` };
    }

    const providerName = config.provider === 'apiyi' ? 'API易' : '自定义服务';
    return { success: true, message: `${providerName} 图像服务连接成功` };
  } catch (error) {
    const message = error instanceof Error ? error.message : '网络错误';
    return { success: false, message };
  }
}

/**
 * 测试视频 API 连接
 */
export async function testVideoConnection(): Promise<{ success: boolean; message: string }> {
  const config = await getVideoApiConfig();

  try {
    if (!config.apiKey) {
      return { success: false, message: 'API Key 未配置' };
    }

    // 阿里云视频服务使用不同的测试接口
    if (config.provider === 'aliyun') {
      return { success: true, message: '阿里云视频服务配置完成' };
    }

    const response = await fetch(`${config.baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });

    if (!response.ok) {
      return { success: false, message: `API 错误: ${response.status}` };
    }

    const providerName = config.provider === 'apiyi' ? 'API易' : '自定义服务';
    return { success: true, message: `${providerName} 视频服务连接成功` };
  } catch (error) {
    const message = error instanceof Error ? error.message : '网络错误';
    return { success: false, message };
  }
}

/**
 * 测试 API 连接（兼容旧版）
 * @deprecated 请使用 testLlmConnection, testImageConnection, testVideoConnection
 */
export async function testApiConnection(): Promise<{ success: boolean; message: string }> {
  // 优先测试 LLM 连接
  return await testLlmConnection();
}

/**
 * 备份数据库到指定位置
 */
export async function backupDatabase(): Promise<{ success: boolean; path?: string; message: string }> {
  try {
    // 弹出保存对话框
    const result = await dialog.showSaveDialog({
      title: '备份数据库',
      defaultPath: join(app.getPath('documents'), `huahuo-backup-${new Date().toISOString().slice(0, 10)}.db`),
      filters: [
        { name: 'SQLite 数据库', extensions: ['db'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, message: '用户取消了备份' };
    }

    const sourcePath = getDatabasePath();
    const targetPath = result.filePath;

    // 确保目标目录存在
    const targetDir = dirname(targetPath);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // 关闭数据库连接以确保数据完整性
    closeDatabase();

    // 复制数据库文件
    copyFileSync(sourcePath, targetPath);

    // 同时复制 WAL 和 SHM 文件（如果存在）
    const walPath = sourcePath + '-wal';
    const shmPath = sourcePath + '-shm';
    if (existsSync(walPath)) {
      copyFileSync(walPath, targetPath + '-wal');
    }
    if (existsSync(shmPath)) {
      copyFileSync(shmPath, targetPath + '-shm');
    }

    // 重新初始化数据库
    initDatabase();

    return { success: true, path: targetPath, message: `数据库已备份到: ${targetPath}` };
  } catch (error) {
    // 确保数据库重新初始化
    try {
      initDatabase();
    } catch {}

    const message = error instanceof Error ? error.message : '备份失败';
    return { success: false, message };
  }
}

/**
 * 从指定位置导入数据库
 */
export async function importDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    // 弹出打开对话框
    const result = await dialog.showOpenDialog({
      title: '导入数据库',
      defaultPath: app.getPath('documents'),
      filters: [
        { name: 'SQLite 数据库', extensions: ['db'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: '用户取消了导入' };
    }

    const sourcePath = result.filePaths[0];
    const targetPath = getDatabasePath();

    // 检查源文件是否存在
    if (!existsSync(sourcePath)) {
      return { success: false, message: '所选文件不存在' };
    }

    // 先备份当前数据库
    const backupPath = targetPath + `.backup-${Date.now()}`;

    // 关闭数据库连接
    closeDatabase();

    // 备份当前数据库
    if (existsSync(targetPath)) {
      copyFileSync(targetPath, backupPath);
    }

    try {
      // 复制新数据库
      copyFileSync(sourcePath, targetPath);

      // 同时复制 WAL 和 SHM 文件（如果存在）
      const walPath = sourcePath + '-wal';
      const shmPath = sourcePath + '-shm';
      if (existsSync(walPath)) {
        copyFileSync(walPath, targetPath + '-wal');
      }
      if (existsSync(shmPath)) {
        copyFileSync(shmPath, targetPath + '-shm');
      }

      // 重新初始化数据库
      initDatabase();

      return { success: true, message: '数据库导入成功，请重启应用以确保数据完整性' };
    } catch (importError) {
      // 导入失败，恢复备份
      if (existsSync(backupPath)) {
        copyFileSync(backupPath, targetPath);
      }
      initDatabase();

      const message = importError instanceof Error ? importError.message : '导入失败';
      return { success: false, message: `导入失败: ${message}` };
    }
  } catch (error) {
    // 确保数据库重新初始化
    try {
      initDatabase();
    } catch {}

    const message = error instanceof Error ? error.message : '导入失败';
    return { success: false, message };
  }
}

/**
 * 获取数据库信息
 */
export function getDatabaseInfo(): { path: string; size: number } {
  const dbPath = getDatabasePath();
  let size = 0;

  try {
    const fs = require('fs');
    const stats = fs.statSync(dbPath);
    size = stats.size;
  } catch {}

  return { path: dbPath, size };
}

/**
 * 获取默认存储路径
 */
export function getDefaultStoragePath(): string {
  return join(app.getPath('userData'), 'projects');
}

/**
 * 获取当前存储路径（如果未设置则返回默认路径）
 */
export async function getStoragePath(): Promise<string> {
  const settings = await getAllSettings();
  return settings.storagePath || getDefaultStoragePath();
}

// ==================== 动态获取模型列表 ====================

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

/**
 * 从 API易 获取 LLM 模型列表
 */
async function fetchApiyiTextModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch('https://api.apiyi.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const models = data.data || [];

    // 过滤文本模型（排除图像和视频模型）
    return models
      .filter((m: any) => {
        const id = m.id?.toLowerCase() || '';
        // 排除图像模型
        if (id.includes('image') || id.includes('dall') || id.includes('wanx')) return false;
        // 排除视频模型
        if (id.includes('video') || id.includes('sora') || id.includes('veo')) return false;
        return true;
      })
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        provider: 'API易',
      }));
  } catch (error) {
    console.error('获取 API易 文本模型列表失败:', error);
    return [];
  }
}

/**
 * 从阿里云 DashScope 获取 LLM 模型列表
 */
async function fetchAliyunTextModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const models = data.data || [];

    return models
      .filter((m: any) => {
        const id = m.id?.toLowerCase() || '';
        // 只保留文本模型（qwen 系列）
        if (id.includes('qwen') || id.includes('llama') || id.includes('baichuan')) return true;
        return false;
      })
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        provider: '阿里云',
      }));
  } catch (error) {
    console.error('获取阿里云文本模型列表失败:', error);
    return [];
  }
}

/**
 * 从 Gemini 获取模型列表
 */
async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const models = data.models || [];

    return models
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => ({
        id: m.name?.replace('models/', '') || m.name,
        name: m.displayName || m.name,
        provider: 'Google',
      }));
  } catch (error) {
    console.error('获取 Gemini 模型列表失败:', error);
    return [];
  }
}

/**
 * 从自定义 OpenAI 兼容服务获取模型列表
 */
async function fetchCustomModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`${baseUrl}/v1/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const models = data.data || [];

    return models.map((m: any) => ({
      id: m.id,
      name: m.id,
      provider: '自定义',
    }));
  } catch (error) {
    console.error('获取自定义服务模型列表失败:', error);
    return [];
  }
}

/**
 * 从 API易 获取图像模型列表
 */
async function fetchApiyiImageModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch('https://api.apiyi.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const models = data.data || [];

    // 过滤图像模型
    return models
      .filter((m: any) => {
        const id = m.id?.toLowerCase() || '';
        return id.includes('image') || id.includes('dall') || id.includes('gpt-image') ||
               id.includes('gemini') && (id.includes('image') || id.includes('flash-exp'));
      })
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        provider: 'API易',
      }));
  } catch (error) {
    console.error('获取 API易 图像模型列表失败:', error);
    return [];
  }
}

/**
 * 从 API易 获取视频模型列表
 */
async function fetchApiyiVideoModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch('https://api.apiyi.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const models = data.data || [];

    // 过滤视频模型
    return models
      .filter((m: any) => {
        const id = m.id?.toLowerCase() || '';
        return id.includes('video') || id.includes('sora') || id.includes('veo');
      })
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        provider: 'API易',
      }));
  } catch (error) {
    console.error('获取 API易 视频模型列表失败:', error);
    return [];
  }
}

/**
 * 获取当前 LLM 服务商的可用文本模型
 */
export async function fetchLlmModels(): Promise<{ success: boolean; models: ModelInfo[]; message: string }> {
  const config = await getLlmApiConfig();

  try {
    let models: ModelInfo[] = [];

    switch (config.provider) {
      case 'apiyi':
        if (!config.apiKey) return { success: false, models: [], message: 'API Key 未配置' };
        models = await fetchApiyiTextModels(config.apiKey);
        break;

      case 'aliyun':
        if (!config.apiKey) return { success: false, models: [], message: 'API Key 未配置' };
        models = await fetchAliyunTextModels(config.apiKey);
        break;

      case 'official':
        if (!config.geminiApiKey) return { success: false, models: [], message: 'Gemini API Key 未配置' };
        models = await fetchGeminiModels(config.geminiApiKey);
        break;

      case 'custom':
        if (!config.baseUrl || !config.apiKey) return { success: false, models: [], message: '自定义服务未配置完整' };
        models = await fetchCustomModels(config.baseUrl, config.apiKey);
        break;
    }

    if (models.length === 0) {
      return { success: false, models: [], message: '未获取到模型列表' };
    }

    return { success: true, models, message: `获取到 ${models.length} 个模型` };
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取模型列表失败';
    return { success: false, models: [], message };
  }
}

/**
 * 获取当前图像服务商的可用图像模型
 */
export async function fetchImageModels(): Promise<{ success: boolean; models: ModelInfo[]; message: string }> {
  const config = await getImageApiConfig();

  try {
    let models: ModelInfo[] = [];

    switch (config.provider) {
      case 'apiyi':
        if (!config.apiKey) return { success: false, models: [], message: 'API Key 未配置' };
        models = await fetchApiyiImageModels(config.apiKey);
        break;

      case 'aliyun':
        // 阿里云通义千问图像模型 (Qwen-Image)
        models = [
          { id: 'qwen-image-plus', name: '通义千问图像 Plus (推荐)', provider: '阿里云' },
          { id: 'qwen-image', name: '通义千问图像', provider: '阿里云' },
        ];
        break;

      case 'official':
        if (!config.geminiApiKey) return { success: false, models: [], message: 'Gemini API Key 未配置' };
        // Gemini 图像生成模型
        models = [
          { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'Google' },
          { id: 'imagen-3.0-generate-001', name: 'Imagen 3', provider: 'Google' },
        ];
        break;

      case 'custom':
        if (!config.baseUrl || !config.apiKey) return { success: false, models: [], message: '自定义服务未配置完整' };
        models = await fetchCustomModels(config.baseUrl, config.apiKey);
        break;
    }

    if (models.length === 0) {
      return { success: false, models: [], message: '未获取到模型列表' };
    }

    return { success: true, models, message: `获取到 ${models.length} 个模型` };
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取模型列表失败';
    return { success: false, models: [], message };
  }
}

/**
 * 获取当前视频服务商的可用视频模型
 */
export async function fetchVideoModels(): Promise<{ success: boolean; models: ModelInfo[]; message: string }> {
  const config = await getVideoApiConfig();

  try {
    let models: ModelInfo[] = [];

    switch (config.provider) {
      case 'apiyi':
        if (!config.apiKey) return { success: false, models: [], message: 'API Key 未配置' };
        models = await fetchApiyiVideoModels(config.apiKey);
        break;

      case 'aliyun':
        // 阿里云通义万相图生视频模型
        models = [
          { id: 'wan2.5-i2v-preview', name: '万相2.5 (有声视频)', provider: 'Aliyun' },
          { id: 'wan2.2-i2v-flash', name: '万相2.2 极速版', provider: 'Aliyun' },
          { id: 'wan2.2-i2v-plus', name: '万相2.2 专业版', provider: 'Aliyun' },
          { id: 'wan2.1-i2v-turbo', name: '万相2.1 极速版', provider: 'Aliyun' },
          { id: 'wan2.1-i2v-plus', name: '万相2.1 专业版', provider: 'Aliyun' },
        ];
        break;

      case 'custom':
        if (!config.baseUrl || !config.apiKey) return { success: false, models: [], message: '自定义服务未配置完整' };
        models = await fetchCustomModels(config.baseUrl, config.apiKey);
        break;
    }

    if (models.length === 0) {
      return { success: false, models: [], message: '未获取到模型列表' };
    }

    return { success: true, models, message: `获取到 ${models.length} 个模型` };
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取模型列表失败';
    return { success: false, models: [], message };
  }
}

/**
 * 选择存储路径
 */
export async function selectStoragePath(): Promise<{ success: boolean; path?: string; message: string }> {
  try {
    const currentPath = await getStoragePath();
    // 如果当前路径以 huahuo 结尾，则显示父目录
    const displayPath = currentPath.endsWith('huahuo')
      ? dirname(currentPath)
      : currentPath;

    const result = await dialog.showOpenDialog({
      title: '选择项目存储路径',
      defaultPath: displayPath,
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: '用户取消了选择' };
    }

    // 在选择的路径后追加 huahuo 文件夹
    const selectedPath = result.filePaths[0];
    const huahuoPath = join(selectedPath, 'huahuo');

    // 确保 huahuo 目录存在
    if (!existsSync(huahuoPath)) {
      mkdirSync(huahuoPath, { recursive: true });
    }

    return { success: true, path: huahuoPath, message: '路径选择成功' };
  } catch (error) {
    const message = error instanceof Error ? error.message : '选择路径失败';
    return { success: false, message };
  }
}
