import { eq, and, inArray } from 'drizzle-orm';
import { getDatabase, schema } from '../database';
import { generateId } from './utils';
import { BrowserWindow } from 'electron';

const { renderTasks, shots } = schema;

export type RenderTaskStatus = 'queued' | 'rendering' | 'completed' | 'error' | 'paused';
export type RenderTaskType = 'image' | 'video';

export interface RenderTaskData {
  id: string;
  projectId: string;
  shotId: string | null;
  type: RenderTaskType;
  status: RenderTaskStatus;
  progress: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  // 关联数据
  shotIndex?: number;
  shotDescription?: string;
}

// 并发配置
const MAX_CONCURRENT_TASKS = 5;

// 渲染队列状态
let activeTaskIds: Set<string> = new Set();
let mainWindow: BrowserWindow | null = null;

/**
 * 设置主窗口引用（用于发送进度更新）
 */
export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

/**
 * 获取项目所有渲染任务
 */
export async function getRenderTasks(projectId: string): Promise<RenderTaskData[]> {
  const db = getDatabase();

  const tasks = await db
    .select()
    .from(renderTasks)
    .where(eq(renderTasks.projectId, projectId));

  const result: RenderTaskData[] = [];

  for (const task of tasks) {
    let shotData = null;
    if (task.shotId) {
      const [shot] = await db.select().from(shots).where(eq(shots.id, task.shotId));
      shotData = shot;
    }

    result.push({
      ...task,
      type: task.type as RenderTaskType,
      status: task.status as RenderTaskStatus,
      shotIndex: shotData?.index,
      shotDescription: shotData?.description,
    });
  }

  return result;
}

/**
 * 创建渲染任务
 */
export async function createRenderTask(data: {
  projectId: string;
  shotId: string;
  type: RenderTaskType;
}): Promise<string> {
  const db = getDatabase();
  const id = generateId();
  const now = new Date().toISOString();

  await db.insert(renderTasks).values({
    id,
    projectId: data.projectId,
    shotId: data.shotId,
    type: data.type,
    status: 'queued',
    progress: 0,
    createdAt: now,
  });

  // 自动开始处理队列
  processQueue();

  return id;
}

/**
 * 批量创建渲染任务
 */
export async function createBatchRenderTasks(data: {
  projectId: string;
  shotIds: string[];
  type: RenderTaskType;
}): Promise<string[]> {
  const db = getDatabase();
  const ids: string[] = [];
  const now = new Date().toISOString();

  // 批量插入任务
  for (const shotId of data.shotIds) {
    const id = generateId();
    await db.insert(renderTasks).values({
      id,
      projectId: data.projectId,
      shotId,
      type: data.type,
      status: 'queued',
      progress: 0,
      createdAt: now,
    });
    ids.push(id);
  }

  // 开始处理队列
  processQueue();

  return ids;
}

/**
 * 更新渲染任务状态
 */
export async function updateRenderTask(
  id: string,
  data: Partial<{
    status: RenderTaskStatus;
    progress: number;
    errorMessage: string;
  }>
): Promise<void> {
  const db = getDatabase();

  const updates: Record<string, unknown> = { ...data };

  if (data.status === 'rendering' && !updates.startedAt) {
    updates.startedAt = new Date().toISOString();
  }
  if (data.status === 'completed' || data.status === 'error') {
    updates.completedAt = new Date().toISOString();
  }

  await db.update(renderTasks).set(updates).where(eq(renderTasks.id, id));

  // 发送进度更新到渲染进程
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [task] = await db.select().from(renderTasks).where(eq(renderTasks.id, id));
    mainWindow.webContents.send('render:progress', task);
  }
}

/**
 * 取消渲染任务
 */
export async function cancelRenderTask(id: string): Promise<void> {
  const db = getDatabase();

  if (activeTaskIds.has(id)) {
    // TODO: 实际取消正在进行的 AI 请求
    activeTaskIds.delete(id);
  }

  await db.delete(renderTasks).where(eq(renderTasks.id, id));
}

/**
 * 暂停渲染任务
 */
export async function pauseRenderTask(id: string): Promise<void> {
  await updateRenderTask(id, { status: 'paused' });
}

/**
 * 恢复渲染任务
 */
export async function resumeRenderTask(id: string): Promise<void> {
  await updateRenderTask(id, { status: 'queued' });
  processQueue();
}

/**
 * 处理单个渲染任务
 */
async function processTask(task: typeof renderTasks.$inferSelect): Promise<void> {
  const taskId = task.id;
  activeTaskIds.add(taskId);

  try {
    await updateRenderTask(taskId, { status: 'rendering', progress: 0 });

    // 动态导入 AI 服务以避免循环依赖
    const aiService = await import('./ai.service');

    if (task.type === 'image') {
      await aiService.generateShotImage(task.shotId!, (progress) => {
        updateRenderTask(taskId, { progress });
      });
    } else {
      await aiService.generateShotVideo(task.shotId!, (progress) => {
        updateRenderTask(taskId, { progress });
      });
    }

    await updateRenderTask(taskId, { status: 'completed', progress: 100 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    await updateRenderTask(taskId, { status: 'error', errorMessage });
  } finally {
    activeTaskIds.delete(taskId);
    // 继续处理队列中的下一个任务
    processQueue();
  }
}

/**
 * 处理渲染队列（支持并发）
 */
async function processQueue(): Promise<void> {
  // 检查是否还有空闲槽位
  if (activeTaskIds.size >= MAX_CONCURRENT_TASKS) {
    return;
  }

  const db = getDatabase();

  // 计算可以启动多少个新任务
  const availableSlots = MAX_CONCURRENT_TASKS - activeTaskIds.size;

  // 获取待处理任务（排除已经在处理中的）
  const queuedTasks = await db
    .select()
    .from(renderTasks)
    .where(eq(renderTasks.status, 'queued'))
    .limit(availableSlots);

  // 过滤掉已经在处理中的任务
  const tasksToProcess = queuedTasks.filter(task => !activeTaskIds.has(task.id));

  if (tasksToProcess.length === 0) {
    return;
  }

  // 并行启动任务（不等待完成）
  for (const task of tasksToProcess) {
    // 使用 void 表示我们故意不等待这个 Promise
    void processTask(task);
  }
}

/**
 * 获取队列状态
 */
export function getQueueStatus() {
  return {
    isProcessing: activeTaskIds.size > 0,
    activeTaskCount: activeTaskIds.size,
    activeTaskIds: Array.from(activeTaskIds),
    maxConcurrent: MAX_CONCURRENT_TASKS,
  };
}

/**
 * 清除所有已完成或错误的任务
 */
export async function clearCompletedTasks(projectId: string): Promise<number> {
  const db = getDatabase();

  const result = await db
    .delete(renderTasks)
    .where(
      and(
        eq(renderTasks.projectId, projectId),
        inArray(renderTasks.status, ['completed', 'error'])
      )
    );

  return result.changes || 0;
}
