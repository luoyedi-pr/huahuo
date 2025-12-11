import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTaskNotification, TaskNotification, TaskStatus } from '@/contexts/TaskNotificationContext';
import { PixelProgress } from '@/components/ui/pixel-progress';
import { cn } from '@/lib/utils';

// 像素小人放烟火的帧动画
const FireworkFrames = [
  // 帧1: 准备点火
  `
    ░░██░░
    ░████░
    ░░██░░
    ░░██░░
    ░████░
  `,
  // 帧2: 点火中
  `
    ░░██░░
    ░████░
    ░░██░░
    ░░██▓░
    ░████░
  `,
  // 帧3: 烟火上升
  `
    ░░▓▓░░
    ░████░
    ░░██░░
    ░░██░░
    ░████░
  `,
  // 帧4: 烟火爆发
  `
    ▓░██░▓
    ░████░
    ░░██░░
    ░░██░░
    ░████░
  `,
  // 帧5: 烟火绽放
  `
    ▓▓██▓▓
    ▓████▓
    ░░██░░
    ░░██░░
    ░████░
  `,
  // 帧6: 烟火消散
  `
    ░▓██▓░
    ░████░
    ░░██░░
    ░░██░░
    ░████░
  `,
];

// 完成状态的帧
const CompletedFrame = `
  ░░██░░
  ░████░
  ░░██░░
  ░░██░░
  ░████░
  ░░░░░░
  ░░✓░░░
`;

// 错误状态的帧
const ErrorFrame = `
  ░░██░░
  ░████░
  ░░██░░
  ░░██░░
  ░████░
  ░░░░░░
  ░░✗░░░
`;

function PixelFireworkAnimation({ status }: { status: TaskStatus }) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % FireworkFrames.length);
    }, 200);

    return () => clearInterval(interval);
  }, [status]);

  const getFrame = () => {
    if (status === 'completed') return CompletedFrame;
    if (status === 'error') return ErrorFrame;
    return FireworkFrames[frameIndex];
  };

  return (
    <div className="font-mono text-[6px] leading-[6px] whitespace-pre select-none">
      {getFrame().split('\n').map((line, i) => (
        <div key={i} className={cn(
          status === 'running' && 'text-primary-main',
          status === 'completed' && 'text-status-success',
          status === 'error' && 'text-status-error',
        )}>
          {line.replace(/░/g, ' ').replace(/█/g, '█').replace(/▓/g, '▓')}
        </div>
      ))}
    </div>
  );
}

function TaskItem({ task, onDismiss, onNavigate }: {
  task: TaskNotification;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  const isCompleted = task.status === 'completed';
  const isError = task.status === 'error';
  const isRunning = task.status === 'running';

  const getProgressText = () => {
    if (task.total && task.completed !== undefined) {
      const errorText = task.errors ? `, ${task.errors} 失败` : '';
      return `${task.completed}/${task.total} 完成${errorText}`;
    }
    if (task.progress !== undefined) {
      return `${Math.round(task.progress)}%`;
    }
    return '';
  };

  return (
    <div
      className={cn(
        'bg-bg-secondary border-2 border-black shadow-pixel p-3 transition-all duration-300',
        isCompleted && 'cursor-pointer hover:bg-bg-tertiary',
        isError && 'border-status-error',
      )}
      onClick={isCompleted ? onNavigate : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <PixelFireworkAnimation status={task.status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn(
              'font-pixel text-xs truncate',
              isRunning && 'text-primary-main',
              isCompleted && 'text-status-success',
              isError && 'text-status-error',
            )}>
              {task.title}
            </h4>
            {!isRunning && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5 truncate">
            {task.message}
          </p>
          {isRunning && (
            <>
              {(task.progress !== undefined || task.total !== undefined) && (
                <PixelProgress
                  value={task.progress ?? ((task.completed ?? 0) / (task.total ?? 1) * 100)}
                  variant="gradient"
                  className="mt-2 h-1"
                />
              )}
              <p className="text-[10px] text-text-muted mt-1">
                {getProgressText()}
              </p>
            </>
          )}
          {isCompleted && task.navigateTo && (
            <p className="text-[10px] text-primary-main mt-1 animate-pulse">
              点击查看结果 →
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaskNotificationPanel() {
  const { tasks, dismissTask, clearCompleted } = useTaskNotification();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);

  // 过滤未被忽略的任务
  const visibleTasks = tasks.filter(t => !t.dismissed);
  const runningTasks = visibleTasks.filter(t => t.status === 'running');
  const completedTasks = visibleTasks.filter(t => t.status !== 'running');

  // 没有可见任务时不显示
  if (visibleTasks.length === 0) {
    return null;
  }

  const handleNavigate = (task: TaskNotification) => {
    if (task.navigateTo) {
      navigate({ to: task.navigateTo });
      dismissTask(task.id);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 w-72">
      {/* 标题栏 */}
      <div
        className="bg-primary-main border-2 border-black px-3 py-2 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-pixel">
            任务进度
          </span>
          {runningTasks.length > 0 && (
            <span className="bg-white text-primary-main text-[10px] px-1.5 py-0.5 font-pixel">
              {runningTasks.length} 进行中
            </span>
          )}
        </div>
        <span className="text-white text-xs">
          {isExpanded ? '▼' : '▲'}
        </span>
      </div>

      {/* 任务列表 */}
      {isExpanded && (
        <div className="max-h-80 overflow-y-auto space-y-2 mt-2">
          {/* 进行中的任务 */}
          {runningTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onDismiss={() => dismissTask(task.id)}
              onNavigate={() => handleNavigate(task)}
            />
          ))}

          {/* 已完成的任务 */}
          {completedTasks.length > 0 && (
            <>
              {runningTasks.length > 0 && completedTasks.length > 0 && (
                <div className="border-t border-border my-2" />
              )}
              {completedTasks.slice(0, 3).map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onDismiss={() => dismissTask(task.id)}
                  onNavigate={() => handleNavigate(task)}
                />
              ))}
              {completedTasks.length > 3 && (
                <button
                  onClick={clearCompleted}
                  className="w-full text-center text-[10px] text-text-muted hover:text-primary-main py-1"
                >
                  清除 {completedTasks.length} 条已完成
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
