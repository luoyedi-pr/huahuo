import { useState, useEffect, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { Toolbar } from '@/components/layout/Toolbar';
import { PixelCard } from '@/components/ui/pixel-card';
import { PixelButton } from '@/components/ui/pixel-button';
import { PixelSelect } from '@/components/ui/pixel-select';
import { IconPlay, IconPause, IconDownload, IconVideo, IconImage, IconFolder, IconWarning, IconCheck } from '@/components/ui/pixel-icons';
import { formatDuration, getLocalFileUrl } from '@/lib/utils';
import { useMessageStore } from '@/stores/message';

interface TimelineClip {
  id: string;
  shotIndex: number;
  name: string;
  duration: number;
  hasImage: boolean;
  hasVideo: boolean;
  imagePath: string | null;
  videoPath: string | null;
}

interface ExportPreview {
  projectName: string;
  clips: TimelineClip[];
  totalDuration: number;
  readyCount: number;
  videoCount: number;
  imageCount: number;
  totalClips: number;
}

interface ExportProgress {
  status: 'preparing' | 'exporting' | 'completed' | 'error';
  progress: number;
  currentShot?: number;
  totalShots?: number;
  message?: string;
  outputPath?: string;
}

interface ExportOptions {
  resolution: '1920x1080' | '1280x720' | '3840x2160';
  fps: 24 | 30 | 60;
  format: 'mp4' | 'webm' | 'mov';
  quality: 'low' | 'medium' | 'high';
}

export default function ProjectExportPage() {
  const { projectId } = useParams({ from: '/project/$projectId' });
  const { showMessage } = useMessageStore();

  // 状态
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [ffmpegAvailable, setFfmpegAvailable] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  // 导出设置
  const [options, setOptions] = useState<ExportOptions>({
    resolution: '1920x1080',
    fps: 30,
    format: 'mp4',
    quality: 'medium',
  });

  // 加载预览数据
  const loadPreview = useCallback(async () => {
    try {
      setLoading(true);
      const result = await window.electron.invoke('export:preview', projectId);
      setPreview(result);
    } catch (error) {
      showMessage('error', `加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, showMessage]);

  // 检查 FFmpeg
  const checkFFmpeg = useCallback(async () => {
    const available = await window.electron.invoke('export:check-ffmpeg');
    setFfmpegAvailable(available);
  }, []);

  useEffect(() => {
    loadPreview();
    checkFFmpeg();
  }, [loadPreview, checkFFmpeg]);

  // 监听导出进度
  useEffect(() => {
    const handleProgress = (...args: unknown[]) => {
      const progress = args[1] as ExportProgress;
      setExportProgress(progress);

      if (progress.status === 'completed') {
        setExporting(false);
        showMessage('success', '视频导出成功！');
      } else if (progress.status === 'error') {
        setExporting(false);
        showMessage('error', progress.message || '导出失败');
      }
    };

    window.electron.on('export:progress', handleProgress);

    return () => {
      window.electron.off('export:progress', handleProgress);
    };
  }, [showMessage]);

  // 模拟播放
  useEffect(() => {
    if (!isPlaying || !preview) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1;
        if (next >= preview.totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, preview]);

  // 导出视频
  const handleExport = async () => {
    if (!preview || !ffmpegAvailable) return;

    try {
      // 选择保存路径
      const outputPath = await window.electron.invoke(
        'export:select-path',
        preview.projectName,
        options.format
      );

      if (!outputPath) return;

      setExporting(true);
      setExportProgress({
        status: 'preparing',
        progress: 0,
        message: '准备导出...',
      });

      await window.electron.invoke('export:video', projectId, outputPath, options);
    } catch (error) {
      setExporting(false);
      showMessage('error', `导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 打开导出目录
  const handleOpenFolder = () => {
    if (exportProgress?.outputPath) {
      window.electron.invoke('export:open-folder', exportProgress.outputPath);
    }
  };

  // 获取当前播放的分镜
  const getCurrentClip = () => {
    if (!preview) return null;
    let accTime = 0;
    for (const clip of preview.clips) {
      if (currentTime >= accTime && currentTime < accTime + clip.duration) {
        return clip;
      }
      accTime += clip.duration;
    }
    return preview.clips[preview.clips.length - 1];
  };

  const currentClip = getCurrentClip();

  // 分辨率选项
  const resolutionOptions = [
    { value: '1280x720', label: '720p (1280×720)' },
    { value: '1920x1080', label: '1080p (1920×1080)' },
    { value: '3840x2160', label: '4K (3840×2160)' },
  ];

  // 帧率选项
  const fpsOptions = [
    { value: '24', label: '24 fps' },
    { value: '30', label: '30 fps' },
    { value: '60', label: '60 fps' },
  ];

  // 格式选项
  const formatOptions = [
    { value: 'mp4', label: 'MP4 (H.264)' },
    { value: 'webm', label: 'WebM (VP9)' },
    { value: 'mov', label: 'MOV (ProRes)' },
  ];

  // 质量选项
  const qualityOptions = [
    { value: 'low', label: '低 (较小文件)' },
    { value: 'medium', label: '中 (推荐)' },
    { value: 'high', label: '高 (最佳质量)' },
  ];

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <Toolbar title="导出" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted">加载中...</p>
        </div>
      </div>
    );
  }

  if (!preview || preview.clips.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <Toolbar title="导出" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <IconVideo size={48} className="text-text-muted" />
          <p className="text-text-muted">没有可导出的分镜</p>
          <p className="text-xs text-text-muted">请先在分镜页面添加内容并生成图像或视频</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Toolbar
        title="导出"
        actions={
          <PixelButton
            variant="primary"
            size="sm"
            leftIcon={<IconDownload size={14} />}
            onClick={handleExport}
            disabled={exporting || !ffmpegAvailable || preview.readyCount === 0}
          >
            {exporting ? '导出中...' : '导出视频'}
          </PixelButton>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 预览区 */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-bg-primary">
          {/* 视频预览区 */}
          <div className="w-full max-w-3xl aspect-video bg-black border-2 border-black shadow-pixel flex items-center justify-center mb-4 relative overflow-hidden">
            {currentClip && currentClip.imagePath ? (
              <img
                src={getLocalFileUrl(currentClip.imagePath) || ''}
                alt={`分镜 ${currentClip.shotIndex}`}
                className="w-full h-full object-contain"
              />
            ) : currentClip && currentClip.videoPath ? (
              <video
                src={getLocalFileUrl(currentClip.videoPath) || ''}
                className="w-full h-full object-contain"
                muted
              />
            ) : (
              <div className="text-center">
                <IconVideo size={48} className="text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">无预览</p>
              </div>
            )}

            {/* 分镜信息叠加 */}
            {currentClip && (
              <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 text-white text-xs">
                #{currentClip.shotIndex} - {currentClip.name}
              </div>
            )}
          </div>

          {/* 播放控制 */}
          <div className="flex items-center gap-4">
            <PixelButton
              variant="primary"
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
            </PixelButton>
            <span className="font-mono text-sm text-text-primary">
              {formatDuration(currentTime)} / {formatDuration(preview.totalDuration)}
            </span>
          </div>

          {/* 导出进度 */}
          {exporting && exportProgress && (
            <PixelCard padding="md" className="mt-4 w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-primary">{exportProgress.message}</span>
                <span className="text-sm text-text-muted">{exportProgress.progress}%</span>
              </div>
              <div className="h-2 bg-bg-tertiary border border-border overflow-hidden">
                <div
                  className="h-full bg-primary-main transition-all duration-300"
                  style={{ width: `${exportProgress.progress}%` }}
                />
              </div>
            </PixelCard>
          )}

          {/* 导出成功 */}
          {exportProgress?.status === 'completed' && exportProgress.outputPath && (
            <PixelCard padding="md" className="mt-4 w-full max-w-md">
              <div className="flex items-center gap-2 text-status-success mb-2">
                <IconCheck size={18} />
                <span className="text-sm">导出成功！</span>
              </div>
              <PixelButton
                variant="ghost"
                size="sm"
                leftIcon={<IconFolder size={14} />}
                onClick={handleOpenFolder}
              >
                打开文件位置
              </PixelButton>
            </PixelCard>
          )}
        </div>

        {/* 设置面板 */}
        <div className="w-80 border-l-2 border-black bg-bg-secondary p-4 overflow-y-auto">
          {/* FFmpeg 警告 */}
          {!ffmpegAvailable && (
            <div className="mb-4 p-3 bg-status-warning/20 border-2 border-status-warning flex items-start gap-2">
              <IconWarning size={18} className="text-status-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-status-warning font-bold mb-1">未检测到 FFmpeg</p>
                <p className="text-xs text-status-warning">请安装 FFmpeg 并添加到系统 PATH 以启用导出功能</p>
              </div>
            </div>
          )}

          <h3 className="font-pixel text-sm text-text-primary mb-4">导出设置</h3>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs text-text-muted mb-1">分辨率</label>
              <PixelSelect
                value={options.resolution}
                onChange={(value: string) => setOptions({ ...options, resolution: value as ExportOptions['resolution'] })}
                options={resolutionOptions}
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">帧率</label>
              <PixelSelect
                value={String(options.fps)}
                onChange={(value: string) => setOptions({ ...options, fps: Number(value) as ExportOptions['fps'] })}
                options={fpsOptions}
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">格式</label>
              <PixelSelect
                value={options.format}
                onChange={(value: string) => setOptions({ ...options, format: value as ExportOptions['format'] })}
                options={formatOptions}
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">质量</label>
              <PixelSelect
                value={options.quality}
                onChange={(value: string) => setOptions({ ...options, quality: value as ExportOptions['quality'] })}
                options={qualityOptions}
              />
            </div>
          </div>

          <PixelCard padding="md" className="mb-4">
            <h4 className="text-xs text-text-muted mb-2">预估信息</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">总时长</span>
                <span className="text-text-primary">{formatDuration(preview.totalDuration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">分镜数</span>
                <span className="text-text-primary">{preview.totalClips}</span>
              </div>
            </div>
          </PixelCard>

          <h3 className="font-pixel text-sm text-text-primary mb-4">素材状态</h3>
          <PixelCard padding="md">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-text-muted">已就绪</span>
              <span className="text-sm text-text-primary">{preview.readyCount} / {preview.totalClips}</span>
            </div>
            <div className="flex justify-between items-center mb-3 text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <IconVideo size={12} /> 视频
              </span>
              <span className="text-text-secondary">{preview.videoCount}</span>
            </div>
            <div className="flex justify-between items-center mb-3 text-xs">
              <span className="text-text-muted flex items-center gap-1">
                <IconImage size={12} /> 仅图像
              </span>
              <span className="text-text-secondary">{preview.imageCount}</span>
            </div>

            <div className="border-t border-border pt-3 mt-3 max-h-40 overflow-y-auto">
              {preview.clips.map((clip) => (
                <div key={clip.id} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-text-secondary truncate flex-1">
                    #{clip.shotIndex} {clip.name}
                  </span>
                  <div className="flex gap-1 ml-2">
                    <div className={`w-4 h-4 flex items-center justify-center ${clip.hasImage ? 'bg-status-success' : 'bg-bg-tertiary'}`}>
                      <IconImage size={10} className={clip.hasImage ? 'text-white' : 'text-text-muted'} />
                    </div>
                    <div className={`w-4 h-4 flex items-center justify-center ${clip.hasVideo ? 'bg-secondary-main' : 'bg-bg-tertiary'}`}>
                      <IconVideo size={10} className={clip.hasVideo ? 'text-bg-primary' : 'text-text-muted'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PixelCard>

          {preview.readyCount < preview.totalClips && (
            <div className="mt-4 p-3 bg-status-warning/20 border-2 border-status-warning">
              <p className="text-xs text-status-warning">
                部分分镜尚未生成视频，导出将使用静态图像填充
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 时间轴 */}
      <div className="h-32 border-t-2 border-black bg-bg-secondary p-4">
        <div className="flex gap-1 h-full">
          {preview.clips.map((clip) => {
            // 计算该 clip 的起始时间
            let startTime = 0;
            for (const c of preview.clips) {
              if (c.id === clip.id) break;
              startTime += c.duration;
            }
            const isActive = currentTime >= startTime && currentTime < startTime + clip.duration;

            return (
              <div
                key={clip.id}
                className={`h-full border-2 border-black flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isActive ? 'bg-primary-light' : 'bg-primary-main'
                } ${!clip.hasVideo && !clip.hasImage ? 'opacity-50' : ''}`}
                style={{ width: `${(clip.duration / preview.totalDuration) * 100}%`, minWidth: '30px' }}
                onClick={() => setCurrentTime(startTime)}
              >
                <span className="text-xs text-white truncate px-1">#{clip.shotIndex}</span>
                <div className="flex gap-0.5 mt-1">
                  {clip.hasImage && <div className="w-2 h-2 bg-status-success" />}
                  {clip.hasVideo && <div className="w-2 h-2 bg-secondary-main" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* 播放进度指示器 */}
        <div className="relative h-1 bg-bg-tertiary mt-2">
          <div
            className="absolute top-0 left-0 h-full bg-accent-main transition-all duration-100"
            style={{ width: `${(currentTime / preview.totalDuration) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
