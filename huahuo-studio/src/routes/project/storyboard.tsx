import { useState, useEffect, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { Toolbar } from '@/components/layout/Toolbar';
import { PixelCard } from '@/components/ui/pixel-card';
import { PixelButton } from '@/components/ui/pixel-button';
import { PixelTextarea } from '@/components/ui/pixel-textarea';
import { PixelInput } from '@/components/ui/pixel-input';
import { PixelBadge } from '@/components/ui/pixel-badge';
import { PixelProgress } from '@/components/ui/pixel-progress';
import { PixelLoading } from '@/components/ui/pixel-loading';
import {
  IconPlus, IconRefresh, IconPlay, IconImage,
  IconChevronLeft, IconChevronRight, IconSave, IconVideo,
  IconTrash, IconCheck, IconWarning,
} from '@/components/ui/pixel-icons';
import { cn, getLocalFileUrl } from '@/lib/utils';
import { useTaskNotification } from '@/contexts/TaskNotificationContext';

interface Shot {
  id: string;
  projectId: string;
  sceneId: string | null;
  index: number;
  description: string;
  dialogue: string | null;
  characterId: string | null;
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
  status: 'empty' | 'generating' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
}

interface Scene {
  id: string;
  name: string;
  sceneInfo: string | null;
  location: string | null;
  timeOfDay: string | null;
  interior: boolean;
  imagePath: string | null;
}

interface Character {
  id: string;
  name: string;
  role: string;
}

const statusConfig = {
  empty: { color: 'bg-bg-tertiary', label: '待生成', variant: 'default' as const },
  generating: { color: 'bg-status-warning', label: '生成中', variant: 'warning' as const },
  ready: { color: 'bg-status-success', label: '已就绪', variant: 'success' as const },
  error: { color: 'bg-status-error', label: '失败', variant: 'error' as const },
};

const cameraTypes = [
  { value: '', label: '默认' },
  { value: '特写', label: '特写' },
  { value: 'close', label: '特写(close)' },
  { value: '中景', label: '中景' },
  { value: 'medium', label: '中景(medium)' },
  { value: '全景', label: '全景' },
  { value: 'wide', label: '全景(wide)' },
  { value: '远景', label: '远景' },
  { value: 'extreme_wide', label: '远景(extreme_wide)' },
  { value: 'close-up', label: '大特写' },
  { value: 'over-shoulder', label: '过肩' },
  { value: 'pov', label: '主观' },
];

const moods = [
  { value: '', label: '默认' },
  { value: '平静', label: '平静' },
  { value: '温馨', label: '温馨' },
  { value: '紧张', label: '紧张' },
  { value: '悲伤', label: '悲伤' },
  { value: '愤怒', label: '愤怒' },
  { value: '欢快', label: '欢快' },
  { value: '浪漫', label: '浪漫' },
  { value: '神秘', label: '神秘' },
  { value: '戏剧性', label: '戏剧性' },
  { value: 'happy', label: '欢快(happy)' },
  { value: 'sad', label: '悲伤(sad)' },
  { value: 'tense', label: '紧张(tense)' },
  { value: 'romantic', label: '浪漫(romantic)' },
  { value: 'mysterious', label: '神秘(mysterious)' },
  { value: 'dramatic', label: '戏剧性(dramatic)' },
];

function ShotCard({
  shot,
  isSelected,
  onClick,
  characterName,
  sceneName,
}: {
  shot: Shot;
  isSelected: boolean;
  onClick: () => void;
  characterName?: string;
  sceneName?: string;
}) {
  const imageUrl = getLocalFileUrl(shot.imagePath);

  return (
    <PixelCard
      interactive
      padding="none"
      className={cn('w-48 shrink-0', isSelected && 'ring-2 ring-primary-main')}
      onClick={onClick}
    >
      <div className="aspect-video bg-bg-tertiary flex items-center justify-center relative">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <IconImage size={32} className="text-text-muted" />
        )}
        <div className="absolute top-1 right-1">
          <div className={cn('w-2 h-2', statusConfig[shot.status].color)} />
        </div>
        <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5">
          <span className="text-[10px] text-white font-mono">{shot.duration}s</span>
        </div>
        {shot.videoPath && (
          <div className="absolute bottom-1 left-1 bg-primary-main px-1.5 py-0.5">
            <span className="text-[10px] text-white">视频</span>
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-pixel text-xs text-text-muted">#{shot.index}</span>
          {characterName && <PixelBadge variant="primary" size="sm">{characterName}</PixelBadge>}
        </div>
        {sceneName && (
          <div className="text-[10px] text-text-muted truncate mb-0.5">{sceneName}</div>
        )}
        <p className="text-xs text-text-secondary line-clamp-2">{shot.description}</p>
      </div>
    </PixelCard>
  );
}

export default function ProjectStoryboardPage() {
  const { projectId } = useParams({ from: '/project/$projectId' });
  const { addTask, updateTask, completeTask, errorTask } = useTaskNotification();

  // 数据状态
  const [shots, setShots] = useState<Shot[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 编辑表单
  const [editForm, setEditForm] = useState({
    description: '',
    dialogue: '',
    characterId: '',
    sceneId: '',
    duration: 3,
    cameraType: '',
    mood: '',
  });

  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // 批量生成状态
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    completed: number;
    errors: number;
    current: string | null;
  } | null>(null);

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
      const [shotsResult, charactersResult, scenesResult] = await Promise.all([
        window.electron.invoke('storyboard:list', projectId),
        window.electron.invoke('character:list', projectId),
        window.electron.invoke('scene:list', projectId),
      ]);
      setShots(shotsResult || []);
      setCharacters(charactersResult || []);
      setScenes(scenesResult || []);

      // 如果有分镜但没有选中，选中第一个
      if (shotsResult?.length > 0 && !selectedId) {
        setSelectedId(shotsResult[0].id);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      showMessage('error', '加载数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, selectedId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 选中的分镜
  const selectedShot = shots.find((s) => s.id === selectedId);

  // 当选中分镜改变时，更新表单
  useEffect(() => {
    if (selectedShot) {
      setEditForm({
        description: selectedShot.description,
        dialogue: selectedShot.dialogue || '',
        characterId: selectedShot.characterId || '',
        sceneId: selectedShot.sceneId || '',
        duration: selectedShot.duration,
        cameraType: selectedShot.cameraType || '',
        mood: selectedShot.mood || '',
      });
    }
  }, [selectedShot]);

  // 获取角色名
  const getCharacterName = (characterId: string | null) => {
    if (!characterId) return undefined;
    const char = characters.find((c) => c.id === characterId);
    return char?.name;
  };

  // 获取场景名
  const getSceneName = (sceneId: string | null) => {
    if (!sceneId) return undefined;
    const scene = scenes.find((s) => s.id === sceneId);
    return scene?.name || scene?.sceneInfo;
  };

  // 创建新分镜
  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const newIndex = shots.length + 1;
      const newId = await window.electron.invoke('storyboard:create', projectId, {
        index: newIndex,
        description: '新分镜描述',
        duration: 3,
      });

      await loadData();
      setSelectedId(newId);
      showMessage('success', '分镜创建成功');
    } catch (error) {
      console.error('创建失败:', error);
      showMessage('error', '创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  // 保存分镜
  const handleSave = async () => {
    if (!selectedId) return;

    try {
      setIsSaving(true);
      await window.electron.invoke('storyboard:update', selectedId, {
        description: editForm.description,
        dialogue: editForm.dialogue || null,
        characterId: editForm.characterId || null,
        sceneId: editForm.sceneId || null,
        duration: editForm.duration,
        cameraType: editForm.cameraType || null,
        mood: editForm.mood || null,
      });

      await loadData();
      showMessage('success', '保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      showMessage('error', '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 删除分镜
  const handleDelete = async () => {
    if (!selectedId) return;

    if (!confirm('确定要删除这个分镜吗？')) return;

    try {
      setIsDeleting(true);
      await window.electron.invoke('storyboard:delete', selectedId);

      const currentIndex = shots.findIndex((s) => s.id === selectedId);
      await loadData();

      // 选择相邻的分镜
      if (shots.length > 1) {
        const newIndex = Math.min(currentIndex, shots.length - 2);
        setSelectedId(shots[newIndex]?.id || null);
      } else {
        setSelectedId(null);
      }

      showMessage('success', '分镜已删除');
    } catch (error) {
      console.error('删除失败:', error);
      showMessage('error', '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 生成图像
  const handleGenerateImage = async () => {
    if (!selectedId) return;

    try {
      setIsGeneratingImage(true);
      setGenerationProgress(0);

      // 监听进度
      const progressHandler = (...args: unknown[]) => {
        const data = args[0] as { progress: number };
        if (data?.progress !== undefined) {
          setGenerationProgress(data.progress);
        }
      };
      window.electron.on('render:progress', progressHandler);

      await window.electron.invoke('storyboard:generate-image', selectedId);

      window.electron.off('render:progress', progressHandler);
      await loadData();
      showMessage('success', '图像生成成功');
    } catch (error) {
      console.error('生成图像失败:', error);
      showMessage('error', error instanceof Error ? error.message : '生成图像失败');
    } finally {
      setIsGeneratingImage(false);
      setGenerationProgress(0);
    }
  };

  // 生成视频
  const handleGenerateVideo = async () => {
    if (!selectedId || !selectedShot) return;

    // 创建任务通知
    const taskId = addTask({
      type: 'shot-video',
      status: 'running',
      title: `生成分镜 #${selectedShot.index} 视频`,
      message: '正在生成视频，预计需要1-5分钟...',
      total: 100,
      completed: 0,
      errors: 0,
      navigateTo: `/project/${projectId}/storyboard`,
    });

    try {
      setIsGeneratingVideo(true);
      setGenerationProgress(0);

      const progressHandler = (...args: unknown[]) => {
        const data = args[1] as { progress: number };
        setGenerationProgress(data.progress);
        updateTask(taskId, {
          completed: data.progress,
          message: `生成进度 ${data.progress}%`,
        });
      };
      window.electron.on('ai:progress', progressHandler);

      await window.electron.invoke('ai:generate-video', selectedId);

      window.electron.off('ai:progress', progressHandler);
      await loadData();
      completeTask(taskId, { message: '视频生成完成' });
      showMessage('success', '视频生成成功');
    } catch (error) {
      console.error('生成视频失败:', error);
      errorTask(taskId, error instanceof Error ? error.message : '生成视频失败');
      showMessage('error', error instanceof Error ? error.message : '生成视频失败');
    } finally {
      setIsGeneratingVideo(false);
      setGenerationProgress(0);
    }
  };

  // 移动分镜
  const handleMove = async (direction: 'left' | 'right') => {
    if (!selectedShot) return;

    const newIndex = direction === 'left' ? selectedShot.index - 1 : selectedShot.index + 1;
    if (newIndex < 1 || newIndex > shots.length) return;

    try {
      await window.electron.invoke('storyboard:move', selectedId, newIndex);
      await loadData();
    } catch (error) {
      console.error('移动失败:', error);
      showMessage('error', '移动失败');
    }
  };

  // 导航到上一个/下一个分镜
  const navigateShot = (direction: 'prev' | 'next') => {
    if (!selectedShot) return;

    const currentIndex = shots.findIndex((s) => s.id === selectedId);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < shots.length) {
      setSelectedId(shots[newIndex].id);
    }
  };

  // 一键生成所有分镜图片
  const handleGenerateAllImages = async (regenerateAll: boolean = false) => {
    // 计算待生成数量
    const toGenerate = regenerateAll
      ? shots.filter(s => s.description)
      : shots.filter(s => s.description && !s.imagePath);

    if (toGenerate.length === 0) {
      showMessage('info', '没有需要生成的分镜');
      return;
    }

    const taskId = addTask({
      type: 'batch-shot',
      status: 'running',
      title: '批量生成分镜参考图',
      message: `准备生成 ${toGenerate.length} 个分镜...`,
      total: toGenerate.length,
      completed: 0,
      errors: 0,
      navigateTo: `/project/${projectId}/storyboard`,
    });

    showMessage('info', '任务已开始，请留意左下角任务进度提醒');

    try {
      setIsBatchGenerating(true);
      setBatchProgress({ total: toGenerate.length, completed: 0, errors: 0, current: null });

      // 监听进度
      const progressHandler = (...args: unknown[]) => {
        const data = args[0] as { total: number; completed: number; errors: number; current: string | null };
        setBatchProgress(data);
        updateTask(taskId, {
          completed: data.completed,
          errors: data.errors,
          message: data.current ? `正在生成: ${data.current}` : `${data.completed}/${data.total} 完成`,
        });
      };
      window.electron.on('storyboard:batch-progress', progressHandler);

      const result = await window.electron.invoke('storyboard:generate-all-images', projectId, regenerateAll) as {
        generated: number;
        skipped: number;
        errors: number;
        message: string;
      };

      window.electron.off('storyboard:batch-progress', progressHandler);
      await loadData();

      if (result.errors > 0) {
        errorTask(taskId, result.message);
        showMessage('error', result.message);
      } else if (result.generated === 0) {
        completeTask(taskId, { message: result.message });
        showMessage('info', result.message);
      } else {
        completeTask(taskId, {
          message: result.message,
          completed: result.generated,
        });
        showMessage('success', result.message);
      }
    } catch (error) {
      console.error('批量生成失败:', error);
      errorTask(taskId, error instanceof Error ? error.message : '批量生成失败');
      showMessage('error', error instanceof Error ? error.message : '批量生成失败');
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(null);
    }
  };

  // 计算总时长
  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <Toolbar title="分镜" />
        <div className="flex-1 flex items-center justify-center">
          <PixelLoading size="lg" text="加载分镜中..." />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
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

      {/* 批量生成进度 */}
      {isBatchGenerating && batchProgress && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-bg-secondary border-2 border-black shadow-pixel px-6 py-4 min-w-[300px]">
          <div className="text-sm font-pixel text-text-primary mb-2">
            批量生成分镜参考图
          </div>
          <PixelProgress
            value={(batchProgress.completed + batchProgress.errors) / batchProgress.total * 100}
            variant="gradient"
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>
              {batchProgress.completed}/{batchProgress.total} 完成
              {batchProgress.errors > 0 && `, ${batchProgress.errors} 失败`}
            </span>
            {batchProgress.current && (
              <span className="text-primary-main">{batchProgress.current}</span>
            )}
          </div>
        </div>
      )}

      <Toolbar
        title="分镜"
        actions={
          <>
            <PixelButton
              variant="secondary"
              size="sm"
              leftIcon={<IconImage size={14} />}
              onClick={() => handleGenerateAllImages(false)}
              loading={isBatchGenerating}
              disabled={shots.length === 0}
              title="生成所有未生成的分镜参考图（最多5个并行）"
            >
              一键生成
            </PixelButton>
            <PixelButton
              variant="ghost"
              size="sm"
              leftIcon={<IconSave size={14} />}
              onClick={handleSave}
              loading={isSaving}
              disabled={!selectedId}
            >
              保存
            </PixelButton>
            <PixelButton variant="primary" size="sm" leftIcon={<IconPlay size={14} />}>
              预览
            </PixelButton>
          </>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 中央预览区 */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-bg-primary">
          {selectedShot ? (
            <>
              <div className="w-full max-w-2xl aspect-video bg-bg-secondary border-2 border-black shadow-pixel flex items-center justify-center mb-4 overflow-hidden">
                {selectedShot.imagePath ? (
                  <img
                    src={getLocalFileUrl(selectedShot.imagePath) || ''}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                ) : isGeneratingImage ? (
                  <div className="text-center">
                    <PixelProgress value={generationProgress} variant="gradient" className="w-48 mb-2" />
                    <p className="text-sm text-text-muted">正在生成图像... {generationProgress}%</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <IconImage size={48} className="text-text-muted mx-auto mb-2" />
                    <p className="text-sm text-text-muted">点击生成画面</p>
                  </div>
                )}
              </div>

              {/* 视频预览 */}
              {selectedShot.videoPath && (
                <div className="w-full max-w-2xl mb-4">
                  <video
                    src={getLocalFileUrl(selectedShot.videoPath) || ''}
                    controls
                    className="w-full border-2 border-black"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <PixelButton
                  variant="primary"
                  leftIcon={<IconImage size={14} />}
                  onClick={handleGenerateImage}
                  loading={isGeneratingImage}
                >
                  生成图像
                </PixelButton>
                <PixelButton
                  variant="secondary"
                  leftIcon={<IconVideo size={14} />}
                  onClick={handleGenerateVideo}
                  loading={isGeneratingVideo}
                  disabled={!selectedShot.imagePath}
                >
                  生成视频
                </PixelButton>
                <PixelButton
                  variant="ghost"
                  leftIcon={<IconRefresh size={14} />}
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                >
                  重新生成
                </PixelButton>
              </div>

              {!selectedShot.imagePath && (
                <p className="text-xs text-text-muted mt-2">
                  提示：需要先生成图像才能生成视频
                </p>
              )}
            </>
          ) : (
            <div className="text-center">
              <IconImage size={64} className="text-text-muted mx-auto mb-4" />
              <p className="text-text-muted mb-4">
                {shots.length === 0 ? '还没有分镜，点击创建' : '选择一个分镜查看'}
              </p>
              {shots.length === 0 && (
                <PixelButton variant="primary" leftIcon={<IconPlus size={14} />} onClick={handleCreate}>
                  创建分镜
                </PixelButton>
              )}
            </div>
          )}
        </div>

        {/* 右侧属性面板 */}
        <div className="w-80 border-l-2 border-black bg-bg-secondary p-4 overflow-y-auto">
          {selectedShot ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-pixel text-sm text-text-primary">分镜 #{selectedShot.index}</h3>
                <div className="flex items-center gap-2">
                  <PixelBadge variant={statusConfig[selectedShot.status].variant}>
                    {statusConfig[selectedShot.status].label}
                  </PixelBadge>
                  <PixelButton
                    variant="ghost"
                    size="icon"
                    shadow={false}
                    onClick={handleDelete}
                    loading={isDeleting}
                  >
                    <IconTrash size={14} />
                  </PixelButton>
                </div>
              </div>

              <PixelTextarea
                label="画面描述"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                size="sm"
                placeholder="描述画面内容..."
              />

              {/* 场景选择 */}
              <div>
                <label className="block text-xs font-pixel text-text-secondary mb-1">关联场景</label>
                <select
                  value={editForm.sceneId}
                  onChange={(e) => setEditForm({ ...editForm, sceneId: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-tertiary border-2 border-black text-sm focus:outline-none focus:border-primary-main"
                >
                  <option value="">无场景</option>
                  {scenes.map((scene) => (
                    <option key={scene.id} value={scene.id}>
                      {scene.name}{scene.sceneInfo ? ` (${scene.sceneInfo})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 场景详情（只读显示） */}
              {(selectedShot.sceneInfo || selectedShot.location || selectedShot.timeOfDay) && (
                <div className="p-2 bg-bg-tertiary border border-border text-xs">
                  <div className="font-pixel text-text-muted mb-1">场景信息</div>
                  {selectedShot.sceneInfo && (
                    <div className="text-text-secondary">{selectedShot.sceneInfo}</div>
                  )}
                  {(selectedShot.location || selectedShot.timeOfDay) && (
                    <div className="text-text-secondary mt-1">
                      {selectedShot.location && <span>{selectedShot.location}</span>}
                      {selectedShot.location && selectedShot.timeOfDay && <span> · </span>}
                      {selectedShot.timeOfDay && <span>{selectedShot.timeOfDay}</span>}
                    </div>
                  )}
                  {selectedShot.props && (
                    <div className="text-text-muted mt-1">道具: {selectedShot.props}</div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-pixel text-text-secondary mb-1">角色</label>
                <select
                  value={editForm.characterId}
                  onChange={(e) => setEditForm({ ...editForm, characterId: e.target.value })}
                  className="w-full px-3 py-2 bg-bg-tertiary border-2 border-black text-sm focus:outline-none focus:border-primary-main"
                >
                  <option value="">无角色</option>
                  {characters.map((char) => (
                    <option key={char.id} value={char.id}>
                      {char.name}
                    </option>
                  ))}
                </select>
              </div>

              <PixelTextarea
                label="对话/旁白"
                value={editForm.dialogue}
                onChange={(e) => setEditForm({ ...editForm, dialogue: e.target.value })}
                size="sm"
                placeholder="输入对话或旁白..."
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-pixel text-text-secondary mb-1">镜头类型</label>
                  <select
                    value={editForm.cameraType}
                    onChange={(e) => setEditForm({ ...editForm, cameraType: e.target.value })}
                    className="w-full px-2 py-1.5 bg-bg-tertiary border-2 border-black text-sm focus:outline-none focus:border-primary-main"
                  >
                    {cameraTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-pixel text-text-secondary mb-1">情绪氛围</label>
                  <select
                    value={editForm.mood}
                    onChange={(e) => setEditForm({ ...editForm, mood: e.target.value })}
                    className="w-full px-2 py-1.5 bg-bg-tertiary border-2 border-black text-sm focus:outline-none focus:border-primary-main"
                  >
                    {moods.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <PixelInput
                label="时长（秒）"
                type="number"
                value={editForm.duration.toString()}
                onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 3 })}
                min={1}
                max={30}
              />

              <div className="flex gap-2 pt-2">
                <PixelButton
                  variant="ghost"
                  size="sm"
                  leftIcon={<IconChevronLeft size={14} />}
                  onClick={() => handleMove('left')}
                  disabled={selectedShot.index === 1}
                >
                  左移
                </PixelButton>
                <PixelButton
                  variant="ghost"
                  size="sm"
                  leftIcon={<IconChevronRight size={14} />}
                  onClick={() => handleMove('right')}
                  disabled={selectedShot.index === shots.length}
                >
                  右移
                </PixelButton>
              </div>
            </div>
          ) : (
            <p className="text-center text-text-muted">选择一个分镜</p>
          )}
        </div>
      </div>

      {/* 底部时间轴 */}
      <div className="h-40 border-t-2 border-black bg-bg-secondary">
        <div className="h-10 border-b border-border px-4 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            共 {shots.length} 个分镜 | 总时长 {totalDuration}s
          </span>
          <div className="flex gap-1">
            <PixelButton
              variant="ghost"
              size="icon"
              shadow={false}
              onClick={() => navigateShot('prev')}
              disabled={!selectedShot || selectedShot.index === 1}
            >
              <IconChevronLeft size={14} />
            </PixelButton>
            <PixelButton
              variant="ghost"
              size="icon"
              shadow={false}
              onClick={() => navigateShot('next')}
              disabled={!selectedShot || selectedShot.index === shots.length}
            >
              <IconChevronRight size={14} />
            </PixelButton>
            <PixelButton
              variant="ghost"
              size="icon"
              shadow={false}
              onClick={handleCreate}
              loading={isCreating}
            >
              <IconPlus size={14} />
            </PixelButton>
          </div>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-3">
            {shots.map((shot) => (
              <ShotCard
                key={shot.id}
                shot={shot}
                isSelected={selectedId === shot.id}
                onClick={() => setSelectedId(shot.id)}
                characterName={getCharacterName(shot.characterId)}
                sceneName={getSceneName(shot.sceneId) || undefined}
              />
            ))}
            <PixelCard
              interactive
              padding="none"
              className="w-48 shrink-0 flex items-center justify-center border-dashed aspect-video"
              onClick={handleCreate}
            >
              <IconPlus size={24} className="text-text-muted" />
            </PixelCard>
          </div>
        </div>
      </div>
    </div>
  );
}
