import { ipcMain } from 'electron';
import {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats,
} from '../services/project.service';
import {
  getScript,
  updateScript,
  saveParsedScript,
  parseScriptLocally,
} from '../services/script.service';
import {
  getCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  addGeneratedAvatar,
  setSelectedAvatar,
  cleanupDuplicateCharacters,
} from '../services/character.service';
import {
  getShots,
  getShot,
  createShot,
  createShots,
  updateShot,
  deleteShot,
  moveShot,
} from '../services/shot.service';
import {
  getScenes,
  getScene,
  createScene,
  createScenes,
  updateScene,
  deleteScene,
  cleanupDuplicateScenes,
} from '../services/scene.service';
import {
  getRenderTasks,
  createRenderTask,
  createBatchRenderTasks,
  updateRenderTask,
  cancelRenderTask,
  pauseRenderTask,
  resumeRenderTask,
  getQueueStatus,
} from '../services/render.service';
import {
  getAllSettings,
  updateSettings,
  getApiConfig,
  getLlmApiConfig,
  getImageApiConfig,
  getVideoApiConfig,
  testApiConnection,
  testLlmConnection,
  testImageConnection,
  testVideoConnection,
  backupDatabase,
  importDatabase,
  getDatabaseInfo,
  getStoragePath,
  selectStoragePath,
  fetchLlmModels,
  fetchImageModels,
  fetchVideoModels,
} from '../services/settings.service';
import {
  generateText,
  generateShotImage,
  generateShotVideo,
  generateCharacterAvatar,
  generateCharacterAppearance,
  generateCharacterViews,
  parseScriptWithAI,
  parseScriptPhase1,
  parseScriptPhase2,
  Phase1Result,
  generateSceneImage,
  getAvailableTextModels,
  getAvailableImageModels,
  getAvailableVideoModels,
  getAvailableAspectRatios,
  getAvailableImageSizes,
} from '../services/ai.service';
import {
  getExportPreview,
  selectExportPath,
  exportVideo,
  checkFFmpeg,
  openExportFolder,
  ExportOptions,
} from '../services/export.service';
import {
  getAllStyles,
  getStyleConfig,
  STYLE_CATEGORIES,
} from '../services/style.service';

/**
 * 注册所有 IPC 处理器
 */
