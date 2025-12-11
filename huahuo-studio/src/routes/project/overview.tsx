import { useState, useEffect } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Toolbar } from '@/components/layout/Toolbar';
import { PageContainer, PageHeader } from '@/components/layout/AppLayout';
import { PixelCard } from '@/components/ui/pixel-card';
import { PixelButton } from '@/components/ui/pixel-button';
import { PixelProgress } from '@/components/ui/pixel-progress';
import { PixelBadge } from '@/components/ui/pixel-badge';
import { PixelInput } from '@/components/ui/pixel-input';
import { PixelTextarea } from '@/components/ui/pixel-textarea';
import {
  IconScript, IconCharacter, IconStoryboard, IconRender,
  IconVideo, IconEdit, IconPlay, IconBolt, IconClose,
} from '@/components/ui/pixel-icons';
import { useProjectStore } from '@/stores/project';

interface ProjectStats {
  script: { done: number; total: number };
  characters: { done: number; total: number };
  storyboard: { done: number; total: number };
  rendered: { done: number; total: number };
}

interface StyleInfo {
  id: string;
  name: string;
  description: string;
}

interface StyleCategory {
  name: string;
  styles: StyleInfo[];
}

const emptyStats: ProjectStats = {
  script: { done: 0, total: 1 },
  characters: { done: 0, total: 0 },
  storyboard: { done: 0, total: 0 },
  rendered: { done: 0, total: 0 },
};

/** 统计卡片 */
function StatCard({
  icon: Icon,
  label,
  value,
  total,
  to,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  total?: number;
  to: string;
}) {
  return (
    <Link to={to}>
      <PixelCard interactive padding="md" className="h-full">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-main/20 border-2 border-black">
            <Icon size={24} className="text-primary-main" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-text-muted mb-1">{label}</p>
            <div className="flex items-baseline gap-1">
              <span className="font-pixel text-2xl text-text-primary">{value}</span>
              {total !== undefined && (
                <span className="text-sm text-text-muted">/ {total}</span>
              )}
            </div>
          </div>
        </div>
      </PixelCard>
    </Link>
  );
}

