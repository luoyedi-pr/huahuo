import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Toolbar } from '@/components/layout/Toolbar';
import { PageContainer } from '@/components/layout/AppLayout';
import { PixelCard } from '@/components/ui/pixel-card';
import { PixelButton } from '@/components/ui/pixel-button';
import { PixelInput } from '@/components/ui/pixel-input';
import { PixelTextarea } from '@/components/ui/pixel-textarea';
import { PixelProgress, PixelStepProgress } from '@/components/ui/pixel-progress';
import {
  IconMagic, IconCheck,
  IconImage, IconBolt, IconFile,
} from '@/components/ui/pixel-icons';
import { cn } from '@/lib/utils';

type Stage = 'import' | 'processing' | 'result';
type ProcessStep = 'project' | 'parse' | 'characters' | 'storyboard' | 'image' | 'video';

interface ProcessingState {
  currentStep: ProcessStep;
  stepProgress: number;
  totalProgress: number;
  logs: Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }>;
}

interface GenerationResult {
  projectId: string;
  projectName: string;
  characterCount: number;
  shotCount: number;
  imagesGenerated: number;
  videosQueued: number;
}

/** 导入阶段 */
function ImportStage({
  projectName,
  script,
  generateImages,
  generateVideos,
  onProjectNameChange,
  onScriptChange,
  onGenerateImagesChange,
  onGenerateVideosChange,
  onStart,
  isStarting,
}: {
  projectName: string;
  script: string;
  generateImages: boolean;
  generateVideos: boolean;
  onProjectNameChange: (v: string) => void;
  onScriptChange: (v: string) => void;
  onGenerateImagesChange: (v: boolean) => void;
  onGenerateVideosChange: (v: boolean) => void;
  onStart: () => void;
  isStarting: boolean;
}) {
  // 从文件导入
  const handleFileImport = async () => {
    try {
      const result = await window.electron.invoke('dialog:open-file', {
        filters: [
          { name: '文本文件', extensions: ['txt', 'md'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (result && result.content) {
        onScriptChange(result.content);
        // 如果没有项目名，用文件名
        if (!projectName && result.fileName) {
          onProjectNameChange(result.fileName.replace(/\.[^.]+$/, ''));
        }
      }
    } catch (error) {
      console.error('导入文件失败:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-pixel text-2xl text-text-primary mb-2">一键生成</h2>
        <p className="text-text-secondary">
          导入剧本，AI 自动解析并生成分镜图像和视频
        </p>
      </div>

      <PixelCard padding="lg" className="mb-6">
        <div className="mb-4">
          <PixelInput
            label="项目名称"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="输入项目名称"
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-pixel text-sm text-text-primary">导入剧本</h3>
          <PixelButton
            variant="ghost"
            size="sm"
            leftIcon={<IconFile size={14} />}
            onClick={handleFileImport}
          >
            从文件导入
          </PixelButton>
        </div>

        <PixelTextarea
          placeholder={`在此粘贴剧本内容...

支持的格式：
【场景描述】 或 [场景描述] - 场景指示
（动作描述）或 (动作描述) - 动作
旁白：内容 - 旁白
角色名：对话内容 - 对话

示例：
【现代都市，豪华办公室】
（阳光透过落地窗洒进来）
陆总：你被解雇了。
（女主角惊讶地睁大眼睛）
小美：什么？为什么？`}
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          className="min-h-[300px]"
          showCount
        />

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={generateImages}
                onChange={(e) => onGenerateImagesChange(e.target.checked)}
                className="accent-primary-main"
              />
              生成分镜图像
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={generateVideos}
                onChange={(e) => onGenerateVideosChange(e.target.checked)}
                className="accent-primary-main"
              />
              生成分镜视频
            </label>
          </div>
        </div>
      </PixelCard>

      <div className="text-center">
        <PixelButton
          variant="primary"
          size="lg"
          glow="pink"
          leftIcon={<IconMagic size={18} />}
          onClick={onStart}
          loading={isStarting}
          disabled={!script.trim() || !projectName.trim()}
        >
          开始生成
        </PixelButton>
        {(!script.trim() || !projectName.trim()) && (
          <p className="text-xs text-text-muted mt-2">
            请输入项目名称和剧本内容
          </p>
        )}
      </div>
    </div>
  );
}

/** 处理阶段 */
function ProcessingStage({ state }: { state: ProcessingState }) {
  const steps = [
    { label: '创建项目', key: 'project' as const },
    { label: '解析剧本', key: 'parse' as const },
    { label: '创建角色', key: 'characters' as const },
    { label: '创建分镜', key: 'storyboard' as const },
    { label: '渲染图像', key: 'image' as const },
    { label: '合成视频', key: 'video' as const },
  ];

  const getStepStatus = (key: ProcessStep) => {
    const stepIndex = steps.findIndex((s) => s.key === key);
    const currentIndex = steps.findIndex((s) => s.key === state.currentStep);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-pixel text-2xl text-text-primary mb-2">处理中</h2>
        <p className="text-text-secondary">AI 正在努力工作，请稍候...</p>
      </div>

      {/* 步骤进度 */}
      <PixelCard padding="lg" className="mb-6">
        <PixelStepProgress
          steps={steps.map((s) => ({
            label: s.label,
            status: getStepStatus(s.key) as 'completed' | 'active' | 'pending',
          }))}
        />

        {/* 当前进度 */}
        <div className="mt-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">
              {steps.find((s) => s.key === state.currentStep)?.label}
            </span>
            <span className="text-text-primary font-mono">{state.stepProgress}%</span>
          </div>
          <PixelProgress
            value={state.stepProgress}
            variant="gradient"
            striped
            animated
            size="lg"
          />
        </div>

        {/* 总进度 */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted">总进度</span>
            <span className="text-text-muted">{state.totalProgress}%</span>
          </div>
          <PixelProgress value={state.totalProgress} size="sm" />
        </div>
      </PixelCard>

      {/* 日志输出 */}
      <PixelCard padding="md">
        <h3 className="font-pixel text-sm text-text-primary mb-3">处理日志</h3>
        <div className="bg-bg-primary border-2 border-black p-3 h-48 overflow-y-auto font-mono text-xs">
          {state.logs.map((log, i) => (
            <div
              key={i}
              className={cn(
                'mb-1',
                log.type === 'success' && 'text-status-success',
                log.type === 'error' && 'text-status-error',
                log.type === 'info' && 'text-text-secondary'
              )}
            >
              <span className="text-text-muted">[{log.time}]</span> {log.message}
            </div>
          ))}
        </div>
      </PixelCard>
    </div>
  );
}

/** 结果阶段 */
function ResultStage({
  result,
  onGoToProject,
  onStartNew,
}: {
  result: GenerationResult;
  onGoToProject: () => void;
  onStartNew: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-status-success flex items-center justify-center">
          <IconCheck size={32} className="text-white" />
        </div>
        <h2 className="font-pixel text-2xl text-text-primary mb-2">生成完成！</h2>
        <p className="text-text-secondary">项目 "{result.projectName}" 已创建</p>
      </div>

      {/* 统计结果 */}
      <PixelCard padding="lg" className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-pixel text-primary-main">{result.characterCount}</div>
            <div className="text-xs text-text-muted">角色</div>
          </div>
          <div>
            <div className="text-3xl font-pixel text-secondary-main">{result.shotCount}</div>
            <div className="text-xs text-text-muted">分镜</div>
          </div>
          <div>
            <div className="text-3xl font-pixel text-status-success">{result.imagesGenerated}</div>
            <div className="text-xs text-text-muted">图像任务</div>
          </div>
          <div>
            <div className="text-3xl font-pixel text-accent-purple">{result.videosQueued}</div>
            <div className="text-xs text-text-muted">视频任务</div>
          </div>
        </div>
      </PixelCard>

      {/* 提示信息 */}
      <PixelCard padding="md" className="mb-6 bg-status-info/10 border-status-info">
        <div className="flex items-start gap-3">
          <IconImage size={20} className="text-status-info shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary">
            <p className="mb-1">
              {result.imagesGenerated > 0 && '图像渲染任务已添加到队列。'}
              {result.videosQueued > 0 && '视频渲染任务将在图像完成后自动开始。'}
            </p>
            <p>你可以在项目的「渲染」页面查看进度。</p>
          </div>
        </div>
      </PixelCard>

      {/* 操作按钮 */}
      <div className="flex justify-center gap-4">
        <PixelButton variant="ghost" onClick={onStartNew}>
          创建新项目
        </PixelButton>
        <PixelButton
          variant="primary"
          leftIcon={<IconBolt size={14} />}
          onClick={onGoToProject}
        >
          进入项目
        </PixelButton>
      </div>
    </div>
  );
}

export default function AutomationPage() {
  const navigate = useNavigate();

  // 阶段状态
  const [stage, setStage] = useState<Stage>('import');

  // 输入状态
  const [projectName, setProjectName] = useState('');
  const [script, setScript] = useState('');
  const [generateImages, setGenerateImages] = useState(true);
  const [generateVideos, setGenerateVideos] = useState(false);

  // 处理状态
  const [isStarting, setIsStarting] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    currentStep: 'project',
    stepProgress: 0,
    totalProgress: 0,
    logs: [],
  });

  // 结果状态
  const [result, setResult] = useState<GenerationResult | null>(null);

  // 添加日志
  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setProcessingState(prev => ({
      ...prev,
      logs: [...prev.logs, { time, message, type }],
    }));
  }, []);

  // 更新进度
  const updateProgress = useCallback((step: ProcessStep, stepProgress: number, totalProgress: number) => {
    setProcessingState(prev => ({
      ...prev,
      currentStep: step,
      stepProgress,
      totalProgress,
    }));
  }, []);

  // 开始生成
  const handleStart = async () => {
    setIsStarting(true);
    setStage('processing');
    setProcessingState({
      currentStep: 'project',
      stepProgress: 0,
      totalProgress: 0,
      logs: [],
    });

    try {
      // 步骤 1: 创建项目
      addLog('正在创建项目...');
      updateProgress('project', 50, 5);

      const projectId = await window.electron.invoke('project:create', {
        name: projectName.trim(),
        description: `通过一键生成创建 - ${new Date().toLocaleDateString()}`,
      });

      addLog(`项目创建成功: ${projectName}`, 'success');
      updateProgress('project', 100, 10);

      // 步骤 2: AI 解析剧本
      addLog('正在解析剧本...');
      updateProgress('parse', 0, 15);

      let parseResult;
      try {
        parseResult = await window.electron.invoke('script:parse-ai', script);
        addLog(`解析完成: ${parseResult.scenes.length} 个场景, ${parseResult.characters.length} 个角色`, 'success');
      } catch (error) {
        addLog('AI 解析失败，使用本地解析', 'error');
        // 使用本地解析作为备选
        parseResult = await window.electron.invoke('script:parse-local', script);
        addLog(`本地解析完成: ${parseResult.lines?.length || 0} 行`, 'success');
      }

      updateProgress('parse', 100, 30);

      // 步骤 3: 创建角色
      addLog('正在创建角色...');
      updateProgress('characters', 0, 35);

      let characterCount = 0;
      const characters = parseResult.characters || [];

      for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        try {
          await window.electron.invoke('character:create', projectId, {
            name: char.name,
            role: char.role || 'supporting',
            description: char.description || '',
          });
          characterCount++;
          addLog(`创建角色: ${char.name}`);
        } catch (error) {
          addLog(`角色 ${char.name} 可能已存在`, 'info');
        }
        updateProgress('characters', Math.round(((i + 1) / characters.length) * 100), 35 + Math.round((i + 1) / characters.length * 10));
      }

      addLog(`角色创建完成: ${characterCount} 个`, 'success');
      updateProgress('characters', 100, 45);

      // 步骤 4: 创建分镜
      addLog('正在创建分镜...');
      updateProgress('storyboard', 0, 50);

      const scenes = parseResult.scenes || [];
      const shotsData = scenes.map((scene: any, index: number) => ({
        index,
        description: scene.description,
        dialogue: scene.dialogue,
        duration: scene.duration || 5,
        status: 'pending',
      }));

      if (shotsData.length > 0) {
        await window.electron.invoke('storyboard:create-batch', projectId, shotsData);
      }

      addLog(`分镜创建完成: ${shotsData.length} 个`, 'success');
      updateProgress('storyboard', 100, 60);

      // 获取创建的分镜 ID
      const shots = await window.electron.invoke('storyboard:list', projectId);

      // 步骤 5: 队列图像生成
      let imagesGenerated = 0;
      if (generateImages && shots.length > 0) {
        addLog('正在添加图像渲染任务...');
        updateProgress('image', 0, 65);

        const shotIds = shots.map((s: any) => s.id);
        await window.electron.invoke('render:create-batch', projectId, shotIds, 'image');
        imagesGenerated = shotIds.length;

        addLog(`已添加 ${imagesGenerated} 个图像渲染任务`, 'success');
        updateProgress('image', 100, 80);
      } else {
        updateProgress('image', 100, 80);
        addLog('跳过图像生成', 'info');
      }

      // 步骤 6: 队列视频生成
      let videosQueued = 0;
      if (generateVideos && shots.length > 0) {
        addLog('正在添加视频渲染任务...');
        updateProgress('video', 0, 85);

        // 注意：视频需要先有图像，所以这里只是排队
        const shotIds = shots.map((s: any) => s.id);
        await window.electron.invoke('render:create-batch', projectId, shotIds, 'video');
        videosQueued = shotIds.length;

        addLog(`已添加 ${videosQueued} 个视频渲染任务（将在图像完成后开始）`, 'success');
        updateProgress('video', 100, 100);
      } else {
        updateProgress('video', 100, 100);
        addLog('跳过视频生成', 'info');
      }

      // 完成
      addLog('🎉 全部完成！', 'success');

      setResult({
        projectId,
        projectName: projectName.trim(),
        characterCount,
        shotCount: shotsData.length,
        imagesGenerated,
        videosQueued,
      });

      setStage('result');

    } catch (error) {
      console.error('生成失败:', error);
      addLog(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
      // 保持在 processing 页面显示错误
    } finally {
      setIsStarting(false);
    }
  };

  // 进入项目
  const handleGoToProject = () => {
    if (result) {
      navigate({ to: '/project/$projectId', params: { projectId: result.projectId } });
    }
  };

  // 重新开始
  const handleStartNew = () => {
    setStage('import');
    setProjectName('');
    setScript('');
    setResult(null);
    setProcessingState({
      currentStep: 'project',
      stepProgress: 0,
      totalProgress: 0,
      logs: [],
    });
  };

  return (
    <>
      <Toolbar title="一键生成" />

      <PageContainer>
        {stage === 'import' && (
          <ImportStage
            projectName={projectName}
            script={script}
            generateImages={generateImages}
            generateVideos={generateVideos}
            onProjectNameChange={setProjectName}
            onScriptChange={setScript}
            onGenerateImagesChange={setGenerateImages}
            onGenerateVideosChange={setGenerateVideos}
            onStart={handleStart}
            isStarting={isStarting}
          />
        )}
        {stage === 'processing' && <ProcessingStage state={processingState} />}
        {stage === 'result' && result && (
          <ResultStage
            result={result}
            onGoToProject={handleGoToProject}
            onStartNew={handleStartNew}
          />
        )}
      </PageContainer>
    </>
  );
}