export function registerIpcHandlers() {
  // ==================== 项目管理 ====================

  ipcMain.handle('project:list', async () => {
    return await getAllProjects();
  });

  ipcMain.handle('project:get', async (_, projectId: string) => {
    return await getProject(projectId);
  });

  ipcMain.handle('project:create', async (_, data: { name: string; description?: string; styleId?: string }) => {
    return await createProject(data);
  });

  ipcMain.handle('project:update', async (_, projectId: string, data: any) => {
    await updateProject(projectId, data);
  });

  ipcMain.handle('project:delete', async (_, projectId: string) => {
    await deleteProject(projectId);
  });

  ipcMain.handle('project:stats', async (_, projectId: string) => {
    return await getProjectStats(projectId);
  });

  // ==================== 风格管理 ====================

  ipcMain.handle('style:list', async () => {
    return getAllStyles();
  });

  ipcMain.handle('style:get', async (_, styleId: string) => {
    return getStyleConfig(styleId);
  });

  ipcMain.handle('style:categories', async () => {
    return {
      animation: { name: STYLE_CATEGORIES.animation.name, styles: STYLE_CATEGORIES.animation.styles.map(s => ({ id: s.id, name: s.name, description: s.description })) },
      live_action: { name: STYLE_CATEGORIES.live_action.name, styles: STYLE_CATEGORIES.live_action.styles.map(s => ({ id: s.id, name: s.name, description: s.description })) },
      special: { name: STYLE_CATEGORIES.special.name, styles: STYLE_CATEGORIES.special.styles.map(s => ({ id: s.id, name: s.name, description: s.description })) },
    };
  });

  // ==================== 剧本 ====================

  ipcMain.handle('script:load', async (_, projectId: string) => {
    return await getScript(projectId);
  });

  ipcMain.handle('script:save', async (_, projectId: string, content: string) => {
    await updateScript(projectId, content);
  });

  ipcMain.handle('script:parse-local', async (_, content: string) => {
    return parseScriptLocally(content);
  });

  ipcMain.handle('script:parse-ai', async (_, content: string) => {
    try {
      return await parseScriptWithAI(content);
    } catch (error) {
      throw new Error(`AI 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  // 两阶段解析 - 第一阶段：结构化提取（角色、场景、故事大纲）
  ipcMain.handle('script:parse-phase1', async (_, content: string) => {
    try {
      return await parseScriptPhase1(content);
    } catch (error) {
      throw new Error(`第一阶段解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  // 两阶段解析 - 第二阶段：生成详细分镜
  ipcMain.handle('script:parse-phase2', async (_, content: string, phase1Result: Phase1Result) => {
    try {
      return await parseScriptPhase2(content, phase1Result);
    } catch (error) {
      throw new Error(`第二阶段解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('script:save-parsed', async (_, projectId: string, parsedData: any) => {
    await saveParsedScript(projectId, parsedData);
  });

  // ==================== 角色 ====================

  ipcMain.handle('character:list', async (_, projectId: string) => {
    return await getCharacters(projectId);
  });

  ipcMain.handle('character:get', async (_, characterId: string) => {
    return await getCharacter(characterId);
  });

  ipcMain.handle(
    'character:create',
    async (_, projectId: string, data: { name: string; role?: string; description?: string; appearance?: string }) => {
      return await createCharacter({ projectId, ...data } as any);
    }
  );

  ipcMain.handle('character:update', async (_, characterId: string, data: any) => {
    await updateCharacter(characterId, data);
  });

  ipcMain.handle('character:delete', async (_, characterId: string) => {
    await deleteCharacter(characterId);
  });

  ipcMain.handle('character:generate-avatar', async (event, characterId: string) => {
    try {
      const avatarPath = await generateCharacterAvatar(characterId, (progress) => {
        event.sender.send('ai:progress', { taskType: 'avatar', progress });
      });
      return avatarPath;
    } catch (error) {
      throw new Error(`头像生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('character:generate-appearance', async (event, characterId: string) => {
    try {
      const appearance = await generateCharacterAppearance(characterId, (progress) => {
        event.sender.send('ai:progress', { taskType: 'appearance', progress });
      });
      // 自动更新角色的外貌特征
      await updateCharacter(characterId, { appearance });
      return appearance;
    } catch (error) {
      throw new Error(`外貌特征生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('character:generate-views', async (event, characterId: string) => {
    try {
      const views = await generateCharacterViews(characterId, (progress) => {
        event.sender.send('ai:progress', { taskType: 'views', progress });
      });
      // 将三视图添加到角色的生成头像列表
      await addGeneratedAvatar(characterId, views.front);
      await addGeneratedAvatar(characterId, views.side);
      await addGeneratedAvatar(characterId, views.back);
      // 设置正面图为默认头像
      await setSelectedAvatar(characterId, views.front);
      return views;
    } catch (error) {
      throw new Error(`三视图生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('character:add-avatar', async (_, characterId: string, avatarPath: string) => {
    await addGeneratedAvatar(characterId, avatarPath);
  });

  ipcMain.handle('character:set-avatar', async (_, characterId: string, avatarPath: string) => {
    await setSelectedAvatar(characterId, avatarPath);
  });

  ipcMain.handle('character:cleanup-duplicates', async (_, projectId: string) => {
    return await cleanupDuplicateCharacters(projectId);
  });

  // ==================== 场景 ====================

  ipcMain.handle('scene:list', async (_, projectId: string) => {
    return await getScenes(projectId);
  });

  ipcMain.handle('scene:get', async (_, sceneId: string) => {
    return await getScene(sceneId);
  });

  ipcMain.handle('scene:create', async (_, projectId: string, data: any) => {
    return await createScene({ projectId, ...data });
  });

  ipcMain.handle('scene:create-batch', async (_, projectId: string, scenesData: any[]) => {
    return await createScenes(projectId, scenesData);
  });

  ipcMain.handle('scene:update', async (_, sceneId: string, data: any) => {
    await updateScene(sceneId, data);
  });

  ipcMain.handle('scene:delete', async (_, sceneId: string) => {
    await deleteScene(sceneId);
  });

  ipcMain.handle('scene:cleanup-duplicates', async (_, projectId: string) => {
    return await cleanupDuplicateScenes(projectId);
  });

  ipcMain.handle('scene:generate-image', async (event, sceneId: string) => {
    const scene = await getScene(sceneId);
    if (!scene) throw new Error('场景不存在');

    const imagePath = await generateSceneImage(
      scene.projectId,
      {
        id: scene.id,
        name: scene.name,
        sceneInfo: scene.sceneInfo || '',
        location: scene.location || '',
        timeOfDay: scene.timeOfDay || '白天',
        interior: scene.interior,
        description: scene.description || '',
        props: scene.props || '',
        lighting: scene.lighting || '',
        atmosphere: scene.atmosphere || '',
      },
      undefined,
      (progress) => {
        event.sender.send('ai:progress', { progress });
      }
    );

    // 更新场景的图片路径
    await updateScene(sceneId, { imagePath });

    return imagePath;
  });

  // 批量生成所有场景图片（串行处理，避免 API 限流）
  ipcMain.handle('scene:generate-all-images', async (event, projectId: string, regenerateAll: boolean = false) => {
    const allScenes = await getScenes(projectId);

    // 根据参数决定生成策略
    const scenesToGenerate = regenerateAll
      ? allScenes.filter(scene => scene.description) // 有描述的全部重新生成
      : allScenes.filter(scene => scene.description && !scene.imagePath); // 只生成没有图片的

    if (scenesToGenerate.length === 0) {
      return { generated: 0, skipped: allScenes.length, errors: 0, message: '没有需要生成的场景' };
    }

    // 使用最多2个并发处理，避免 API 限流
    const MAX_CONCURRENT = 2;
    let completed = 0;
    let errors = 0;
    const total = scenesToGenerate.length;

    // 发送初始进度
    event.sender.send('scene:batch-progress', {
      total,
      completed: 0,
      errors: 0,
      current: null,
    });

    // 处理单个场景
    const processScene = async (scene: typeof allScenes[0]) => {
      try {
        event.sender.send('scene:batch-progress', {
          total,
          completed,
          errors,
          current: scene.name,
        });

        const imagePath = await generateSceneImage(
          projectId,
          {
            id: scene.id,
            name: scene.name,
            sceneInfo: scene.sceneInfo || '',
            location: scene.location || '',
            timeOfDay: scene.timeOfDay || '白天',
            interior: scene.interior,
            description: scene.description || '',
            props: scene.props || '',
            lighting: scene.lighting || '',
            atmosphere: scene.atmosphere || '',
          },
          undefined,
          () => {} // 单个场景的进度不发送
        );

        await updateScene(scene.id, { imagePath });
        completed++;
      } catch (error) {
        console.error(`Scene "${scene.name}" generation failed:`, error);
        errors++;
      }

      event.sender.send('scene:batch-progress', {
        total,
        completed,
        errors,
        current: null,
      });
    };

    // 使用并发池处理（最多2个同时）
    const pool: Promise<void>[] = [];
    for (let i = 0; i < scenesToGenerate.length; i++) {
      const scene = scenesToGenerate[i];
      const task = processScene(scene);
      pool.push(task);

      // 如果池满了，等待一个完成
      if (pool.length >= MAX_CONCURRENT) {
        await Promise.race(pool);
        // 移除已完成的任务
        const newPool: Promise<void>[] = [];
        for (const p of pool) {
          const status = await Promise.race([p.then(() => 'done' as const), Promise.resolve('pending' as const)]);
          if (status === 'pending') {
            newPool.push(p);
          }
        }
        pool.length = 0;
        pool.push(...newPool);
      }
    }

    // 等待所有剩余任务完成
    await Promise.all(pool);

    return {
      generated: completed,
      skipped: allScenes.length - scenesToGenerate.length,
      errors,
      message: `成功生成 ${completed} 个场景，${errors} 个失败`,
    };
  });

  // ==================== 分镜 ====================

  ipcMain.handle('storyboard:list', async (_, projectId: string) => {
    return await getShots(projectId);
  });

  ipcMain.handle('storyboard:get', async (_, shotId: string) => {
    return await getShot(shotId);
  });

  ipcMain.handle(
    'storyboard:create',
    async (
      _,
      projectId: string,
      data: {
        index?: number;
        description: string;
        dialogue?: string;
        characterId?: string;
        characterIds?: string[];
        sceneId?: string;
        duration?: number;
        cameraType?: string;
        mood?: string;
        sceneInfo?: string;
        location?: string;
        timeOfDay?: string;
        props?: string;
        action?: string;
      }
    ) => {
      return await createShot({ projectId, index: data.index || 0, ...data });
    }
  );

  ipcMain.handle('storyboard:create-batch', async (_, projectId: string, shotsData: any[]) => {
    return await createShots(projectId, shotsData);
  });

  ipcMain.handle('storyboard:update', async (_, shotId: string, data: any) => {
    await updateShot(shotId, data);
  });

  ipcMain.handle('storyboard:delete', async (_, shotId: string) => {
    await deleteShot(shotId);
  });

  ipcMain.handle('storyboard:move', async (_, shotId: string, newIndex: number) => {
    await moveShot(shotId, newIndex);
  });

  ipcMain.handle('storyboard:generate-image', async (event, shotId: string) => {
    try {
      const imagePath = await generateShotImage(shotId, (progress) => {
        event.sender.send('render:progress', { type: 'image', shotId, progress });
      });
      return imagePath;
    } catch (error) {
      throw new Error(`图像生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  // 批量生成所有分镜图片（并发处理，最多5个同时）
  ipcMain.handle('storyboard:generate-all-images', async (event, projectId: string, regenerateAll: boolean = false) => {
    const allShots = await getShots(projectId);

    // 根据参数决定生成策略
    const shotsToGenerate = regenerateAll
      ? allShots.filter(shot => shot.description) // 有描述的全部重新生成
      : allShots.filter(shot => shot.description && !shot.imagePath); // 只生成没有图片的

    if (shotsToGenerate.length === 0) {
      return { generated: 0, skipped: allShots.length, errors: 0, message: '没有需要生成的分镜' };
    }

    const MAX_CONCURRENT = 5;
    let completed = 0;
    let errors = 0;
    const total = shotsToGenerate.length;

    // 发送初始进度
    event.sender.send('storyboard:batch-progress', {
      total,
      completed: 0,
      errors: 0,
      current: null,
    });

    // 并发控制器
    const processShot = async (shot: typeof allShots[0]) => {
      try {
        event.sender.send('storyboard:batch-progress', {
          total,
          completed,
          errors,
          current: `分镜 #${shot.index}`,
        });

        await generateShotImage(shot.id, () => {}); // 单个分镜的进度不发送
        completed++;
      } catch (error) {
        console.error(`分镜 #${shot.index} 生成失败:`, error);
        errors++;
      }

      event.sender.send('storyboard:batch-progress', {
        total,
        completed,
        errors,
        current: null,
      });
    };

    // 使用并发池处理
    const pool: Promise<void>[] = [];
    for (const shot of shotsToGenerate) {
      const task = processShot(shot);
      pool.push(task);

      // 如果池满了，等待一个完成
      if (pool.length >= MAX_CONCURRENT) {
        await Promise.race(pool);
        // 移除已完成的任务
        for (let i = pool.length - 1; i >= 0; i--) {
          const status = await Promise.race([pool[i].then(() => 'done'), Promise.resolve('pending')]);
          if (status === 'done') {
            pool.splice(i, 1);
          }
        }
      }
    }

    // 等待所有剩余任务完成
    await Promise.all(pool);

    return {
      generated: completed,
      skipped: allShots.length - shotsToGenerate.length,
      errors,
      message: `成功生成 ${completed} 个分镜，${errors} 个失败`,
    };
  });

  // ==================== 渲染 ====================

  ipcMain.handle('render:list', async (_, projectId: string) => {
    return await getRenderTasks(projectId);
  });

  ipcMain.handle('render:create', async (_, projectId: string, shotId: string, type: 'image' | 'video') => {
    return await createRenderTask({ projectId, shotId, type });
  });

  ipcMain.handle('render:create-batch', async (_, projectId: string, shotIds: string[], type: 'image' | 'video') => {
    return await createBatchRenderTasks({ projectId, shotIds, type });
  });

  ipcMain.handle('render:update', async (_, taskId: string, data: any) => {
    await updateRenderTask(taskId, data);
  });

  ipcMain.handle('render:cancel', async (_, taskId: string) => {
    await cancelRenderTask(taskId);
  });

  ipcMain.handle('render:pause', async (_, taskId: string) => {
    await pauseRenderTask(taskId);
  });

  ipcMain.handle('render:resume', async (_, taskId: string) => {
    await resumeRenderTask(taskId);
  });

  ipcMain.handle('render:status', () => {
    return getQueueStatus();
  });

  // ==================== 设置 ====================

  ipcMain.handle('settings:get', async () => {
    return await getAllSettings();
  });

  ipcMain.handle('settings:update', async (_, updates: any) => {
    await updateSettings(updates);
  });

  ipcMain.handle('settings:get-api-config', async () => {
    return await getApiConfig();
  });

  ipcMain.handle('settings:test-connection', async () => {
    return await testApiConnection();
  });

  ipcMain.handle('settings:test-llm-connection', async () => {
    return await testLlmConnection();
  });

  ipcMain.handle('settings:test-image-connection', async () => {
    return await testImageConnection();
  });

  ipcMain.handle('settings:test-video-connection', async () => {
    return await testVideoConnection();
  });

  ipcMain.handle('settings:get-llm-config', async () => {
    return await getLlmApiConfig();
  });

  ipcMain.handle('settings:get-image-config', async () => {
    return await getImageApiConfig();
  });

  ipcMain.handle('settings:get-video-config', async () => {
    return await getVideoApiConfig();
  });

  ipcMain.handle('settings:backup-database', async () => {
    return await backupDatabase();
  });

  ipcMain.handle('settings:import-database', async () => {
    return await importDatabase();
  });

  ipcMain.handle('settings:get-database-info', () => {
    return getDatabaseInfo();
  });

  ipcMain.handle('settings:get-text-models', () => {
    return getAvailableTextModels();
  });

  ipcMain.handle('settings:get-image-models', () => {
    return getAvailableImageModels();
  });

  ipcMain.handle('settings:get-video-models', () => {
    return getAvailableVideoModels();
  });

  ipcMain.handle('settings:get-aspect-ratios', () => {
    return getAvailableAspectRatios();
  });

  ipcMain.handle('settings:get-image-sizes', () => {
    return getAvailableImageSizes();
  });

  // 动态获取模型列表
  ipcMain.handle('settings:fetch-llm-models', async () => {
    return await fetchLlmModels();
  });

  ipcMain.handle('settings:fetch-image-models', async () => {
    return await fetchImageModels();
  });

  ipcMain.handle('settings:fetch-video-models', async () => {
    return await fetchVideoModels();
  });

  ipcMain.handle('settings:get-storage-path', async () => {
    return await getStoragePath();
  });

  ipcMain.handle('settings:select-storage-path', async () => {
    return await selectStoragePath();
  });

  // ==================== AI 服务 ====================

  ipcMain.handle('ai:generate-text', async (_, prompt: string, systemPrompt?: string) => {
    try {
      return await generateText(prompt, systemPrompt);
    } catch (error) {
      throw new Error(`文本生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('ai:generate-image', async (event, shotId: string) => {
    try {
      const imagePath = await generateShotImage(shotId, (progress) => {
        event.sender.send('ai:progress', { taskType: 'image', shotId, progress });
      });
      return imagePath;
    } catch (error) {
      throw new Error(`图像生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('ai:edit-image', async (event, shotId: string, prompt: string) => {
    try {
      const imagePath = await import('../services/ai.service').then(m => m.editShotImage(shotId, prompt, (progress) => {
        event.sender.send('ai:progress', { taskType: 'image-edit', shotId, progress });
      }));
      return imagePath;
    } catch (error) {
      throw new Error(`图像编辑失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('ai:edit-scene-image', async (event, sceneId: string, prompt: string) => {
    try {
      const imagePath = await import('../services/ai.service').then(m => m.editSceneImage(sceneId, prompt, (progress) => {
        event.sender.send('ai:progress', { taskType: 'scene-image-edit', sceneId, progress });
      }));
      return imagePath;
    } catch (error) {
      throw new Error(`场景图像编辑失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('ai:generate-video', async (event, shotId: string) => {
    try {
      const videoPath = await generateShotVideo(shotId, (progress) => {
        event.sender.send('ai:progress', { taskType: 'video', shotId, progress });
      });
      return videoPath;
    } catch (error) {
      throw new Error(`视频生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  // ==================== 导出 ====================

  ipcMain.handle('export:preview', async (_, projectId: string) => {
    return await getExportPreview(projectId);
  });

  ipcMain.handle('export:select-path', async (_, projectName: string, format: string) => {
    return await selectExportPath(projectName, format);
  });

  ipcMain.handle('export:video', async (event, projectId: string, outputPath: string, options: ExportOptions) => {
    try {
      const result = await exportVideo(projectId, outputPath, options, (progress) => {
        event.sender.send('export:progress', progress);
      });
      return result;
    } catch (error) {
      throw new Error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('export:check-ffmpeg', async () => {
    return await checkFFmpeg();
  });

  ipcMain.handle('export:open-folder', (_, filePath: string) => {
    openExportFolder(filePath);
  });

  // ==================== 文件操作 ====================

  ipcMain.handle('file:select', async (_, options?: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
  }) => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      title: options?.title || '选择文件',
      filters: options?.filters || [{ name: '所有文件', extensions: ['*'] }],
      properties: options?.properties || ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return { path: result.filePaths[0], paths: result.filePaths };
  });

  ipcMain.handle('file:read', async (_, filePath: string) => {
    const fs = require('fs');
    try {
      // 读取原始二进制数据
      const buffer = fs.readFileSync(filePath);

      // 尝试检测编码并解码
      let content: string;

      // 检查 BOM 标记
      if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        // UTF-8 with BOM
        content = buffer.toString('utf-8').slice(1);
      } else if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        // UTF-16 LE
        content = buffer.toString('utf16le').slice(1);
      } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        // UTF-16 BE
        content = buffer.swap16().toString('utf16le').slice(1);
      } else {
        // 尝试 UTF-8 解码
        const utf8Content = buffer.toString('utf-8');

        // 检查是否有乱码（通过检测替换字符或无效序列）
        const hasInvalidUtf8 = utf8Content.includes('\uFFFD') ||
          /[\x80-\xFF]/.test(utf8Content) && !/[\u4e00-\u9fff]/.test(utf8Content);

        if (hasInvalidUtf8) {
          // 可能是 GBK/GB2312 编码，尝试使用 iconv-lite 解码
          try {
            const iconv = require('iconv-lite');
            content = iconv.decode(buffer, 'gbk');
          } catch {
            // 如果 iconv-lite 不可用，回退到 UTF-8
            content = utf8Content;
          }
        } else {
          content = utf8Content;
        }
      }

      return content;
    } catch (error) {
      throw new Error(`读取文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('file:write', async (_, filePath: string, content: string) => {
    const fs = require('fs');
    const path = require('path');
    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      throw new Error(`写入文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  ipcMain.handle('file:save-dialog', async (_, options?: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => {
    const { dialog } = require('electron');
    const result = await dialog.showSaveDialog({
      title: options?.title || '保存文件',
      defaultPath: options?.defaultPath,
      filters: options?.filters || [{ name: '所有文件', extensions: ['*'] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return { path: result.filePath };
  });
}
