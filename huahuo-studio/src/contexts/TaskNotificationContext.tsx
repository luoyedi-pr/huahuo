import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type TaskType =
  | 'avatar'
  | 'appearance'
  | 'views'
  | 'scene-image'
  | 'shot-image'
  | 'shot-video'
  | 'batch-scene'
  | 'batch-shot';

export type TaskStatus = 'running' | 'completed' | 'error';

export interface TaskNotification {
  id: string;
  type: TaskType;
  status: TaskStatus;
  title: string;
  message: string;
  progress?: number;
  total?: number;
  completed?: number;
  errors?: number;
  navigateTo?: string; // 完成后跳转的路径
  entityId?: string; // 关联的实体ID（如角色ID、场景ID等）
  createdAt: number;
  completedAt?: number;
  dismissed?: boolean;
}

interface TaskNotificationContextType {
  tasks: TaskNotification[];
  addTask: (task: Omit<TaskNotification, 'id' | 'createdAt'>) => string;
  updateTask: (id: string, updates: Partial<TaskNotification>) => void;
  completeTask: (id: string, updates?: Partial<TaskNotification>) => void;
  errorTask: (id: string, message: string) => void;
  dismissTask: (id: string) => void;
  clearCompleted: () => void;
  getActiveTask: () => TaskNotification | undefined;
}

const TaskNotificationContext = createContext<TaskNotificationContextType | null>(null);

export function TaskNotificationProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskNotification[]>([]);

  const addTask = useCallback((task: Omit<TaskNotification, 'id' | 'createdAt'>) => {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: TaskNotification = {
      ...task,
      id,
      createdAt: Date.now(),
    };
    setTasks(prev => [newTask, ...prev]);
    return id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<TaskNotification>) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ));
  }, []);

  const completeTask = useCallback((id: string, updates?: Partial<TaskNotification>) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? {
        ...task,
        ...updates,
        status: 'completed' as const,
        completedAt: Date.now()
      } : task
    ));
  }, []);

  const errorTask = useCallback((id: string, message: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? {
        ...task,
        status: 'error' as const,
        message,
        completedAt: Date.now()
      } : task
    ));
  }, []);

  const dismissTask = useCallback((id: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, dismissed: true } : task
    ));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(task => task.status === 'running'));
  }, []);

  const getActiveTask = useCallback(() => {
    return tasks.find(task => task.status === 'running');
  }, [tasks]);

  return (
    <TaskNotificationContext.Provider value={{
      tasks,
      addTask,
      updateTask,
      completeTask,
      errorTask,
      dismissTask,
      clearCompleted,
      getActiveTask,
    }}>
      {children}
    </TaskNotificationContext.Provider>
  );
}

export function useTaskNotification() {
  const context = useContext(TaskNotificationContext);
  if (!context) {
    throw new Error('useTaskNotification must be used within a TaskNotificationProvider');
  }
  return context;
}
