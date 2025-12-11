import { useState, useEffect, useCallback } from 'react';
import { useParams } from '@tanstack/react-router';
import { Toolbar, ToolbarSearch } from '@/components/layout/Toolbar';
import { PageContainer } from '@/components/layout/AppLayout';
import { PixelCard } from '@/components/ui/pixel-card';
import { PixelButton } from '@/components/ui/pixel-button';
import { PixelInput } from '@/components/ui/pixel-input';
import { PixelTextarea } from '@/components/ui/pixel-textarea';
import { PixelBadge } from '@/components/ui/pixel-badge';
import { PixelLoading } from '@/components/ui/pixel-loading';
import { PixelProgress } from '@/components/ui/pixel-progress';
import {
  IconPlus, IconRefresh, IconTrash, IconEdit, IconImage,
  IconSave, IconClose, IconCheck, IconWarning, IconPlay,
} from '@/components/ui/pixel-icons';
import { cn, getLocalFileUrl } from '@/lib/utils';
import { useTaskNotification } from '@/contexts/TaskNotificationContext';

interface Scene {
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

const timeOptions = [
  { value: '白天', label: '白天' },
  { value: '夜晚', label: '夜晚' },
  { value: '黄昏', label: '黄昏' },
  { value: '清晨', label: '清晨' },
  { value: '傍晚', label: '傍晚' },
  { value: '午后', label: '午后' },
  { value: '深夜', label: '深夜' },
];

function SceneCard({
  scene,
  isSelected,
  onClick,
}: {
  scene: Scene;
  isSelected: boolean;
  onClick: () => void;
}) {
  const imageUrl = getLocalFileUrl(scene.imagePath);

  return (
    <PixelCard
      interactive
      padding="none"
      className={cn('overflow-hidden', isSelected && 'ring-2 ring-primary-main')}
      onClick={onClick}
    >
      <div className="aspect-video bg-bg-tertiary flex items-center justify-center border-b-2 border-black relative">
        {imageUrl ? (
          <img src={imageUrl} alt={scene.name} className="w-full h-full object-cover" />
        ) : (
          <IconImage size={32} className="text-text-muted" />
        )}
        <div className="absolute top-1 right-1">
          <PixelBadge variant={scene.interior ? 'default' : 'primary'} size="sm">
            {scene.interior ? '内' : '外'}
          </PixelBadge>
        </div>
        {scene.timeOfDay && (
          <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5">
            <span className="text-[10px] text-white">{scene.timeOfDay}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-pixel text-sm text-text-primary truncate mb-1">{scene.name}</h3>
        <p className="text-xs text-text-muted truncate">
          {scene.location || scene.sceneInfo || '未设置地点'}
        </p>
      </div>
    </PixelCard>
  );
}

export default function ProjectScenesPage() {
  const { projectId } = useParams({ from: '/project/$projectId' });
  const { addTask, updateTask, completeTask, errorTask } = useTaskNotification();

  // 状态
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    name: '',
    sceneInfo: '',
    location: '',
    timeOfDay: '白天',
    interior: true,
    description: '',
    props: '',
    lighting: '',
    atmosphere: '',
  });

  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
    // 错误消息显示 10 秒，其他消息显示 3 秒
    const duration = type === 'error' ? 10000 : 3000;
    setTimeout(() => setMessage(null), duration);
  };

