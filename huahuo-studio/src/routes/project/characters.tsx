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
import {
  IconPlus, IconRefresh, IconTrash, IconEdit, IconAI,
  IconSave, IconClose, IconCheck, IconWarning,
} from '@/components/ui/pixel-icons';
import { cn, getLocalFileUrl } from '@/lib/utils';
import { useTaskNotification } from '@/contexts/TaskNotificationContext';

interface Character {
  id: string;
  projectId: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  description: string | null;
  appearance: string | null;
  avatarPath: string | null;
  generatedAvatars: string[];
  createdAt: string;
  updatedAt: string;
}

const roleConfig = {
  protagonist: { label: '主角', variant: 'primary' as const },
  antagonist: { label: '反派', variant: 'error' as const },
  supporting: { label: '配角', variant: 'default' as const },
};

const roleOptions: { value: Character['role']; label: string }[] = [
  { value: 'protagonist', label: '主角' },
  { value: 'antagonist', label: '反派' },
  { value: 'supporting', label: '配角' },
];

function CharacterCard({
  character,
  isSelected,
  onClick,
}: {
  character: Character;
  isSelected: boolean;
  onClick: () => void;
}) {
  const avatarUrl = getLocalFileUrl(character.avatarPath);

  return (
    <PixelCard
      interactive
      padding="none"
      className={cn('overflow-hidden', isSelected && 'ring-2 ring-primary-main')}
      onClick={onClick}
    >
      <div className="aspect-square bg-bg-tertiary flex items-center justify-center border-b-2 border-black">
        {avatarUrl ? (
          <img src={avatarUrl} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-4xl">👤</div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-pixel text-sm text-text-primary truncate">{character.name}</h3>
          <PixelBadge variant={roleConfig[character.role].variant} size="sm">
            {roleConfig[character.role].label}
          </PixelBadge>
        </div>
        <p className="text-xs text-text-secondary line-clamp-2">
          {character.description || '暂无描述'}
        </p>
      </div>
    </PixelCard>
  );
}

export default function ProjectCharactersPage() {
  const { projectId } = useParams({ from: '/project/$projectId' });
  const { addTask, updateTask, completeTask, errorTask } = useTaskNotification();

  // 状态
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'supporting' as Character['role'],
    description: '',
    appearance: '',
  });

  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isGeneratingAppearance, setIsGeneratingAppearance] = useState(false);
  const [isGeneratingViews, setIsGeneratingViews] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  // 消息状态
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 显示消息
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 清理重复角色
  const handleCleanupDuplicates = async () => {
    try {
      setIsCleaningDuplicates(true);
      showMessage('info', '正在清理重复角色...');
      const deletedCount = await window.electron.invoke('character:cleanup-duplicates', projectId);
      if (deletedCount > 0) {
        await loadCharacters();
        showMessage('success', `已清理 ${deletedCount} 个重复角色`);
      } else {
        showMessage('info', '没有发现重复角色');
      }
    } catch (error) {
      console.error('清理重复角色失败:', error);
      showMessage('error', '清理失败');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  // 加载角色列表
  const loadCharacters = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await window.electron.invoke('character:list', projectId);
      setCharacters(result || []);
    } catch (error) {
      console.error('加载角色失败:', error);
      showMessage('error', '加载角色失败');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  // 选中的角色
  const selectedCharacter = characters.find((c) => c.id === selectedId);

  // 当选中角色改变时，更新编辑表单
  useEffect(() => {
    if (selectedCharacter && !isCreating) {
      setEditForm({
        name: selectedCharacter.name,
        role: selectedCharacter.role,
        description: selectedCharacter.description || '',
        appearance: selectedCharacter.appearance || '',
      });
    }
  }, [selectedCharacter, isCreating]);

  // 搜索过滤
  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 开始创建新角色
  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedId(null);
    setEditForm({
      name: '',
      role: 'supporting',
      description: '',
      appearance: '',
    });
  };

  // 取消编辑/创建
  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedCharacter) {
      setEditForm({
        name: selectedCharacter.name,
        role: selectedCharacter.role,
        description: selectedCharacter.description || '',
        appearance: selectedCharacter.appearance || '',
      });
    }
  };

  // 保存角色
  const handleSave = async () => {
    if (!editForm.name.trim()) {
      showMessage('error', '请输入角色名称');
      return;
    }

    try {
      setIsSaving(true);

      if (isCreating) {
        // 创建新角色
        const newId = await window.electron.invoke('character:create', projectId, {
          name: editForm.name.trim(),
          role: editForm.role,
          description: editForm.description.trim() || null,
          appearance: editForm.appearance.trim() || null,
        });

        await loadCharacters();
        setSelectedId(newId);
        showMessage('success', '角色创建成功');
      } else if (selectedId) {
        // 更新现有角色
        await window.electron.invoke('character:update', selectedId, {
          name: editForm.name.trim(),
          role: editForm.role,
          description: editForm.description.trim() || null,
          appearance: editForm.appearance.trim() || null,
        });

        await loadCharacters();
        showMessage('success', '角色更新成功');
      }

      setIsEditing(false);
      setIsCreating(false);
    } catch (error) {
      console.error('保存失败:', error);
      showMessage('error', error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 删除角色
  const handleDelete = async () => {
    if (!selectedId) return;

    if (!confirm('确定要删除这个角色吗？此操作不可撤销。')) {
      return;
    }

    try {
      setIsDeleting(true);
      await window.electron.invoke('character:delete', selectedId);
      await loadCharacters();
      setSelectedId(null);
      showMessage('success', '角色已删除');
    } catch (error) {
      console.error('删除失败:', error);
      showMessage('error', '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 生成外貌特征
  const handleGenerateAppearance = async () => {
    if (!selectedId) return;

    try {
      setIsGeneratingAppearance(true);
      showMessage('info', 'AI 正在生成外貌特征...');

      const appearance = await window.electron.invoke('character:generate-appearance', selectedId);
      // 更新本地表单
      setEditForm(prev => ({ ...prev, appearance }));
      await loadCharacters();

      showMessage('success', '外貌特征生成成功');
    } catch (error) {
      console.error('生成外貌特征失败:', error);
      showMessage('error', error instanceof Error ? error.message : '生成外貌特征失败');
    } finally {
      setIsGeneratingAppearance(false);
    }
  };

  // 生成头像
  const handleGenerateAvatar = async () => {
    if (!selectedId) return;

    try {
      setIsGeneratingAvatar(true);
      showMessage('info', 'AI 正在生成头像...');

      await window.electron.invoke('character:generate-avatar', selectedId);
      await loadCharacters();

      showMessage('success', '头像生成成功');
    } catch (error) {
      console.error('生成头像失败:', error);
      showMessage('error', error instanceof Error ? error.message : '生成头像失败');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  // 生成三视图
  const handleGenerateViews = async () => {
    if (!selectedId || !selectedCharacter) return;

    if (!selectedCharacter.appearance) {
      showMessage('error', '请先填写或生成外貌特征');
      return;
    }

    const characterName = selectedCharacter.name;
    const taskId = addTask({
      type: 'views',
      status: 'running',
      title: `生成三视图 - ${characterName}`,
      message: '正在生成正面视图...',
      total: 3,
      completed: 0,
      navigateTo: `/project/${projectId}/characters`,
      entityId: selectedId,
    });

    showMessage('info', '任务已开始，请留意左下角任务进度提醒');

    try {
      setIsGeneratingViews(true);

      // 监听进度
      const progressHandler = (...args: unknown[]) => {
        const data = args[0] as { taskType: string; progress: number };
        if (data.taskType === 'views') {
          const completedViews = Math.floor(data.progress / 33.3);
          const viewNames = ['正面', '侧面', '背面'];
          const currentView = viewNames[Math.min(completedViews, 2)];
          updateTask(taskId, {
            completed: completedViews,
            message: completedViews < 3 ? `正在生成${currentView}视图...` : '完成中...',
          });
        }
      };
      window.electron.on('ai:progress', progressHandler);

      await window.electron.invoke('character:generate-views', selectedId);
      window.electron.off('ai:progress', progressHandler);

      await loadCharacters();
      completeTask(taskId, {
        message: `${characterName} 的三视图已生成完成`,
        completed: 3,
      });
    } catch (error) {
      console.error('生成三视图失败:', error);
      errorTask(taskId, error instanceof Error ? error.message : '生成失败');
      showMessage('error', error instanceof Error ? error.message : '生成三视图失败');
    } finally {
      setIsGeneratingViews(false);
    }
  };

  // 设置选中的头像
  const handleSetAvatar = async (avatarPath: string) => {
    if (!selectedId) return;

    try {
      await window.electron.invoke('character:set-avatar', selectedId, avatarPath);
      await loadCharacters();
      showMessage('success', '头像已更新');
    } catch (error) {
      console.error('设置头像失败:', error);
      showMessage('error', '设置头像失败');
    }
  };

  if (isLoading) {
    return (
      <>
        <Toolbar title="角色" />
        <PageContainer className="flex items-center justify-center">
          <PixelLoading size="lg" text="加载角色中..." />
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Toolbar
        title="角色"
        actions={
          <>
            <ToolbarSearch
              placeholder="搜索角色..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <PixelButton
              variant="ghost"
              size="sm"
              leftIcon={<IconRefresh size={14} />}
              onClick={handleCleanupDuplicates}
              loading={isCleaningDuplicates}
              title="清理重复角色"
            >
              清理重复
            </PixelButton>
            <PixelButton
              variant="primary"
              size="sm"
              leftIcon={<IconPlus size={14} />}
              onClick={handleStartCreate}
            >
              新建角色
            </PixelButton>
          </>
        }
      />

      <PageContainer className="flex gap-6" padded>
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

        {/* 左侧：角色列表 */}
        <div className="flex-1 min-w-0">
          {filteredCharacters.length === 0 && !isCreating ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <div className="text-5xl mb-4">👤</div>
              <p className="mb-4">
                {searchQuery ? '没有找到匹配的角色' : '还没有创建角色'}
              </p>
              {!searchQuery && (
                <PixelButton variant="primary" leftIcon={<IconPlus size={14} />} onClick={handleStartCreate}>
                  创建第一个角色
                </PixelButton>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCharacters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  isSelected={selectedId === character.id}
                  onClick={() => {
                    setSelectedId(character.id);
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                />
              ))}
              <PixelCard
                interactive
                padding="none"
                className="aspect-square flex items-center justify-center border-dashed"
                onClick={handleStartCreate}
              >
                <div className="text-center">
                  <IconPlus size={32} className="text-text-muted mx-auto mb-2" />
                  <span className="text-sm text-text-muted">添加角色</span>
                </div>
              </PixelCard>
            </div>
          )}
        </div>

        {/* 右侧：角色详情/编辑表单 */}
        <div className="w-80 shrink-0">
          {selectedCharacter || isCreating ? (
            <>
              <PixelCard padding="md" className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-pixel text-sm text-text-primary">
                    {isCreating ? '新建角色' : '角色详情'}
                  </h3>
                  {!isCreating && (
                    <div className="flex gap-1">
                      {isEditing ? (
                        <>
                          <PixelButton
                            variant="ghost"
                            size="icon"
                            shadow={false}
                            onClick={handleCancel}
                            disabled={isSaving}
                          >
                            <IconClose size={14} />
                          </PixelButton>
                          <PixelButton
                            variant="primary"
                            size="icon"
                            shadow={false}
                            onClick={handleSave}
                            loading={isSaving}
                          >
                            <IconSave size={14} />
                          </PixelButton>
                        </>
                      ) : (
                        <>
                          <PixelButton
                            variant="ghost"
                            size="icon"
                            shadow={false}
                            onClick={() => setIsEditing(true)}
                          >
                            <IconEdit size={14} />
                          </PixelButton>
                          <PixelButton
                            variant="ghost"
                            size="icon"
                            shadow={false}
                            onClick={handleDelete}
                            loading={isDeleting}
                          >
                            <IconTrash size={14} />
                          </PixelButton>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 头像显示 */}
                {!isCreating && (
                  <>
                    <div className="w-32 h-32 mx-auto mb-4 bg-bg-tertiary border-2 border-black flex items-center justify-center overflow-hidden">
                      {selectedCharacter?.avatarPath ? (
                        <img
                          src={getLocalFileUrl(selectedCharacter.avatarPath) || ''}
                          alt={selectedCharacter.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-5xl">👤</span>
                      )}
                    </div>

                    <div className="flex justify-center gap-2 mb-4">
                      <PixelButton
                        variant="secondary"
                        size="sm"
                        leftIcon={<IconAI size={14} />}
                        onClick={handleGenerateAvatar}
                        loading={isGeneratingAvatar}
                        disabled={!selectedCharacter?.appearance || isGeneratingViews}
                      >
                        AI 生成
                      </PixelButton>
                    </div>
                    {!selectedCharacter?.appearance && (
                      <p className="text-xs text-text-muted text-center mb-4">
                        请先填写外貌特征才能生成头像
                      </p>
                    )}
                  </>
                )}

                {/* 表单 */}
                <div className="space-y-4">
                  <PixelInput
                    label="角色名称"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    disabled={!isEditing && !isCreating}
                    placeholder="输入角色名称"
                  />

                  <div>
                    <label className="block text-xs font-pixel text-text-secondary mb-1">
                      角色定位
                    </label>
                    <div className="flex gap-2">
                      {roleOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => (isEditing || isCreating) && setEditForm({ ...editForm, role: option.value })}
                          className={cn(
                            'flex-1 px-2 py-1.5 text-xs border-2 border-black transition-colors',
                            editForm.role === option.value
                              ? 'bg-primary-main text-white'
                              : 'bg-bg-tertiary text-text-secondary',
                            (!isEditing && !isCreating) && 'opacity-60 cursor-not-allowed'
                          )}
                          disabled={!isEditing && !isCreating}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <PixelTextarea
                    label="角色描述"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    disabled={!isEditing && !isCreating}
                    size="sm"
                    placeholder="描述角色的性格、背景等"
                  />

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-pixel text-text-secondary">外貌特征</label>
                      {!isCreating && selectedId && (
                        <PixelButton
                          variant="ghost"
                          size="sm"
                          leftIcon={<IconAI size={12} />}
                          onClick={handleGenerateAppearance}
                          loading={isGeneratingAppearance}
                          disabled={isEditing}
                        >
                          AI 生成
                        </PixelButton>
                      )}
                    </div>
                    <PixelTextarea
                      value={editForm.appearance}
                      onChange={(e) => setEditForm({ ...editForm, appearance: e.target.value })}
                      disabled={!isEditing && !isCreating}
                      size="sm"
                      helperText="用于 AI 生成保持一致性"
                      placeholder="描述角色的外貌特征"
                    />
                  </div>
                </div>

                {/* 创建模式按钮 */}
                {isCreating && (
                  <div className="flex gap-2 mt-4">
                    <PixelButton variant="ghost" fullWidth onClick={handleCancel}>
                      取消
                    </PixelButton>
                    <PixelButton
                      variant="primary"
                      fullWidth
                      onClick={handleSave}
                      loading={isSaving}
                    >
                      创建
                    </PixelButton>
                  </div>
                )}
              </PixelCard>

              {/* 生成的头像/三视图 */}
              {!isCreating && selectedCharacter && (
                <PixelCard padding="md">
                  <h3 className="font-pixel text-sm text-text-primary mb-3">生成的头像</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedCharacter.generatedAvatars.length > 0 ? (
                      selectedCharacter.generatedAvatars.map((avatarPath, i) => {
                        // 判断是否是三视图
                        const isView = avatarPath.includes('view_front') || avatarPath.includes('view_side') || avatarPath.includes('view_back');
                        const viewLabel = avatarPath.includes('view_front') ? '正' :
                                         avatarPath.includes('view_side') ? '侧' :
                                         avatarPath.includes('view_back') ? '背' : '';
                        return (
                          <div
                            key={i}
                            onClick={() => handleSetAvatar(avatarPath)}
                            className={cn(
                              'aspect-square bg-bg-tertiary border-2 border-black cursor-pointer overflow-hidden hover:opacity-80 transition-opacity relative',
                              selectedCharacter.avatarPath === avatarPath && 'ring-2 ring-primary-main'
                            )}
                          >
                            <img
                              src={getLocalFileUrl(avatarPath) || ''}
                              alt={`头像 ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {isView && viewLabel && (
                              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                                {viewLabel}
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      [1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="aspect-square bg-bg-tertiary border-2 border-black flex items-center justify-center"
                        >
                          <span className="text-xs text-text-muted">空</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <PixelButton
                      variant="primary"
                      fullWidth
                      leftIcon={<IconRefresh size={14} />}
                      onClick={handleGenerateViews}
                      loading={isGeneratingViews}
                      disabled={!selectedCharacter.appearance || isGeneratingAvatar}
                    >
                      生成三视图
                    </PixelButton>
                  </div>
                  <p className="text-xs text-text-muted text-center mt-2">
                    三视图包含正面、侧面、背面，用于多视角参考
                  </p>
                </PixelCard>
              )}
            </>
          ) : (
            <PixelCard padding="lg" className="text-center">
              <p className="text-text-muted">选择一个角色查看详情</p>
            </PixelCard>
          )}
        </div>
      </PageContainer>
    </>
  );
}
