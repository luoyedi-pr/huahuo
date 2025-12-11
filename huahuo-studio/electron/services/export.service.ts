import { app, dialog, shell } from 'electron';
import { getShots } from './shot.service';
import { getProject } from './project.service';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export interface ExportOptions {
  resolution: '1920x1080' | '1280x720' | '3840x2160';
  fps: 24 | 30 | 60;
  format: 'mp4' | 'webm' | 'mov';
  quality: 'low' | 'medium' | 'high';
}

export interface ExportProgress {
  status: 'preparing' | 'exporting' | 'completed' | 'error';
  progress: number;
  currentShot?: number;
  totalShots?: number;
  message?: string;
  outputPath?: string;
}

type ProgressCallback = (progress: ExportProgress) => void;

/**
 * 获取项目导出预览数据
 */
export async function getExportPreview(projectId: string) {
  const shots = await getShots(projectId);
  const project = await getProject(projectId);

  const clips = shots.map((shot) => ({
    id: shot.id,
    shotIndex: shot.index,
    name: shot.description.substring(0, 20) + (shot.description.length > 20 ? '...' : ''),
    duration: shot.duration || 5,
    hasImage: !!shot.imagePath,
    hasVideo: !!shot.videoPath,
    imagePath: shot.imagePath,
    videoPath: shot.videoPath,
  }));

  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);
  const readyCount = clips.filter((c) => c.hasVideo || c.hasImage).length;
  const videoCount = clips.filter((c) => c.hasVideo).length;
  const imageCount = clips.filter((c) => c.hasImage && !c.hasVideo).length;

  return {
    projectName: project?.name || '未命名项目',
    clips,
    totalDuration,
    readyCount,
    videoCount,
    imageCount,
    totalClips: clips.length,
  };
}

/**
 * 选择导出路径
 */
export async function selectExportPath(projectName: string, format: string): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    title: '选择导出位置',
    defaultPath: path.join(app.getPath('videos'), `${projectName}_export.${format}`),
    filters: [
      { name: 'Video', extensions: [format] },
    ],
  });

  return result.canceled ? null : result.filePath || null;
}

/**
 * 导出视频
 */
export async function exportVideo(
  projectId: string,
  outputPath: string,
  options: ExportOptions,
  onProgress?: ProgressCallback
): Promise<string> {
  const shots = await getShots(projectId);

  if (shots.length === 0) {
    throw new Error('没有可导出的分镜');
  }

  onProgress?.({
    status: 'preparing',
    progress: 0,
    totalShots: shots.length,
    message: '准备导出...',
  });

  // 创建临时文件列表
  const tempDir = path.join(app.getPath('temp'), `huahuo_export_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const fileListPath = path.join(tempDir, 'files.txt');
  const fileListContent: string[] = [];

  // 处理每个分镜
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const duration = shot.duration || 5;

    onProgress?.({
      status: 'preparing',
      progress: Math.round(((i + 1) / shots.length) * 30),
      currentShot: i + 1,
      totalShots: shots.length,
      message: `处理分镜 ${i + 1}/${shots.length}...`,
    });

    if (shot.videoPath && fs.existsSync(shot.videoPath)) {
      // 使用视频文件
      fileListContent.push(`file '${shot.videoPath.replace(/\\/g, '/')}'`);
    } else if (shot.imagePath && fs.existsSync(shot.imagePath)) {
      // 从图片生成视频片段
      const tempVideoPath = path.join(tempDir, `shot_${i}.mp4`);
      await imageToVideo(shot.imagePath, tempVideoPath, duration, options);
      fileListContent.push(`file '${tempVideoPath.replace(/\\/g, '/')}'`);
    } else {
      // 跳过没有素材的分镜
      console.warn(`分镜 ${i + 1} 没有素材，跳过`);
    }
  }

  if (fileListContent.length === 0) {
    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error('没有可用的素材');
  }

  // 写入文件列表
  fs.writeFileSync(fileListPath, fileListContent.join('\n'), 'utf-8');

  onProgress?.({
    status: 'exporting',
    progress: 40,
    message: '合并视频...',
  });

  // 使用 FFmpeg 合并视频
  await concatVideos(fileListPath, outputPath, options, (progress) => {
    onProgress?.({
      status: 'exporting',
      progress: 40 + Math.round(progress * 0.55),
      message: `导出中... ${Math.round(progress)}%`,
    });
  });

  // 清理临时目录
  fs.rmSync(tempDir, { recursive: true, force: true });

  onProgress?.({
    status: 'completed',
    progress: 100,
    message: '导出完成',
    outputPath,
  });

  return outputPath;
}

/**
 * 将图片转换为视频
 */
async function imageToVideo(
  imagePath: string,
  outputPath: string,
  duration: number,
  options: ExportOptions
): Promise<void> {
  const [width, height] = options.resolution.split('x');

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-loop', '1',
      '-i', imagePath,
      '-c:v', 'libx264',
      '-t', String(duration),
      '-pix_fmt', 'yuv420p',
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      '-r', String(options.fps),
      outputPath,
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg 退出码: ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg 错误: ${err.message}`));
    });
  });
}

/**
 * 合并视频文件
 */
async function concatVideos(
  fileListPath: string,
  outputPath: string,
  options: ExportOptions,
  onProgress?: (progress: number) => void
): Promise<void> {
  const [width, height] = options.resolution.split('x');

  // 根据质量设置 CRF 值
  const crfMap = {
    low: '28',
    medium: '23',
    high: '18',
  };

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', fileListPath,
      '-c:v', 'libx264',
      '-crf', crfMap[options.quality],
      '-preset', 'medium',
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      '-r', String(options.fps),
      '-pix_fmt', 'yuv420p',
      outputPath,
    ]);

    let totalDuration = 0;
    let currentTime = 0;

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();

      // 解析总时长
      const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
      if (durationMatch) {
        const [, hours, minutes, seconds] = durationMatch;
        totalDuration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
      }

      // 解析当前进度
      const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);
      if (timeMatch && totalDuration > 0) {
        const [, hours, minutes, seconds] = timeMatch;
        currentTime = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
        const progress = (currentTime / totalDuration) * 100;
        onProgress?.(Math.min(progress, 100));
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg 合并失败，退出码: ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg 错误: ${err.message}`));
    });
  });
}

/**
 * 检查 FFmpeg 是否可用
 */
export async function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);

    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });

    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * 打开导出文件所在目录
 */
export function openExportFolder(filePath: string): void {
  shell.showItemInFolder(filePath);
}
