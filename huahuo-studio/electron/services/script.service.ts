import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../database';
import { generateId } from './utils';
import { touchProject } from './project.service';

const { scripts } = schema;

export interface ParsedScriptLine {
  id: string;
  type: 'dialogue' | 'action' | 'narration' | 'direction';
  character?: string;
  content: string;
}

export interface ParsedScript {
  lines: ParsedScriptLine[];
  characters: string[];
  sceneCount: number;
}

/**
 * 获取项目剧本
 */
export async function getScript(projectId: string) {
  const db = getDatabase();
  const [script] = await db.select().from(scripts).where(eq(scripts.projectId, projectId));
  return script || null;
}

/**
 * 更新剧本内容
 */
export async function updateScript(projectId: string, content: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db
    .update(scripts)
    .set({ content, updatedAt: now })
    .where(eq(scripts.projectId, projectId));

  await touchProject(projectId);
}

/**
 * 保存解析后的剧本数据（支持旧格式 ParsedScript 和新格式 Phase1Result）
 */
export async function saveParsedScript(projectId: string, parsedData: any): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db
    .update(scripts)
    .set({
      parsedData: JSON.stringify(parsedData),
      updatedAt: now,
    })
    .where(eq(scripts.projectId, projectId));

  await touchProject(projectId);
}

/**
 * 解析剧本文本（本地规则解析）
 */
export function parseScriptLocally(content: string): ParsedScript {
  const lines: ParsedScriptLine[] = [];
  const characters = new Set<string>();
  let sceneCount = 0;

  const textLines = content.split('\n').filter((line) => line.trim());

  for (const line of textLines) {
    const trimmed = line.trim();
    const id = generateId();

    // 场景指示: [场景] 或 【场景】
    if (/^\[.*\]$|^【.*】$/.test(trimmed)) {
      lines.push({
        id,
        type: 'direction',
        content: trimmed.replace(/^\[|\]$|^【|】$/g, ''),
      });
      sceneCount++;
      continue;
    }

    // 动作描述: （动作） 或 (动作)
    if (/^[（(].*[）)]$/.test(trimmed)) {
      lines.push({
        id,
        type: 'action',
        content: trimmed.replace(/^[（(]|[）)]$/g, ''),
      });
      continue;
    }

    // 旁白: （旁白）内容 或 旁白：内容
    if (/^[（(]旁白[）)]/.test(trimmed) || /^旁白[：:]/.test(trimmed)) {
      lines.push({
        id,
        type: 'narration',
        content: trimmed.replace(/^[（(]旁白[）)]|^旁白[：:]/, '').trim(),
      });
      continue;
    }

    // 对话: 角色名：内容 或 角色名:内容
    const dialogueMatch = trimmed.match(/^([^：:]+)[：:](.+)$/);
    if (dialogueMatch) {
      const characterName = dialogueMatch[1].trim();
      const dialogueContent = dialogueMatch[2].trim();

      characters.add(characterName);

      lines.push({
        id,
        type: 'dialogue',
        character: characterName,
        content: dialogueContent,
      });
      continue;
    }

    // 其他视为描述
    if (trimmed) {
      lines.push({
        id,
        type: 'direction',
        content: trimmed,
      });
    }
  }

  return {
    lines,
    characters: Array.from(characters),
    sceneCount: Math.max(sceneCount, 1),
  };
}
