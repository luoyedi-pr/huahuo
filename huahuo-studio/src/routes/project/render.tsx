import { useState, useEffect, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { Toolbar } from '@/components/layout/Toolbar';
import { PageContainer, PageHeader } from '@/components/layout/AppLayout';
import { PixelCard } from '@/components/ui/pixel-card';
import { PixelButton } from '@/components/ui/pixel-button';
import { PixelProgress } from '@/components/ui/pixel-progress';
import { PixelBadge } from '@/components/ui/pixel-badge';
import { PixelLoading } from '@/components/ui/pixel-loading';
import {
  IconPlay, IconPause, IconTrash, IconRefresh,
  IconCheck, IconWarning, IconVideo, IconBolt, IconImage,
} from '@/components/ui/pixel-icons';
import { cn } from '@/lib/utils';

interface RenderTask {
  id: string;
  projectId: string;
  shotId: string | null;
  type: 'image' | 'video';
  status: 'queued' | 'rendering' | 'completed' | 'error' | 'paused';
  progress: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  shotIndex?: number;
  shotDescription?: string;
}

interface Shot {
  id: string;
  index: number;
  description: string;
  imagePath: string | null;
  videoPath: string | null;
}

const statusConfig = {
  queued: { label: '排队中', variant: 'default' as const },
  rendering: { label: '渲染中', variant: 'warning' as const },
  completed: { label: '已完成', variant: 'success' as const },
  error: { label: '失败', variant: 'error' as const },
  paused: { label: '已暂停', variant: 'default' as const },
};

function RenderTaskCard({
  task,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: {
  task: RenderTask;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  return (
    <PixelCard padding="md" className="mb-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 flex items-center justify-center',
            task.type === 'video' ? 'bg-secondary-main' : 'bg-primary-main'
          )}>
            {task.type === 'video' ? (
              <IconVideo size={20} className="text-white" />
            ) : (
              <IconImage size={20} className="text-white" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-text-primary">
              分镜 #{task.shotIndex || '?'} - {task.type === 'video' ? '视频' : '图像'}
            </h3>
            <p className="text-xs text-text-muted truncate max-w-[200px]">
              {task.shotDescription || '无描述'}
            </p>
          </div>
        </div>
        <PixelBadge variant={statusConfig[task.status].variant}>
          {statusConfig[task.status].label}
        </PixelBadge>
      </div>

      {task.status === 'rendering' && (
        <PixelProgress
          value={task.progress}
          variant="gradient"
          showValue
          striped
          animated
          size="sm"
          className="mb-3"
        />
      )}

      {task.status === 'error' && task.errorMessage && (
        <p className="text-xs text-status-error mb-3 bg-status-error/10 p-2 border border-status-error">
          {task.errorMessage}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {task.completedAt
            ? `完成于 ${new Date(task.completedAt).toLocaleTimeString()}`
            : task.startedAt
            ? `开始于 ${new Date(task.startedAt).toLocaleTimeString()}`
            : `创建于 ${new Date(task.createdAt).toLocaleTimeString()}`}
        </span>
        <div className="flex items-center gap-1">
          {task.status === 'rendering' && (
            <PixelButton variant="ghost" size="icon" shadow={false} onClick={onPause}>
              <IconPause size={14} />
            </PixelButton>
          )}
          {task.status === 'paused' && (
            <PixelButton variant="ghost" size="icon" shadow={false} onClick={onResume}>
              <IconPlay size={14} />
            </PixelButton>
          )}
          {task.status === 'error' && (
            <PixelButton variant="ghost" size="icon" shadow={false} onClick={onRetry}>
              <IconRefresh size={14} />
            </PixelButton>
          )}
          {task.status !== 'rendering' && (
            <PixelButton variant="ghost" size="icon" shadow={false} onClick={onCancel}>
              <IconTrash size={14} />
            </PixelButton>
          )}
        </div>
      </div>
    </PixelCard>
  );
}

export default function ProjectRenderPage() {
  const { projectId } = useParams({ from: '/project/$projectId' });

  // 状态
  const [tasks, setTasks] = useState<RenderTask[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // 消息状态
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tasksResult, shotsResult] = await Promise.all([
        window.electron.invoke('render:list', projectId),
        window.electron.invoke('storyboard:list', projectId),
      ]);
      setTasks(tasksResult || []);
      setShots(shotsResult || []);
    } catch (error) {
      console.error('加载数据失败:', error);
      showMessage('error', '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 监听渲染进度更新
  useEffect(() => {
    const handleProgress = (...args: unknown[]) => {
      const task = args[0] as RenderTask;
      if (task?.id) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
      }
    };

    window.electron.on('render:progress', handleProgress);
    return () => {
      window.electron.off('render:progress', handleProgress);
    };
  }, []);

  // 定期刷新任务列表
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadData]);

  // 统计数据
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    rendering: tasks.filter((t) => t.status === 'rendering').length,
    queued: tasks.filter((t) => t.status === 'queued').length,
    error: tasks.filter((t) => t.status === 'error').length,
    paused: tasks.filter((t) => t.status === 'paused').length,
  };

  // 获取未渲染图像的分镜
  const shotsWithoutImage = shots.filter(s => !s.imagePath);
  // 获取有图像但无视频的分镜
  const shotsWithoutVideo = shots.filter(s => s.imagePath && !s.videoPath);

  // 渲染全部图像
  const handleRenderAllImages = async () => {
    if (shotsWithoutImage.length === 0) {
      showMessage('info', '所有分镜都已有图像');
      return;
    }

    try {
      setIsCreatingBatch(true);
      const shotIds = shotsWithoutImage.map(s => s.id);
      await window.electron.invoke('render:create-batch', projectId, shotIds, 'image');
      await loadData();
      showMessage('success', `已添加 ${shotIds.length} 个图像渲染任务`);
    } catch (error) {
      console.error('创建批量任务失败:', error);
      showMessage('error', '创建批量任务失败');
    } finally {
      setIsCreatingBatch(false);
    }
  };

  // 渲染全部视频
  const handleRenderAllVideos = async () => {
    if (shotsWithoutVideo.length === 0) {
      showMessage('info', '没有可生成视频的分镜（需要先生成图像）');
      return;
    }

    try {
      setIsCreatingBatch(true);
      const shotIds = shotsWithoutVideo.map(s => s.id);
      await window.electron.invoke('render:create-batch', projectId, shotIds, 'video');
      await loadData();
      showMessage('success', `已添加 ${shotIds.length} 个视频渲染任务`);
    } catch (error) {
      console.error('创建批量任务失败:', error);
      showMessage('error', '创建批量任务失败');
    } finally {
      setIsCreatingBatch(false);
    }
  };

  // 暂停任务
  const handlePause = async (taskId: string) => {
    try {
      await window.electron.invoke('render:pause', taskId);
      await loadData();
    } catch (error) {
      console.error('暂停失败:', error);
      showMessage('error', '暂停失败');
    }
  };

  // 恢复任务
  const handleResume = async (taskId: string) => {
    try {
      await window.electron.invoke('render:resume', taskId);
      await loadData();
    } catch (error) {
      console.error('恢复失败:', error);
      showMessage('error', '恢复失败');
    }
  };

  // 取消任务
  const handleCancel = async (taskId: string) => {
    try {
      await window.electron.invoke('render:cancel', taskId);
      await loadData();
      showMessage('success', '任务已取消');
    } catch (error) {
      console.error('取消失败:', error);
      showMessage('error', '取消失败');
    }
  };

  // 重试任务
  const handleRetry = async (task: RenderTask) => {
    if (!task.shotId) return;

    try {
      // 删除失败的任务
      await window.electron.invoke('render:cancel', task.id);
      // 创建新任务
      await window.electron.invoke('render:create', projectId, task.shotId, task.type);
      await loadData();
      showMessage('success', '已重新添加任务');
    } catch (error) {
      console.error('重试失败:', error);
      showMessage('error', '重试失败');
    }
  };

  if (isLoading) {
    return (
      <>
        <Toolbar title="渲染" />
        <PageContainer className="flex items-center justify-center">
          <PixelLoading size="lg" text="加载渲染任务..." />
        </PageContainer>
      </>
    );
  }

  return (
    <>
      {/* 消息提示 */}
      {message && (
        <div
          className={cn(
            'fixed top-16 right-4 z-50 px-4 py-2 border-2 border-black shadow-pixel-sm flex items-center gap-2',
            message.type === 'success' && 'bg-status-success text-white',
            message.type === 'error' && 'bg-status-error text-white',
            message.type === 'info' && 'bg-status-info text-white'
          )}
        >
          {message.type === 'success' && <IconCheck size={14} />}
          {message.type === 'error' && <IconWarning size={14} />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <Toolbar
        title="渲染"
        actions={
          <div className="flex gap-2">
            <PixelButton
              variant="secondary"
              size="sm"
              leftIcon={<IconImage size={14} />}
              onClick={handleRenderAllImages}
              loading={isCreatingBatch}
              disabled={shotsWithoutImage.length === 0}
            >
              渲染图像 ({shotsWithoutImage.length})
            </PixelButton>
            <PixelButton
              variant="primary"
              size="sm"
              leftIcon={<IconBolt size={14} />}
              onClick={handleRenderAllVideos}
              loading={isCreatingBatch}
              disabled={shotsWithoutVideo.length === 0}
            >
              渲染视频 ({shotsWithoutVideo.length})
            </PixelButton>
          </div>
        }
      />

      <PageContainer>
        <PageHeader title="渲染任务" description="管理本项目的 AI 生成任务" />

        {/* 统计 */}
        <PixelCard padding="lg" className="mb-6">
          <div className="grid grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-2xl font-pixel text-text-primary">{stats.total}</div>
              <div className="text-xs text-text-muted">总任务</div>
            </div>
            <div>
              <div className="text-2xl font-pixel text-status-success">{stats.completed}</div>
              <div className="text-xs text-text-muted">已完成</div>
            </div>
            <div>
              <div className="text-2xl font-pixel text-status-warning">{stats.rendering}</div>
              <div className="text-xs text-text-muted">进行中</div>
            </div>
            <div>
              <div className="text-2xl font-pixel text-text-secondary">{stats.queued}</div>
              <div className="text-xs text-text-muted">排队中</div>
            </div>
            <div>
              <div className="text-2xl font-pixel text-text-muted">{stats.paused}</div>
              <div className="text-xs text-text-muted">已暂停</div>
            </div>
            <div>
              <div className="text-2xl font-pixel text-status-error">{stats.error}</div>
              <div className="text-xs text-text-muted">失败</div>
            </div>
          </div>
        </PixelCard>

        {/* 分镜概览 */}
        <PixelCard padding="md" className="mb-6">
          <h3 className="font-pixel text-sm text-text-primary mb-3">分镜状态概览</h3>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-text-muted">总分镜：</span>
              <span className="text-text-primary font-medium">{shots.length}</span>
            </div>
            <div>
              <span className="text-text-muted">已有图像：</span>
              <span className="text-status-success font-medium">
                {shots.filter(s => s.imagePath).length}
              </span>
            </div>
            <div>
              <span className="text-text-muted">已有视频：</span>
              <span className="text-primary-main font-medium">
                {shots.filter(s => s.videoPath).length}
              </span>
            </div>
          </div>
        </PixelCard>

        {/* 任务列表 */}
        {tasks.length === 0 ? (
          <PixelCard padding="lg" className="text-center">
            <IconBolt size={48} className="text-text-muted mx-auto mb-4" />
            <p className="text-text-muted mb-4">暂无渲染任务</p>
            <p className="text-xs text-text-muted">
              点击上方按钮开始批量渲染，或在分镜页面单独生成
            </p>
          </PixelCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="font-pixel text-sm text-text-secondary mb-4">
                进行中 & 排队中 ({stats.rendering + stats.queued + stats.paused})
              </h2>
              {tasks
                .filter((t) => ['rendering', 'queued', 'paused'].includes(t.status))
                .sort((a, b) => {
                  const order = { rendering: 0, paused: 1, queued: 2 };
                  return order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
                })
                .map((task) => (
                  <RenderTaskCard
                    key={task.id}
                    task={task}
                    onPause={() => handlePause(task.id)}
                    onResume={() => handleResume(task.id)}
                    onCancel={() => handleCancel(task.id)}
                    onRetry={() => handleRetry(task)}
                  />
                ))}
              {stats.rendering + stats.queued + stats.paused === 0 && (
                <PixelCard padding="lg" className="text-center">
                  <p className="text-text-muted">暂无进行中的任务</p>
                </PixelCard>
              )}
            </div>

            <div>
              <h2 className="font-pixel text-sm text-text-secondary mb-4">
                已完成 & 失败 ({stats.completed + stats.error})
              </h2>
              {tasks
                .filter((t) => ['completed', 'error'].includes(t.status))
                .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
                .map((task) => (
                  <RenderTaskCard
                    key={task.id}
                    task={task}
                    onPause={() => {}}
                    onResume={() => {}}
                    onCancel={() => handleCancel(task.id)}
                    onRetry={() => handleRetry(task)}
                  />
                ))}
              {stats.completed + stats.error === 0 && (
                <PixelCard padding="lg" className="text-center">
                  <p className="text-text-muted">暂无已完成的任务</p>
                </PixelCard>
              )}
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}