  // 加载场景列表
  const loadScenes = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await window.electron.invoke('scene:list', projectId);
      setScenes(result || []);
    } catch (error) {
      console.error('加载场景失败:', error);
      showMessage('error', '加载场景失败');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  // 选中的场景
  const selectedScene = scenes.find((s) => s.id === selectedId);

  // 当选中场景变化时，更新编辑表单
  useEffect(() => {
    if (selectedScene && !isEditing && !isCreating) {
      setEditForm({
        name: selectedScene.name,
        sceneInfo: selectedScene.sceneInfo || '',
        location: selectedScene.location || '',
        timeOfDay: selectedScene.timeOfDay || '白天',
        interior: selectedScene.interior,
        description: selectedScene.description || '',
        props: selectedScene.props || '',
        lighting: selectedScene.lighting || '',
        atmosphere: selectedScene.atmosphere || '',
      });
    }
  }, [selectedScene, isEditing, isCreating]);

  // 搜索过滤
  const filteredScenes = scenes.filter((scene) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      scene.name.toLowerCase().includes(query) ||
      scene.location?.toLowerCase().includes(query) ||
      scene.sceneInfo?.toLowerCase().includes(query)
    );
  });

  // 创建新场景
  const handleCreate = async () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedId(null);
    setEditForm({
      name: '新场景',
      sceneInfo: '',
      location: '',
      timeOfDay: '白天',
      interior: true,
      description: '',
      props: '',
      lighting: '',
      atmosphere: '',
    });
  };

  // 保存场景
  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (isCreating) {
        const newId = await window.electron.invoke('scene:create', projectId, editForm);
        await loadScenes();
        setSelectedId(newId);
        showMessage('success', '场景创建成功');
      } else if (selectedId) {
        await window.electron.invoke('scene:update', selectedId, editForm);
        await loadScenes();
        showMessage('success', '场景更新成功');
      }

      setIsEditing(false);
      setIsCreating(false);
    } catch (error) {
      console.error('保存失败:', error);
      showMessage('error', '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 删除场景
  const handleDelete = async () => {
    if (!selectedId) return;

    if (!confirm('确定要删除这个场景吗？关联的分镜将不再引用此场景。')) return;

    try {
      setIsDeleting(true);
      await window.electron.invoke('scene:delete', selectedId);
      await loadScenes();
      setSelectedId(null);
      showMessage('success', '场景已删除');
    } catch (error) {
      console.error('删除失败:', error);
      showMessage('error', '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedScene) {
      setEditForm({
        name: selectedScene.name,
        sceneInfo: selectedScene.sceneInfo || '',
        location: selectedScene.location || '',
        timeOfDay: selectedScene.timeOfDay || '白天',
        interior: selectedScene.interior,
        description: selectedScene.description || '',
        props: selectedScene.props || '',
        lighting: selectedScene.lighting || '',
        atmosphere: selectedScene.atmosphere || '',
      });
    }
  };

  // 生成场景参考图
  const handleGenerateImage = async () => {
    if (!selectedId) return;

    try {
      setIsGenerating(true);
      setGenerationProgress(0);

      // 监听进度
      const progressHandler = (...args: unknown[]) => {
        const data = args[0] as { progress: number };
        setGenerationProgress(data.progress || 0);
      };
      window.electron.on('ai:progress', progressHandler);

      await window.electron.invoke('scene:generate-image', selectedId);

      window.electron.off('ai:progress', progressHandler);
      await loadScenes();
      showMessage('success', '场景参考图生成成功');
    } catch (error) {
      console.error('生成场景图失败:', error);
      showMessage('error', error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // 清理重复场景
  const handleCleanupDuplicates = async () => {
    try {
      const deletedCount = await window.electron.invoke('scene:cleanup-duplicates', projectId);
      if (deletedCount > 0) {
        await loadScenes();
        showMessage('success', `已清理 ${deletedCount} 个重复场景`);
      } else {
        showMessage('info', '没有发现重复场景');
      }
    } catch (error) {
      console.error('清理失败:', error);
      showMessage('error', '清理失败');
    }
  };

  // 一键生成所有场景参考图
  const handleGenerateAllImages = async (regenerateAll: boolean = false) => {
    // 计算待生成数量
    const toGenerate = regenerateAll
      ? scenes.filter(s => s.description)
      : scenes.filter(s => s.description && !s.imagePath);

    if (toGenerate.length === 0) {
      showMessage('info', '没有需要生成的场景');
      return;
    }

    const taskId = addTask({
      type: 'batch-scene',
      status: 'running',
      title: '批量生成场景参考图',
      message: `准备生成 ${toGenerate.length} 个场景...`,
      total: toGenerate.length,
      completed: 0,
      errors: 0,
      navigateTo: `/project/${projectId}/scenes`,
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
      window.electron.on('scene:batch-progress', progressHandler);

      const result = await window.electron.invoke('scene:generate-all-images', projectId, regenerateAll) as {
        generated: number;
        skipped: number;
        errors: number;
        message: string;
      };

      window.electron.off('scene:batch-progress', progressHandler);
      await loadScenes();

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

  if (isLoading) {
    return (
      <>
        <Toolbar title="场景" />
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <PixelLoading size="lg" text="加载场景中..." />
          </div>
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

      {/* 批量生成进度 */}
      {isBatchGenerating && batchProgress && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-bg-secondary border-2 border-black shadow-pixel px-6 py-4 min-w-[300px]">
          <div className="text-sm font-pixel text-text-primary mb-2">
            批量生成场景参考图
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
        title="场景"
        actions={
          <>
            <ToolbarSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="搜索场景..."
            />
            <PixelButton
              variant="ghost"
              size="sm"
              onClick={handleCleanupDuplicates}
              title="清理重复场景"
            >
              清理重复
            </PixelButton>
            <PixelButton
              variant="secondary"
              size="sm"
              leftIcon={<IconPlay size={14} />}
              onClick={() => handleGenerateAllImages(false)}
              loading={isBatchGenerating}
              disabled={scenes.length === 0}
              title="生成所有未生成的场景参考图（最多5个并行）"
            >
              一键生成
            </PixelButton>
            <PixelButton
              variant="primary"
              size="sm"
              leftIcon={<IconPlus size={14} />}
              onClick={handleCreate}
            >
              添加场景
            </PixelButton>
          </>
        }
      />
      <PageContainer>
        <div className="flex gap-6 h-full">
          {/* 左侧场景列表 */}
          <div className="w-80 shrink-0">
            <div className="grid grid-cols-2 gap-3">
              {filteredScenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  isSelected={selectedId === scene.id}
                  onClick={() => {
                    if (!isEditing && !isCreating) {
                      setSelectedId(scene.id);
                    }
                  }}
                />
              ))}
            </div>
            {filteredScenes.length === 0 && (
              <PixelCard className="text-center py-12">
                <IconImage size={48} className="text-text-muted mx-auto mb-4" />
                <p className="text-text-muted mb-4">
                  {searchQuery ? '没有找到匹配的场景' : '还没有场景'}
                </p>
                {!searchQuery && (
                  <PixelButton variant="primary" onClick={handleCreate}>
                    添加场景
                  </PixelButton>
                )}
              </PixelCard>
            )}
          </div>

          {/* 右侧详情面板 */}
          <div className="flex-1">
            {selectedScene || isCreating ? (
              <PixelCard className="h-full">
                {/* 头部 */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-black">
                  <h2 className="font-pixel text-lg text-text-primary">
                    {isCreating ? '新建场景' : selectedScene?.name}
                  </h2>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <PixelButton
                          variant="ghost"
                          size="sm"
                          leftIcon={<IconClose size={14} />}
                          onClick={handleCancel}
                        >
                          取消
                        </PixelButton>
                        <PixelButton
                          variant="primary"
                          size="sm"
                          leftIcon={<IconSave size={14} />}
                          onClick={handleSave}
                          loading={isSaving}
                        >
                          保存
                        </PixelButton>
                      </>
                    ) : (
                      <>
                        <PixelButton
                          variant="ghost"
                          size="sm"
                          leftIcon={<IconEdit size={14} />}
                          onClick={() => setIsEditing(true)}
                        >
                          编辑
                        </PixelButton>
                        <PixelButton
                          variant="ghost"
                          size="sm"
                          leftIcon={<IconTrash size={14} />}
                          onClick={handleDelete}
                          loading={isDeleting}
                        >
                          删除
                        </PixelButton>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* 左侧：场景图片 */}
                  <div>
                    <div className="aspect-video bg-bg-tertiary border-2 border-black flex items-center justify-center mb-4 overflow-hidden">
                      {selectedScene?.imagePath ? (
                        <img
                          src={getLocalFileUrl(selectedScene.imagePath) || ''}
                          alt={selectedScene.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isGenerating ? (
                        <div className="text-center p-4">
                          <PixelProgress value={generationProgress} variant="gradient" className="w-32 mb-2" />
                          <p className="text-xs text-text-muted">生成中... {generationProgress}%</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <IconImage size={48} className="text-text-muted mx-auto mb-2" />
                          <p className="text-sm text-text-muted">点击生成场景参考图</p>
                        </div>
                      )}
                    </div>
                    {!isCreating && (
                      <div className="flex gap-2">
                        <PixelButton
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          leftIcon={<IconImage size={14} />}
                          onClick={handleGenerateImage}
                          loading={isGenerating}
                          disabled={!selectedScene?.description}
                        >
                          生成参考图
                        </PixelButton>
                        {selectedScene?.imagePath && (
                          <PixelButton
                            variant="ghost"
                            size="sm"
                            leftIcon={<IconRefresh size={14} />}
                            onClick={handleGenerateImage}
                            loading={isGenerating}
                          >
                            重新生成
                          </PixelButton>
                        )}
                      </div>
                    )}
                    {!selectedScene?.description && !isCreating && (
                      <p className="text-xs text-text-muted mt-2">
                        提示：请先填写场景描述才能生成参考图
                      </p>
                    )}
                  </div>

                  {/* 右侧：场景信息 */}
                  <div className="space-y-4">
                    <PixelInput
                      label="场景名称"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      disabled={!isEditing}
                      placeholder="如：客厅、办公室..."
                    />

                    <PixelInput
                      label="场景行（完整格式）"
                      value={editForm.sceneInfo}
                      onChange={(e) => setEditForm({ ...editForm, sceneInfo: e.target.value })}
                      disabled={!isEditing}
                      placeholder="如：英子家 夜 内"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <PixelInput
                        label="地点"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        disabled={!isEditing}
                        placeholder="具体地点"
                      />
                      <div>
                        <label className="block text-xs font-pixel text-text-secondary mb-2">时间</label>
                        <select
                          value={editForm.timeOfDay}
                          onChange={(e) => setEditForm({ ...editForm, timeOfDay: e.target.value })}
                          disabled={!isEditing}
                          className="w-full h-[38px] px-3 py-2 bg-bg-tertiary border-2 border-black text-sm focus:outline-none focus:border-primary-main disabled:opacity-50"
                        >
                          {timeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="text-xs font-pixel text-text-secondary">内/外景：</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={editForm.interior}
                          onChange={() => setEditForm({ ...editForm, interior: true })}
                          disabled={!isEditing}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">内景</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!editForm.interior}
                          onChange={() => setEditForm({ ...editForm, interior: false })}
                          disabled={!isEditing}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">外景</span>
                      </label>
                    </div>

                    <PixelTextarea
                      label="场景描述（用于AI生图）"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      disabled={!isEditing}
                      placeholder="详细描述场景的布局、装饰、风格等..."
                      rows={3}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <PixelInput
                        label="道具"
                        value={editForm.props}
                        onChange={(e) => setEditForm({ ...editForm, props: e.target.value })}
                        disabled={!isEditing}
                        placeholder="场景中的道具"
                      />
                      <PixelInput
                        label="光线"
                        value={editForm.lighting}
                        onChange={(e) => setEditForm({ ...editForm, lighting: e.target.value })}
                        disabled={!isEditing}
                        placeholder="如：温暖台灯光"
                      />
                    </div>

                    <PixelInput
                      label="氛围"
                      value={editForm.atmosphere}
                      onChange={(e) => setEditForm({ ...editForm, atmosphere: e.target.value })}
                      disabled={!isEditing}
                      placeholder="如：温馨家庭氛围"
                    />
                  </div>
                </div>
              </PixelCard>
            ) : (
              <PixelCard className="h-full flex items-center justify-center">
                <div className="text-center">
                  <IconImage size={64} className="text-text-muted mx-auto mb-4" />
                  <p className="text-text-muted mb-2">选择一个场景查看详情</p>
                  <p className="text-xs text-text-muted">
                    场景用于保持分镜画面的一致性
                  </p>
                </div>
              </PixelCard>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
