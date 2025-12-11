import { create } from 'zustand';
import { createIpcCall } from '../hooks/useIpc';

// ==================== 类型定义 ====================

export interface Project {
  id: string;
  name: string;
  description?: string;
  styleId?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'rendering' | 'completed';
  progress: number;
  thumbnailUrl?: string;
}

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  isLoading: boolean;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Async actions
  fetchProjects: () => Promise<void>;
  createProject: (data: { name: string; description?: string; styleId?: string }) => Promise<string>;
  removeProject: (id: string) => Promise<void>;
}

// ==================== IPC Calls ====================

const projectListIpc = createIpcCall('project:list');
const projectCreateIpc = createIpcCall('project:create');
const projectDeleteIpc = createIpcCall('project:delete');
const projectUpdateIpc = createIpcCall('project:update');

// ==================== Store ====================

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProjectId: null,
  isLoading: false,

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),

  updateProject: async (id, updates) => {
    try {
      await projectUpdateIpc(id, updates);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      }));
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  },

  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
    })),

  setCurrentProject: (id) => set({ currentProjectId: id }),

  setLoading: (isLoading) => set({ isLoading }),

  // Async actions
  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await projectListIpc();
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      set({ isLoading: false });
    }
  },

  createProject: async (data) => {
    try {
      const projectId = await projectCreateIpc(data);
      // Refetch projects to include the new one
      const projects = await projectListIpc();
      set({ projects });
      return projectId;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },

  removeProject: async (id) => {
    try {
      await projectDeleteIpc(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
      }));
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  },
}));

// ==================== Selectors ====================

export const useCurrentProject = () => {
  const { projects, currentProjectId } = useProjectStore();
  return projects.find((p) => p.id === currentProjectId) || null;
};
