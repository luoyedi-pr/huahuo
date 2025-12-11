import { v4 as uuidv4 } from 'uuid';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return uuidv4();
}

// 缓存的存储路径（由 settings.service.ts 设置）
let cachedStoragePath: string | null = null;

/**
 * 设置存储路径（由 settings.service.ts 调用）
 */
export function setStoragePath(path: string | null): void {
  cachedStoragePath = path;
}

/**
 * 获取存储路径（如果用户设置了自定义路径则使用，否则使用默认路径）
 */
function getStorageBasePath(): string {
  if (cachedStoragePath) {
    return cachedStoragePath;
  }
  // 默认路径
  const userDataPath = app.getPath('userData');
  return join(userDataPath, 'huahuo');
}

/**
 * 获取项目存储根目录
 */
export function getProjectsDir(): string {
  const basePath = getStorageBasePath();
  const projectsDir = join(basePath, 'projects');

  if (!existsSync(projectsDir)) {
    mkdirSync(projectsDir, { recursive: true });
  }

  return projectsDir;
}

/**
 * 获取项目目录
 */
export function getProjectDir(projectId: string): string {
  const projectDir = join(getProjectsDir(), projectId);

  if (!existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true });
  }

  return projectDir;
}

/**
 * 获取项目资产目录
 */
export function getProjectAssetsDir(projectId: string, type: 'images' | 'videos' | 'avatars' | 'scenes'): string {
  const assetsDir = join(getProjectDir(projectId), type);

  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true });
  }

  return assetsDir;
}

/**
 * 保存文件到项目目录
 */
export function saveProjectFile(
  projectId: string,
  type: 'images' | 'videos' | 'avatars' | 'scenes',
  filename: string,
  data: Buffer
): string {
  const dir = getProjectAssetsDir(projectId, type);
  const filePath = join(dir, filename);
  writeFileSync(filePath, data);
  return filePath;
}

/**
 * 读取项目文件
 */
export function readProjectFile(filePath: string): Buffer | null {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath);
}

/**
 * 删除项目文件
 */
export function deleteProjectFile(filePath: string): void {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;

  return date.toLocaleDateString('zh-CN');
}
