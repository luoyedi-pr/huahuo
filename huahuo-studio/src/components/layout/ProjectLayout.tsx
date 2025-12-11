import { useParams } from '@tanstack/react-router';
import { useProjectStore } from '@/stores/project';
import { useEffect } from 'react';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

/**
 * 项目内页面布局
 * 负责加载当前项目数据并提供给子组件
 */
export function ProjectLayout({ children }: ProjectLayoutProps) {
  const { projectId } = useParams({ from: '/project/$projectId' });
  const { setCurrentProject, projects } = useProjectStore();

  // 设置当前项目
  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId);
    }
    return () => {
      setCurrentProject(null);
    };
  }, [projectId, setCurrentProject]);

  // 检查项目是否存在
  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📁</div>
          <h2 className="font-pixel text-xl text-text-primary mb-2">项目不存在</h2>
          <p className="text-text-secondary">该项目可能已被删除或移动</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProjectLayout;
