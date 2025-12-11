import { eq, desc } from 'drizzle-orm';
import { getDatabase, schema } from '../database';
import { generateId } from './utils';
import { getDefaultStyleId } from './style.service';

const { projects, scripts, characters, shots } = schema;

export interface ProjectWithStats {
  id: string;
  name: string;
  description: string | null;
  styleId: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  progress: number;
  thumbnailPath: string | null;
  characterCount: number;
  shotCount: number;
  completedShotCount: number;
}

/**
 * 获取所有项目（含统计信息）
 */
export async function getAllProjects(): Promise<ProjectWithStats[]> {
  const db = getDatabase();

  const projectList = await db.select().from(projects).orderBy(desc(projects.updatedAt));

  const result: ProjectWithStats[] = [];

  for (const project of projectList) {
    // 获取角色数量
    const charCount = await db.select().from(characters).where(eq(characters.projectId, project.id));

    // 获取分镜数量和完成数量
    const shotList = await db.select().from(shots).where(eq(shots.projectId, project.id));
    const completedShots = shotList.filter((s: any) => s.status === 'ready').length;

    // 计算进度
    const progress = shotList.length > 0 ? Math.round((completedShots / shotList.length) * 100) : 0;

    result.push({
      ...project,
      characterCount: charCount.length,
      shotCount: shotList.length,
      completedShotCount: completedShots,
      progress,
    });
  }

  return result;
}

/**
 * 获取单个项目
 */
export async function getProject(id: string): Promise<ProjectWithStats | null> {
  const db = getDatabase();

  const [project] = await db.select().from(projects).where(eq(projects.id, id));

  if (!project) return null;

  const charCount = await db.select().from(characters).where(eq(characters.projectId, id));
  const shotList = await db.select().from(shots).where(eq(shots.projectId, id));
  const completedShots = shotList.filter((s: any) => s.status === 'ready').length;
  const progress = shotList.length > 0 ? Math.round((completedShots / shotList.length) * 100) : 0;

  return {
    ...project,
    characterCount: charCount.length,
    shotCount: shotList.length,
    completedShotCount: completedShots,
    progress,
  };
}

/**
 * 创建项目
 */
export async function createProject(data: { name: string; description?: string; styleId?: string }): Promise<string> {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await db.insert(projects).values({
    id,
    name: data.name,
    description: data.description || null,
    styleId: data.styleId || getDefaultStyleId(),
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    progress: 0,
  });

  // 创建默认剧本记录
  await db.insert(scripts).values({
    id: generateId(),
    projectId: id,
    content: '',
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

/**
 * 更新项目
 */
export async function updateProject(
  id: string,
  data: Partial<{ name: string; description: string; status: string; thumbnailPath: string; styleId: string }>
): Promise<void> {
  const db = getDatabase();

  await db
    .update(projects)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, id));
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  const db = getDatabase();
  await db.delete(projects).where(eq(projects.id, id));
}

/**
 * 更新项目时间戳
 */
export async function touchProject(id: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(projects)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(projects.id, id));
}

/**
 * 获取项目详细统计信息
 */
export interface ProjectStats {
  script: { done: number; total: number };
  characters: { done: number; total: number };
  storyboard: { done: number; total: number };
  rendered: { done: number; total: number };
}

export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  const db = getDatabase();

  // 剧本统计 - 检查是否有内容
  const [script] = await db.select().from(scripts).where(eq(scripts.projectId, projectId));
  const hasScript = script && script.content && script.content.trim().length > 0;

  // 从解析数据中获取场景数量（如果有的话）
  let parsedSceneCount = 0;
  if (script && script.parsedData) {
    try {
      const parsed = JSON.parse(script.parsedData);
      if (parsed.sceneCount) {
        parsedSceneCount = parsed.sceneCount;
      }
    } catch {
      // JSON 解析失败，忽略
    }
  }

  // 角色统计 - 检查有多少有头像（包括已选择的头像或生成的头像列表）
  const charList = await db.select().from(characters).where(eq(characters.projectId, projectId));
  const charsWithAvatar = charList.filter((c: any) => {
    // 检查是否有选中的头像
    if (c.avatarPath && c.avatarPath.trim().length > 0) return true;
    // 检查是否有生成的头像列表
    if (c.generatedAvatars) {
      try {
        const avatars = JSON.parse(c.generatedAvatars);
        if (Array.isArray(avatars) && avatars.length > 0) return true;
      } catch {
        // JSON 解析失败，忽略
      }
    }
    return false;
  });

  // 分镜统计 - 检查有多少有图片
  const shotList = await db.select().from(shots).where(eq(shots.projectId, projectId));
  const shotsWithImage = shotList.filter((s: any) => s.imagePath && s.imagePath.trim().length > 0);

  // 渲染统计 - 检查有多少有视频
  const shotsWithVideo = shotList.filter((s: any) => s.videoPath && s.videoPath.trim().length > 0);

  // 分镜总数：使用实际分镜数量，如果没有分镜则使用解析的场景数量作为预期值
  const storyboardTotal = shotList.length > 0 ? shotList.length : parsedSceneCount;

  return {
    script: {
      done: hasScript ? 1 : 0,
      total: 1,
    },
    characters: {
      done: charsWithAvatar.length,
      total: charList.length,
    },
    storyboard: {
      done: shotsWithImage.length,
      total: storyboardTotal,
    },
    rendered: {
      done: shotsWithVideo.length,
      total: shotList.length,
    },
  };
}
