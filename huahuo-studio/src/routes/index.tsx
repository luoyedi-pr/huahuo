import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Toolbar, ToolbarSearch } from '@/components/layout/Toolbar';
import { PageContainer, PageHeader } from '@/components/layout/AppLayout';
import { PixelCard } from '@/components/ui/pixel-card';
import { PixelButton } from '@/components/ui/pixel-button';
import { PixelBadge } from '@/components/ui/pixel-badge';
import { PixelProgress } from '@/components/ui/pixel-progress';
import { IconPlus, IconFolder, IconMagic, IconTrash } from '@/components/ui/pixel-icons';
import { useProjectStore, type Project } from '@/stores/project';

/** 项目卡片 */
function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: (id: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const statusConfig = {
    draft: { label: '草稿', variant: 'default' as const },
    rendering: { label: '渲染中', variant: 'warning' as const },
    completed: { label: '已完成', variant: 'success' as const },
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(project.id);
    setShowConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <div className="relative group">
      <Link to={`/project/${project.id}` as any}>
        <PixelCard interactive padding="none" className="h-full overflow-hidden">
          {/* 封面 */}
          <div className="aspect-video bg-bg-tertiary flex items-center justify-center relative">
            {project.thumbnailUrl ? (
              <img
                src={project.thumbnailUrl}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <IconFolder size={48} className="text-text-muted" />
            )}
            <div className="absolute top-2 right-2">
              <PixelBadge variant={statusConfig[project.status].variant} size="sm">
                {statusConfig[project.status].label}
              </PixelBadge>
            </div>
          </div>

          {/* 信息 */}
          <div className="p-4">
            <h3 className="font-pixel text-sm text-text-primary mb-2 truncate">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-xs text-text-secondary mb-3 line-clamp-2">
                {project.description}
              </p>
            )}
            <PixelProgress value={project.progress} size="sm" variant="gradient" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text-muted">{project.progress}% 完成</span>
              <span className="text-xs text-text-muted">{project.updatedAt}</span>
            </div>
          </div>
        </PixelCard>
      </Link>

      {/* 删除按钮 - 悬停显示 */}
      <button
        onClick={handleDeleteClick}
        className="absolute top-2 left-2 p-2 bg-status-error/90 border-2 border-black shadow-pixel opacity-0 group-hover:opacity-100 transition-opacity hover:bg-status-error"
        title="删除项目"
      >
        <IconTrash size={14} className="text-white" />
      </button>

      {/* 删除确认弹窗 */}
      {showConfirm && (
        <div
          className="absolute inset-0 bg-black/70 flex items-center justify-center z-10"
          onClick={handleCancelDelete}
        >
          <div
            className="bg-bg-primary border-2 border-black shadow-pixel p-4 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-text-primary mb-4">
              确定要删除「{project.name}」吗？
            </p>
            <p className="text-xs text-text-muted mb-4">
              此操作不可撤销，所有数据将被删除。
            </p>
            <div className="flex gap-2 justify-end">
              <PixelButton variant="ghost" size="sm" onClick={handleCancelDelete}>
                取消
              </PixelButton>
              <PixelButton variant="danger" size="sm" onClick={handleConfirmDelete}>
                删除
              </PixelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 新建项目卡片 */
function NewProjectCard() {
  const { createProject } = useProjectStore();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      await createProject({ name: '新建项目', description: '' });
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PixelCard
      interactive
      padding="none"
      className="h-full flex flex-col items-center justify-center min-h-[280px] border-dashed"
      onClick={handleCreate}
    >
      <IconPlus size={48} className={`${isCreating ? 'opacity-50' : ''} text-text-muted mb-3`} />
      <span className="font-pixel text-sm text-text-muted">
        {isCreating ? '创建中...' : '新建项目'}
      </span>
    </PixelCard>
  );
}

export default function HomePage() {
  const { projects, fetchProjects, removeProject } = useProjectStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        await fetchProjects();
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, [fetchProjects]);

  const handleDeleteProject = async (id: string) => {
    try {
      await removeProject(id);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  return (
    <>
      <Toolbar
        title="工作台"
        actions={<ToolbarSearch placeholder="搜索项目..." />}
      />

      <PageContainer>
        <PageHeader
          title="我的项目"
          description="管理你的 AI 短剧项目"
          actions={
            <Link to="/automation">
              <PixelButton variant="primary" leftIcon={<IconMagic size={16} />}>
                一键生成
              </PixelButton>
            </Link>
          }
        />

        {/* 项目网格 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-text-muted">加载项目中...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <NewProjectCard />
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDeleteProject}
                />
              ))}
            </div>

            {/* 空状态 */}
            {projects.length === 0 && (
              <div className="text-center py-12">
                <IconFolder size={64} className="text-text-muted mx-auto mb-4" />
                <h3 className="font-pixel text-lg text-text-primary mb-2">
                  还没有项目
                </h3>
                <p className="text-text-secondary mb-6">
                  创建新项目或使用「一键生成」快速开始
                </p>
                <div className="flex gap-4 justify-center">
                  <PixelButton variant="ghost">新建空白项目</PixelButton>
                  <Link to="/automation">
                    <PixelButton variant="primary" leftIcon={<IconMagic size={16} />}>
                      一键生成
                    </PixelButton>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </PageContainer>
    </>
  );
}
