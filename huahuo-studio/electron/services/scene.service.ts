import { eq, asc, and } from 'drizzle-orm';
import { getDatabase, schema } from '../database';
import { generateId, deleteProjectFile } from './utils';
import { touchProject } from './project.service';

const { scenes } = schema;

export interface SceneData {
  id: string;
  projectId: string;
  name: string;
  sceneInfo: string | null;
  location: string | null;
  timeOfDay: string | null;
  interior: boolean;
  description: string | null;
  props: string | null;
  lighting: string | null;
  atmosphere: string | null;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取项目所有场景
 */
export async function getScenes(projectId: string): Promise<SceneData[]> {
  const db = getDatabase();

  const result = await db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(asc(scenes.createdAt));

  return result.map((scene: any) => ({
    ...scene,
    interior: scene.interior ?? true,
  }));
}

/**
 * 获取单个场景
 */
export async function getScene(id: string): Promise<SceneData | null> {
  const db = getDatabase();
  const [scene] = await db.select().from(scenes).where(eq(scenes.id, id));

  if (!scene) return null;

  return {
    ...scene,
    interior: scene.interior ?? true,
  };
}

/**
 * 根据场景信息查找场景
 */
export async function findSceneByInfo(projectId: string, sceneInfo: string): Promise<SceneData | null> {
  const db = getDatabase();
  const [scene] = await db
    .select()
    .from(scenes)
    .where(and(eq(scenes.projectId, projectId), eq(scenes.sceneInfo, sceneInfo)));

  if (!scene) return null;

  return {
    ...scene,
    interior: scene.interior ?? true,
  };
}

/**
 * 创建场景（如果同名场景已存在则返回已有场景ID）
 */
export async function createScene(data: {
  projectId: string;
  name: string;
  sceneInfo?: string;
  location?: string;
  timeOfDay?: string;
  interior?: boolean;
  description?: string;
  props?: string;
  lighting?: string;
  atmosphere?: string;
}): Promise<string> {
  const db = getDatabase();

  console.log(`[createScene] 尝试创建场景: ${data.name}, projectId: ${data.projectId}`);

  // 检查是否已存在相同场景信息的场景
  if (data.sceneInfo) {
    const existing = await findSceneByInfo(data.projectId, data.sceneInfo);
    if (existing) {
      console.log(`[createScene] 场景 "${data.sceneInfo}" 已存在，ID: ${existing.id}`);

      // 更新更详细的信息
      let needsUpdate = false;
      const updateData: any = { updatedAt: new Date().toISOString() };

      if (data.description && (!existing.description || data.description.length > existing.description.length)) {
        updateData.description = data.description;
        needsUpdate = true;
      }
      if (data.props && !existing.props) {
        updateData.props = data.props;
        needsUpdate = true;
      }
      if (data.lighting && !existing.lighting) {
        updateData.lighting = data.lighting;
        needsUpdate = true;
      }
      if (data.atmosphere && !existing.atmosphere) {
        updateData.atmosphere = data.atmosphere;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db
          .update(scenes)
          .set(updateData)
          .where(eq(scenes.id, existing.id));
        console.log(`[createScene] 更新了场景 "${data.sceneInfo}" 的信息`);
      }

      return existing.id;
    }
  }

  // 创建新场景
  const id = generateId();
  const now = new Date().toISOString();

  console.log(`[createScene] 创建新场景 "${data.name}"，ID: ${id}`);

  // 使用原始 SQL 插入，绕过 Drizzle 可能存在的问题
  try {
    const { getSqlite } = await import('../database');
    const sqlite = getSqlite();
    
    if (sqlite) {
      const stmt = sqlite.prepare(`
        INSERT INTO scenes (id, project_id, name, scene_info, location, time_of_day, interior, description, props, lighting, atmosphere, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const propsStr = data.props ? (typeof data.props === 'string' ? data.props : JSON.stringify(data.props)) : null;

      stmt.run(
        id,
        data.projectId,
        data.name,
        data.sceneInfo || null,
        data.location || null,
        data.timeOfDay || null,
        (data.interior ?? true) ? 1 : 0,
        data.description || null,
        propsStr,
        data.lighting || null,
        data.atmosphere || null,
        now,
        now
      );
      console.log(`[createScene] SQL 插入成功`);
    } else {
      throw new Error('Database instance not found (getSqlite returned null)');
    }
  } catch (error: any) {
    console.error(`[createScene] SQL 插入失败:`, error);
    throw error; // 直接抛出原始错误，不再降级到 Drizzle，以便排查根本原因
  }

  await touchProject(data.projectId);
  return id;
}

/**
 * 批量创建场景
 */
export async function createScenes(
  projectId: string,
  scenesData: Array<{
    name: string;
    sceneInfo?: string;
    location?: string;
    timeOfDay?: string;
    interior?: boolean;
    description?: string;
    props?: string;
    lighting?: string;
    atmosphere?: string;
  }>
): Promise<Map<string, string>> {
  const sceneMap = new Map<string, string>(); // sceneInfo -> sceneId

  console.log(`[createScenes] 开始创建 ${scenesData.length} 个场景`);

  for (const data of scenesData) {
    try {
      const sceneId = await createScene({
        projectId,
        ...data,
      });
      if (data.sceneInfo) {
        sceneMap.set(data.sceneInfo, sceneId);
      }
    } catch (error) {
      console.error(`[createScenes] 创建场景 "${data.name}" 失败:`, error);
    }
  }

  console.log(`[createScenes] 成功创建/更新 ${sceneMap.size} 个场景`);
  return sceneMap;
}

/**
 * 更新场景
 */
export async function updateScene(
  id: string,
  data: Partial<{
    name: string;
    sceneInfo: string;
    location: string;
    timeOfDay: string;
    interior: boolean;
    description: string;
    props: string;
    lighting: string;
    atmosphere: string;
    imagePath: string;
  }>
): Promise<void> {
  const db = getDatabase();
  const [scene] = await db.select().from(scenes).where(eq(scenes.id, id));

  if (!scene) return;

  await db
    .update(scenes)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(scenes.id, id));

  await touchProject(scene.projectId);
}

/**
 * 删除场景
 */
export async function deleteScene(id: string): Promise<void> {
  const db = getDatabase();
  const [scene] = await db.select().from(scenes).where(eq(scenes.id, id));

  if (!scene) return;

  // 删除关联的图片文件
  if (scene.imagePath) {
    deleteProjectFile(scene.imagePath);
  }

  await db.delete(scenes).where(eq(scenes.id, id));
  await touchProject(scene.projectId);
}

/**
 * 清理项目中的重复场景
 * 保留最早创建的场景，删除后续重复的
 */
export async function cleanupDuplicateScenes(projectId: string): Promise<number> {
  const db = getDatabase();

  // 获取项目所有场景
  const allScenes = await db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(asc(scenes.createdAt));

  // 按 sceneInfo 分组
  const infoMap = new Map<string, typeof allScenes>();
  for (const scene of allScenes) {
    if (scene.sceneInfo) {
      const existing = infoMap.get(scene.sceneInfo) || [];
      existing.push(scene);
      infoMap.set(scene.sceneInfo, existing);
    }
  }

  // 找出重复的场景并删除（保留第一个）
  let deletedCount = 0;
  for (const [info, sceneList] of infoMap.entries()) {
    if (sceneList.length > 1) {
      console.log(`[cleanupDuplicateScenes] 发现重复场景 "${info}"，共 ${sceneList.length} 个，保留第一个`);
      // 保留第一个（最早创建的），删除其余的
      for (let i = 1; i < sceneList.length; i++) {
        const sceneToDelete = sceneList[i];
        // 删除关联的图片文件
        if (sceneToDelete.imagePath) {
          deleteProjectFile(sceneToDelete.imagePath);
        }
        await db.delete(scenes).where(eq(scenes.id, sceneToDelete.id));
        deletedCount++;
      }
    }
  }

  if (deletedCount > 0) {
    await touchProject(projectId);
    console.log(`[cleanupDuplicateScenes] 共删除 ${deletedCount} 个重复场景`);
  }

  return deletedCount;
}
