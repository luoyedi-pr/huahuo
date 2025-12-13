import { eq, asc } from 'drizzle-orm';
import { getDatabase, schema } from '../database';
import { generateId, deleteProjectFile } from './utils';
import { touchProject } from './project.service';

const { shots } = schema;

export type ShotStatus = 'empty' | 'generating' | 'ready' | 'error';

export interface ShotData {
  id: string;
  projectId: string;
  sceneId: string | null;
  index: number;
  description: string;
  dialogue: string | null;
  characterId: string | null; // 向后兼容：单角色
  characterIds: string[] | null; // 新增：多角色ID数组
  duration: number;
  cameraType: string | null;
  mood: string | null;
  sceneInfo: string | null;
  location: string | null;
  timeOfDay: string | null;
  props: string | null;
  action: string | null;
  imagePath: string | null;
  videoPath: string | null;
  status: ShotStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * 解析 characterIds JSON 字符串为数组
 */
function parseCharacterIds(characterIdsJson: string | null): string[] | null {
  if (!characterIdsJson) return null;
  try {
    const parsed = JSON.parse(characterIdsJson);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 获取项目所有分镜
 */
export async function getShots(projectId: string): Promise<ShotData[]> {
  const db = getDatabase();

  const result = await db
    .select()
    .from(shots)
    .where(eq(shots.projectId, projectId))
    .orderBy(asc(shots.index));

  return result.map((shot: any) => ({
    ...shot,
    characterIds: parseCharacterIds(shot.characterIds),
    status: shot.status as ShotStatus,
  }));
}

/**
 * 获取单个分镜
 */
export async function getShot(id: string): Promise<ShotData | null> {
  const db = getDatabase();
  const [shot] = await db.select().from(shots).where(eq(shots.id, id));

  if (!shot) return null;

  const parsedCharacterIds = parseCharacterIds(shot.characterIds);
  console.log('[Shot Service] getShot - 读取分镜:', {
    shotId: id,
    数据库中characterIds: shot.characterIds,
    解析后characterIds: parsedCharacterIds,
    characterId: shot.characterId,
  });

  return {
    ...shot,
    characterIds: parsedCharacterIds,
    status: shot.status as ShotStatus,
  };
}

/**
 * 创建分镜
 */
export async function createShot(data: {
  projectId: string;
  index: number;
  description: string;
  dialogue?: string;
  characterId?: string;
  characterIds?: string[]; // 新增：多角色ID数组
  sceneId?: string; // 关联场景ID
  duration?: number;
  cameraType?: string;
  mood?: string;
  sceneInfo?: string;
  location?: string;
  timeOfDay?: string;
  props?: string;
  action?: string;
}): Promise<string> {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await db.insert(shots).values({
    id,
    projectId: data.projectId,
    sceneId: data.sceneId || null,
    index: data.index,
    description: data.description,
    dialogue: data.dialogue || null,
    characterId: data.characterId || null,
    characterIds: data.characterIds ? JSON.stringify(data.characterIds) : null,
    duration: data.duration || 3,
    cameraType: data.cameraType || null,
    mood: data.mood || null,
    sceneInfo: data.sceneInfo || null,
    location: data.location || null,
    timeOfDay: data.timeOfDay || null,
    props: data.props || null,
    action: data.action || null,
    status: 'empty',
    createdAt: now,
    updatedAt: now,
  });

  await touchProject(data.projectId);
  return id;
}

/**
 * 批量创建分镜
 * 支持 sceneId 关联场景
 */
export async function createShots(
  projectId: string,
  shotsData: Array<{
    description: string;
    dialogue?: string;
    characterId?: string;
    characterIds?: string[]; // 新增：多角色ID数组
    duration?: number;
    cameraType?: string;
    mood?: string;
    sceneInfo?: string;
    location?: string;
    timeOfDay?: string;
    props?: string | string[];
    action?: string;
    sceneId?: string; // 场景ID
    // 以下字段来自 AI 解析但数据库暂不支持，会被过滤
    targetCharacter?: string;
    tone?: string;
    emotion?: string;
    character?: string;
    index?: number;
    status?: string;
  }>
): Promise<string[]> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const ids: string[] = [];

  console.log(`[createShots] 开始创建 ${shotsData.length} 个分镜`);

  // 获取当前最大 index
  const existing = await db
    .select()
    .from(shots)
    .where(eq(shots.projectId, projectId))
    .orderBy(asc(shots.index));

  let startIndex = existing.length > 0 ? existing[existing.length - 1].index + 1 : 1;

  // 逐条插入，避免参数过多
  for (let i = 0; i < shotsData.length; i++) {
    const data = shotsData[i];
    const id = generateId();
    ids.push(id);

    // 处理 props 字段 - 如果是数组则转换为字符串
    let propsValue: string | null = null;
    if (data.props) {
      if (Array.isArray(data.props)) {
        propsValue = data.props.join('、');
      } else {
        propsValue = String(data.props);
      }
    }

    // 只提取数据库支持的字段，过滤掉不支持的字段
    const insertData = {
      id,
      projectId,
      sceneId: data.sceneId || null,
      index: startIndex++,
      description: data.description || '',
      dialogue: data.dialogue || null,
      characterId: data.characterId || null,
      characterIds: data.characterIds ? JSON.stringify(data.characterIds) : null,
      duration: data.duration || 3,
      cameraType: data.cameraType || null,
      mood: data.mood || null,
      sceneInfo: data.sceneInfo || null,
      location: data.location || null,
      timeOfDay: data.timeOfDay || null,
      props: propsValue,
      action: data.action || null,
      status: 'empty' as const,
      createdAt: now,
      updatedAt: now,
    };

    console.log(`[createShots] 插入第 ${i + 1}/${shotsData.length} 条分镜，字段数: ${Object.keys(insertData).length}`);

    try {
      await db.insert(shots).values(insertData);
    } catch (error) {
      console.error(`[createShots] 插入第 ${i + 1} 条分镜失败:`, error);
      console.error(`[createShots] 插入数据:`, JSON.stringify(insertData, null, 2));
      throw error;
    }
  }

  console.log(`[createShots] 成功创建 ${ids.length} 个分镜`);
  await touchProject(projectId);
  return ids;
}

/**
 * 更新分镜
 */
export async function updateShot(
  id: string,
  data: Partial<{
    description: string;
    dialogue: string;
    characterId: string;
    characterIds: string[]; // 新增：多角色ID数组
    sceneId: string;
    duration: number;
    cameraType: string;
    mood: string;
    sceneInfo: string;
    location: string;
    timeOfDay: string;
    props: string;
    action: string;
    imagePath: string;
    videoPath: string;
    status: ShotStatus;
  }>
): Promise<void> {
  const db = getDatabase();
  const [shot] = await db.select().from(shots).where(eq(shots.id, id));

  if (!shot) return;

  // 处理 characterIds：如果提供了数组，转换为 JSON 字符串
  const updateData: Record<string, any> = { ...data };
  if (data.characterIds !== undefined) {
    updateData.characterIds = data.characterIds ? JSON.stringify(data.characterIds) : null;
    console.log('[Shot Service] updateShot - 保存 characterIds:', {
      原始数据: data.characterIds,
      JSON转换后: updateData.characterIds,
      shotId: id,
    });
  }

  await db
    .update(shots)
    .set({
      ...updateData,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(shots.id, id));

  console.log('[Shot Service] updateShot - 保存完成:', id);
  await touchProject(shot.projectId);
}

/**
 * 删除分镜
 */
export async function deleteShot(id: string): Promise<void> {
  const db = getDatabase();
  const [shot] = await db.select().from(shots).where(eq(shots.id, id));

  if (!shot) return;

  // 删除关联的文件
  if (shot.imagePath) deleteProjectFile(shot.imagePath);
  if (shot.videoPath) deleteProjectFile(shot.videoPath);

  await db.delete(shots).where(eq(shots.id, id));

  // 重新排序
  await reorderShots(shot.projectId);
  await touchProject(shot.projectId);
}

/**
 * 重新排序分镜
 */
export async function reorderShots(projectId: string): Promise<void> {
  const db = getDatabase();

  const allShots = await db
    .select()
    .from(shots)
    .where(eq(shots.projectId, projectId))
    .orderBy(asc(shots.index));

  for (let i = 0; i < allShots.length; i++) {
    if (allShots[i].index !== i + 1) {
      await db
        .update(shots)
        .set({ index: i + 1 })
        .where(eq(shots.id, allShots[i].id));
    }
  }
}

/**
 * 移动分镜位置
 */
export async function moveShot(id: string, newIndex: number): Promise<void> {
  const db = getDatabase();
  const [shot] = await db.select().from(shots).where(eq(shots.id, id));

  if (!shot) return;

  const allShots = await db
    .select()
    .from(shots)
    .where(eq(shots.projectId, shot.projectId))
    .orderBy(asc(shots.index));

  const currentIndex = allShots.findIndex((s: any) => s.id === id);
  if (currentIndex === -1 || newIndex === currentIndex + 1) return;

  // 移除当前分镜
  allShots.splice(currentIndex, 1);

  // 插入到新位置
  const insertIndex = newIndex > currentIndex + 1 ? newIndex - 2 : newIndex - 1;
  allShots.splice(insertIndex, 0, shot);

  // 更新所有索引
  for (let i = 0; i < allShots.length; i++) {
    await db
      .update(shots)
      .set({ index: i + 1, updatedAt: new Date().toISOString() })
      .where(eq(shots.id, allShots[i].id));
  }

  await touchProject(shot.projectId);
}
