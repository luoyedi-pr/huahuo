import { eq, asc, and } from 'drizzle-orm';
import { getDatabase, schema } from '../database';
import { generateId, deleteProjectFile } from './utils';
import { touchProject } from './project.service';

const { characters } = schema;

export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting';

export interface CharacterData {
  id: string;
  projectId: string;
  name: string;
  role: CharacterRole;
  description: string | null;
  appearance: string | null;
  avatarPath: string | null;
  generatedAvatars: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取项目所有角色
 */
export async function getCharacters(projectId: string): Promise<CharacterData[]> {
  const db = getDatabase();

  const result = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId))
    .orderBy(asc(characters.createdAt));

  return result.map((char: any) => ({
    ...char,
    role: char.role as CharacterRole,
    generatedAvatars: char.generatedAvatars ? JSON.parse(char.generatedAvatars) : [],
  }));
}

/**
 * 获取单个角色
 */
export async function getCharacter(id: string): Promise<CharacterData | null> {
  const db = getDatabase();
  const [char] = await db.select().from(characters).where(eq(characters.id, id));

  if (!char) return null;

  return {
    ...char,
    role: char.role as CharacterRole,
    generatedAvatars: char.generatedAvatars ? JSON.parse(char.generatedAvatars) : [],
  };
}

/**
 * 创建角色（如果同名角色已存在则返回已有角色ID）
 */
export async function createCharacter(data: {
  projectId: string;
  name: string;
  role?: CharacterRole;
  description?: string;
  appearance?: string;
}): Promise<string> {
  const db = getDatabase();

  console.log(`[createCharacter] 尝试创建角色: ${data.name}, projectId: ${data.projectId}`);

  // 检查是否已存在同名角色（使用精确匹配）
  const existingList = await db
    .select()
    .from(characters)
    .where(and(eq(characters.projectId, data.projectId), eq(characters.name, data.name)));

  console.log(`[createCharacter] 查找结果: 找到 ${existingList.length} 个同名角色`);

  if (existingList.length > 0) {
    const existing = existingList[0];
    console.log(`[createCharacter] 角色 "${data.name}" 已存在，ID: ${existing.id}，返回已有ID`);

    // 如果已存在，更新信息（如果新信息更完整）
    let needsUpdate = false;
    const updateData: any = { updatedAt: new Date().toISOString() };

    if (data.appearance && !existing.appearance) {
      updateData.appearance = data.appearance;
      needsUpdate = true;
    }
    if (data.description && !existing.description) {
      updateData.description = data.description;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await db
        .update(characters)
        .set(updateData)
        .where(eq(characters.id, existing.id));
      console.log(`[createCharacter] 更新了角色 "${data.name}" 的信息`);
    }

    return existing.id;
  }

  // 创建新角色
  const id = generateId();
  const now = new Date().toISOString();

  console.log(`[createCharacter] 创建新角色 "${data.name}"，ID: ${id}`);

  await db.insert(characters).values({
    id,
    projectId: data.projectId,
    name: data.name,
    role: data.role || 'supporting',
    description: data.description || null,
    appearance: data.appearance || null,
    createdAt: now,
    updatedAt: now,
  });

  await touchProject(data.projectId);
  return id;
}

/**
 * 更新角色
 */
export async function updateCharacter(
  id: string,
  data: Partial<{
    name: string;
    role: CharacterRole;
    description: string;
    appearance: string;
    avatarPath: string;
  }>
): Promise<void> {
  const db = getDatabase();
  const [char] = await db.select().from(characters).where(eq(characters.id, id));

  if (!char) return;

  await db
    .update(characters)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(characters.id, id));

  await touchProject(char.projectId);
}

/**
 * 删除角色
 */
export async function deleteCharacter(id: string): Promise<void> {
  const db = getDatabase();
  const [char] = await db.select().from(characters).where(eq(characters.id, id));

  if (!char) return;

  // 删除关联的头像文件
  if (char.avatarPath) {
    deleteProjectFile(char.avatarPath);
  }
  if (char.generatedAvatars) {
    const avatars = JSON.parse(char.generatedAvatars);
    avatars.forEach((path: string) => deleteProjectFile(path));
  }

  await db.delete(characters).where(eq(characters.id, id));
  await touchProject(char.projectId);
}

/**
 * 添加生成的头像
 */
export async function addGeneratedAvatar(id: string, avatarPath: string): Promise<void> {
  const db = getDatabase();
  const [char] = await db.select().from(characters).where(eq(characters.id, id));

  if (!char) return;

  const avatars = char.generatedAvatars ? JSON.parse(char.generatedAvatars) : [];
  avatars.push(avatarPath);

  await db
    .update(characters)
    .set({
      generatedAvatars: JSON.stringify(avatars),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(characters.id, id));

  await touchProject(char.projectId);
}

/**
 * 设置选中的头像
 */
export async function setSelectedAvatar(id: string, avatarPath: string): Promise<void> {
  const db = getDatabase();
  const [char] = await db.select().from(characters).where(eq(characters.id, id));

  if (!char) return;

  await db
    .update(characters)
    .set({
      avatarPath,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(characters.id, id));

  await touchProject(char.projectId);
}

/**
 * 清理项目中的重复角色
 * 保留最早创建的角色，删除后续重复的
 */
export async function cleanupDuplicateCharacters(projectId: string): Promise<number> {
  const db = getDatabase();

  // 获取项目所有角色
  const allCharacters = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId))
    .orderBy(asc(characters.createdAt));

  // 按名字分组
  const nameMap = new Map<string, typeof allCharacters>();
  for (const char of allCharacters) {
    const existing = nameMap.get(char.name) || [];
    existing.push(char);
    nameMap.set(char.name, existing);
  }

  // 找出重复的角色并删除（保留第一个）
  let deletedCount = 0;
  for (const [name, chars] of nameMap.entries()) {
    if (chars.length > 1) {
      console.log(`[cleanupDuplicateCharacters] 发现重复角色 "${name}"，共 ${chars.length} 个，保留第一个`);
      // 保留第一个（最早创建的），删除其余的
      for (let i = 1; i < chars.length; i++) {
        const charToDelete = chars[i];
        // 删除关联的头像文件
        if (charToDelete.avatarPath) {
          deleteProjectFile(charToDelete.avatarPath);
        }
        if (charToDelete.generatedAvatars) {
          const avatars = JSON.parse(charToDelete.generatedAvatars);
          avatars.forEach((path: string) => deleteProjectFile(path));
        }
        await db.delete(characters).where(eq(characters.id, charToDelete.id));
        deletedCount++;
      }
    }
  }

  if (deletedCount > 0) {
    await touchProject(projectId);
    console.log(`[cleanupDuplicateCharacters] 共删除 ${deletedCount} 个重复角色`);
  }

  return deletedCount;
}