/** 快捷操作 */
function QuickAction({
  icon: Icon,
  label,
  description,
  to,
  variant = 'default',
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  description: string;
  to: string;
  variant?: 'default' | 'primary';
}) {
  return (
    <Link to={to}>
      <PixelCard interactive padding="md">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 border-2 border-black ${
              variant === 'primary' ? 'bg-primary-main' : 'bg-secondary-main'
            }`}
          >
            <Icon
              size={20}
              className={variant === 'primary' ? 'text-white' : 'text-bg-primary'}
            />
          </div>
          <div>
            <h4 className="font-medium text-sm text-text-primary">{label}</h4>
            <p className="text-xs text-text-secondary">{description}</p>
          </div>
        </div>
      </PixelCard>
    </Link>
  );
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams({ from: '/project/$projectId' });
  const { projects, updateProject } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);

  const [stats, setStats] = useState<ProjectStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);

  // 编辑弹窗状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStyleId, setEditStyleId] = useState('animation_anime_2d');
  const [isSaving, setIsSaving] = useState(false);

  // 风格分类数据
  const [styleCategories, setStyleCategories] = useState<Record<string, StyleCategory>>({});
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);

  // 加载风格分类
  useEffect(() => {
    const loadStyles = async () => {
      setIsLoadingStyles(true);
      try {
        const categories = await window.electron.invoke('style:categories');
        console.log('Loaded style categories:', categories);
        if (categories && typeof categories === 'object') {
          setStyleCategories(categories);
        } else {
          console.error('Invalid style categories response:', categories);
        }
      } catch (error) {
        console.error('Failed to load styles:', error);
      } finally {
        setIsLoadingStyles(false);
      }
    };
    loadStyles();
  }, []);

  // 打开编辑弹窗
  const handleOpenEdit = () => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || '');
      setEditStyleId(project.styleId || 'animation_anime_2d');
      setShowEditModal(true);
    }
  };

  // 保存项目信息
  const handleSaveEdit = async () => {
    if (!projectId || !editName.trim()) return;

    setIsSaving(true);
    try {
      await updateProject(projectId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        styleId: editStyleId,
      });
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 获取当前风格名称
  const getCurrentStyleName = () => {
    for (const category of Object.values(styleCategories)) {
      const style = category.styles.find(s => s.id === (project?.styleId || 'animation_anime_2d'));
      if (style) return style.name;
    }
    return '未知风格';
  };

  // 加载项目统计数据
  useEffect(() => {
    const loadStats = async () => {
      if (!projectId) return;

      setIsLoading(true);
      try {
        const data = await window.electron.invoke('project:stats', projectId);
        setStats(data);
      } catch (error) {
        console.error('Failed to load project stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [projectId]);

  if (!project) {
    return <div>项目不存在</div>;
  }

  // 计算总体进度
  const calculateProgress = () => {
    const totalItems =
      stats.script.total +
      stats.characters.total +
      stats.storyboard.total +
      stats.rendered.total;

    if (totalItems === 0) return 0;

    const completedItems =
      stats.script.done +
      stats.characters.done +
      stats.storyboard.done +
      stats.rendered.done;

    return Math.round((completedItems / totalItems) * 100);
  };

  const progress = calculateProgress();

  return (
    <>
      <Toolbar
        title="项目概览"
        actions={
          <PixelButton variant="primary" size="sm" leftIcon={<IconPlay size={14} />}>
            预览
          </PixelButton>
        }
      />

      <PageContainer>
        <PageHeader
          title={project.name}
          description={
            <span>
              {project.description || '暂无描述'}
              <span className="ml-3 text-xs px-2 py-0.5 bg-primary-main/20 border border-primary-main text-primary-main">
                {getCurrentStyleName()}
              </span>
            </span>
          }
          actions={
            <PixelButton variant="ghost" size="sm" leftIcon={<IconEdit size={14} />} onClick={handleOpenEdit}>
              编辑信息
            </PixelButton>
          }
        />

        {/* 整体进度 */}
        <PixelCard padding="lg" className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-pixel text-sm text-text-primary">项目进度</h3>
            <PixelBadge variant={progress === 100 ? 'success' : progress > 0 ? 'warning' : 'default'}>
              {progress === 100 ? '已完成' : progress > 0 ? '进行中' : '未开始'}
            </PixelBadge>
          </div>
          <PixelProgress
            value={progress}
            variant="gradient"
            size="lg"
            showValue
          />
        </PixelCard>

        {/* 统计概览 */}
        <section className="mb-8">
          <h2 className="font-pixel text-sm text-text-secondary mb-4">完成度</h2>
          {isLoading ? (
            <div className="text-center py-4 text-text-muted">加载中...</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={IconScript}
                label="剧本"
                value={stats.script.done}
                total={stats.script.total}
                to={`/project/${projectId}/script`}
              />
              <StatCard
                icon={IconCharacter}
                label="角色"
                value={stats.characters.done}
                total={stats.characters.total}
                to={`/project/${projectId}/characters`}
              />
              <StatCard
                icon={IconStoryboard}
                label="分镜"
                value={stats.storyboard.done}
                total={stats.storyboard.total}
                to={`/project/${projectId}/storyboard`}
              />
              <StatCard
                icon={IconRender}
                label="已渲染"
                value={stats.rendered.done}
                total={stats.rendered.total}
                to={`/project/${projectId}/render`}
              />
            </div>
          )}
        </section>

        {/* 快捷操作 */}
        <section className="mb-8">
          <h2 className="font-pixel text-sm text-text-secondary mb-4">快捷操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickAction
              icon={IconScript}
              label="编辑剧本"
              description="修改剧本内容"
              to={`/project/${projectId}/script`}
            />
            <QuickAction
              icon={IconCharacter}
              label="管理角色"
              description="添加或编辑角色"
              to={`/project/${projectId}/characters`}
              variant="primary"
            />
            <QuickAction
              icon={IconBolt}
              label="批量渲染"
              description="渲染所有未完成分镜"
              to={`/project/${projectId}/render`}
            />
            <QuickAction
              icon={IconStoryboard}
              label="分镜编辑"
              description="编辑分镜画面"
              to={`/project/${projectId}/storyboard`}
              variant="primary"
            />
            <QuickAction
              icon={IconVideo}
              label="导出视频"
              description="合成并导出成片"
              to={`/project/${projectId}/export`}
            />
          </div>
        </section>

        {/* 项目提示 */}
        <section>
          <h2 className="font-pixel text-sm text-text-secondary mb-4">快速开始</h2>
          <PixelCard padding="md">
            <div className="space-y-3">
              {stats.script.done === 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-status-warning" />
                  <span className="text-text-secondary">请先编辑剧本内容</span>
                  <Link
                    to="/project/$projectId/script"
                    params={{ projectId: projectId! }}
                    className="text-primary-main ml-auto hover:underline"
                  >
                    去编辑
                  </Link>
                </div>
              )}
              {stats.script.done > 0 && stats.characters.total === 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-status-info" />
                  <span className="text-text-secondary">剧本已就绪，可以添加角色了</span>
                  <Link
                    to="/project/$projectId/characters"
                    params={{ projectId: projectId! }}
                    className="text-primary-main ml-auto hover:underline"
                  >
                    添加角色
                  </Link>
                </div>
              )}
              {stats.characters.total > 0 && stats.storyboard.total === 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-status-info" />
                  <span className="text-text-secondary">角色已添加，可以创建分镜了</span>
                  <Link
                    to="/project/$projectId/storyboard"
                    params={{ projectId: projectId! }}
                    className="text-primary-main ml-auto hover:underline"
                  >
                    创建分镜
                  </Link>
                </div>
              )}
              {stats.storyboard.total > 0 && stats.storyboard.done < stats.storyboard.total && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-status-warning" />
                  <span className="text-text-secondary">
                    还有 {stats.storyboard.total - stats.storyboard.done} 个分镜未生成图片
                  </span>
                  <Link
                    to="/project/$projectId/render"
                    params={{ projectId: projectId! }}
                    className="text-primary-main ml-auto hover:underline"
                  >
                    去渲染
                  </Link>
                </div>
              )}
              {stats.storyboard.done > 0 && stats.rendered.done < stats.storyboard.done && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-status-warning" />
                  <span className="text-text-secondary">
                    还有 {stats.storyboard.done - stats.rendered.done} 个分镜未生成视频
                  </span>
                  <Link
                    to="/project/$projectId/render"
                    params={{ projectId: projectId! }}
                    className="text-primary-main ml-auto hover:underline"
                  >
                    去渲染
                  </Link>
                </div>
              )}
              {stats.rendered.done > 0 && stats.rendered.done === stats.storyboard.total && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-status-success" />
                  <span className="text-text-secondary">所有分镜已渲染完成，可以导出了</span>
                  <Link
                    to="/project/$projectId/export"
                    params={{ projectId: projectId! }}
                    className="text-primary-main ml-auto hover:underline"
                  >
                    去导出
                  </Link>
                </div>
              )}
              {stats.script.done === 0 && stats.characters.total === 0 && stats.storyboard.total === 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-status-info" />
                  <span className="text-text-secondary">新项目已创建，开始你的创作吧！</span>
                </div>
              )}
            </div>
          </PixelCard>
        </section>
      </PageContainer>

      {/* 编辑项目信息弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary border-4 border-black shadow-pixel-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* 弹窗标题 */}
            <div className="flex items-center justify-between p-4 border-b-2 border-black sticky top-0 bg-bg-primary">
              <h2 className="font-pixel text-lg text-text-primary">编辑项目信息</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-bg-secondary"
              >
                <IconClose size={20} className="text-text-secondary" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">项目名称</label>
                <PixelInput
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="输入项目名称"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">项目描述</label>
                <PixelTextarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="输入项目描述（可选）"
                  rows={3}
                />
              </div>

              {/* 风格选择 */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">视觉风格</label>
                <p className="text-xs text-text-muted mb-3">选择项目的视觉风格，将应用于分镜图片和视频生成</p>

                {isLoadingStyles ? (
                  <div className="text-center py-4 text-text-muted">加载风格中...</div>
                ) : Object.keys(styleCategories).length === 0 ? (
                  <div className="text-center py-4 text-text-muted">
                    无法加载风格列表，请重启应用后重试
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(styleCategories).map(([key, category]) => (
                      <div key={key}>
                        <h4 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                          {category.name}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {category.styles.map((style) => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => setEditStyleId(style.id)}
                              className={`p-2 text-left border-2 transition-all ${
                                editStyleId === style.id
                                  ? 'border-primary-main bg-primary-main/10'
                                  : 'border-border hover:border-text-muted'
                              }`}
                            >
                              <div className="text-sm font-medium text-text-primary truncate">
                                {style.name}
                              </div>
                              <div className="text-xs text-text-muted mt-0.5 line-clamp-2">
                                {style.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗操作 */}
            <div className="flex justify-end gap-3 p-4 border-t-2 border-black sticky bottom-0 bg-bg-primary">
              <PixelButton variant="ghost" onClick={() => setShowEditModal(false)}>
                取消
              </PixelButton>
              <PixelButton
                variant="primary"
                onClick={handleSaveEdit}
                disabled={isSaving || !editName.trim()}
              >
                {isSaving ? '保存中...' : '保存'}
              </PixelButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
