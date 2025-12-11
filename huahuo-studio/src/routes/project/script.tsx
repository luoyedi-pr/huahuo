import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Toolbar } from '@/components/layout/Toolbar';
import { PageContainer } from '@/components/layout/AppLayout';
import { PixelCard } from '@/components/ui/pixel-card';
import { PixelButton } from '@/components/ui/pixel-button';
import { PixelBadge } from '@/components/ui/pixel-badge';
import { IconSave, IconMagic, IconBolt, IconWarning, IconCheck, IconUpload, IconChevronLeft, IconClose, IconEdit, IconTrash } from '@/components/ui/pixel-icons';
import { PixelLoading } from '@/components/ui/pixel-loading';
import { cn } from '@/lib/utils';

// Phase 1 结果类型
interface CharacterProfile {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  description: string;
  appearance: string;
  gender: string;
  ageGroup: string;
  estimatedAge: number | null;
  personality?: string;
  background?: string;
  relationships?: string;
}

interface SceneLocation {
  id: string;
  name: string;
  sceneInfo: string;
  location: string;
  timeOfDay: string;
  interior: boolean;
  description: string;
  props: string;
  lighting: string;
  atmosphere: string;
}

interface StoryOutline {
  theme: string;
  setting: string;
  plotSummary: string;
  plotPoints: Array<{
    order: number;
    sceneId: string;
    summary: string;
    characters: string[];
  }>;
}

interface Phase1Result {
  textType: 'script' | 'outline' | 'mixed';
  characters: CharacterProfile[];
  sceneLocations: SceneLocation[];
  storyOutline: StoryOutline;
}

// Phase 2 结果类型
interface EnhancedShot {
  sceneId: string;
  sceneInfo: string;
  location: string;
  timeOfDay: string;
  props: string;
  description: string;
  dialogue?: string;
  character?: string;
  targetCharacter?: string;
  tone?: string;
  emotion?: string;
  action?: string;
  cameraType?: string;
  mood?: string;
  duration: number;
}

// 解析阶段状态
type ParseStage = 'idle' | 'phase1' | 'confirm' | 'phase2' | 'complete';

// 编辑角色Modal
function EditCharacterModal({
  character,
  onSave,
  onClose,
  onDelete,
}: {
  character: CharacterProfile;
  onSave: (char: CharacterProfile) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<CharacterProfile>({ ...character });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-secondary border-2 border-black w-[600px] max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-pixel text-sm text-text-primary">编辑角色</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <IconClose size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">角色名</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">角色类型</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value as CharacterProfile['role'] })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              >
                <option value="protagonist">主角</option>
                <option value="antagonist">反派</option>
                <option value="supporting">配角</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">性别</label>
              <select
                value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              >
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="unknown">未知</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">年龄段</label>
              <select
                value={form.ageGroup}
                onChange={e => setForm({ ...form, ageGroup: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              >
                <option value="child">儿童</option>
                <option value="teenager">青少年</option>
                <option value="young_adult">青年</option>
                <option value="middle_aged">中年</option>
                <option value="elderly">老年</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">年龄</label>
              <input
                type="number"
                value={form.estimatedAge || ''}
                onChange={e => setForm({ ...form, estimatedAge: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">性格</label>
            <input
              type="text"
              value={form.personality || ''}
              onChange={e => setForm({ ...form, personality: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              placeholder="如：内向、善良、机智..."
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">描述</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main resize-none"
              rows={2}
              placeholder="角色的背景、性格、在故事中的作用..."
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">外貌特征（用于生成角色图）</label>
            <textarea
              value={form.appearance}
              onChange={e => setForm({ ...form, appearance: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main resize-none"
              rows={3}
              placeholder="详细的外貌描述：身高、体型、脸型、发型、肤色、穿着..."
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">背景故事</label>
            <textarea
              value={form.background || ''}
              onChange={e => setForm({ ...form, background: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main resize-none"
              rows={2}
              placeholder="角色的过往经历..."
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">人物关系</label>
            <input
              type="text"
              value={form.relationships || ''}
              onChange={e => setForm({ ...form, relationships: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              placeholder="与其他角色的关系..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <PixelButton variant="ghost" size="sm" leftIcon={<IconTrash size={14} />} onClick={onDelete}>
            删除角色
          </PixelButton>
          <div className="flex gap-2">
            <PixelButton variant="ghost" size="sm" onClick={onClose}>
              取消
            </PixelButton>
            <PixelButton variant="primary" size="sm" onClick={() => onSave(form)}>
              保存
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// 编辑场景Modal
function EditSceneModal({
  scene,
  onSave,
  onClose,
  onDelete,
}: {
  scene: SceneLocation;
  onSave: (scene: SceneLocation) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<SceneLocation>({ ...scene });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-secondary border-2 border-black w-[600px] max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-pixel text-sm text-text-primary">编辑场景</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <IconClose size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">场景名称</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">场景行</label>
              <input
                type="text"
                value={form.sceneInfo}
                onChange={e => setForm({ ...form, sceneInfo: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
                placeholder="如：客厅 夜 内"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">地点</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">时间</label>
              <input
                type="text"
                value={form.timeOfDay}
                onChange={e => setForm({ ...form, timeOfDay: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
                placeholder="白天/夜晚/黄昏..."
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">内/外景</label>
              <select
                value={form.interior ? 'true' : 'false'}
                onChange={e => setForm({ ...form, interior: e.target.value === 'true' })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              >
                <option value="true">内景</option>
                <option value="false">外景</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">场景描述（用于生成场景图）</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main resize-none"
              rows={3}
              placeholder="详细的环境描述..."
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">道具布置</label>
            <input
              type="text"
              value={form.props}
              onChange={e => setForm({ ...form, props: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
              placeholder="场景中的物品..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">光线</label>
              <input
                type="text"
                value={form.lighting}
                onChange={e => setForm({ ...form, lighting: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
                placeholder="明亮/昏暗/柔和..."
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">氛围</label>
              <input
                type="text"
                value={form.atmosphere}
                onChange={e => setForm({ ...form, atmosphere: e.target.value })}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-sm text-text-primary focus:outline-none focus:border-primary-main"
                placeholder="温馨/紧张/压抑..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <PixelButton variant="ghost" size="sm" leftIcon={<IconTrash size={14} />} onClick={onDelete}>
            删除场景
          </PixelButton>
          <div className="flex gap-2">
            <PixelButton variant="ghost" size="sm" onClick={onClose}>
              取消
            </PixelButton>
            <PixelButton variant="primary" size="sm" onClick={() => onSave(form)}>
              保存
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectScriptPage() {
  const { projectId } = useParams({ from: '/project/$projectId' });
  const navigate = useNavigate();

  // 基础状态
  const [rawScript, setRawScript] = useState('');

  // 两阶段解析状态
  const [parseStage, setParseStage] = useState<ParseStage>('idle');
  const [phase1Result, setPhase1Result] = useState<Phase1Result | null>(null);
  const [phase2Shots, setPhase2Shots] = useState<EnhancedShot[]>([]);

  // 编辑Modal状态
  const [editingCharacterIndex, setEditingCharacterIndex] = useState<number | null>(null);
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);

  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingShots, setIsGeneratingShots] = useState(false);

  // 消息状态
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 显示消息
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 加载剧本
  useEffect(() => {
    const loadScript = async () => {
      try {
        setIsLoading(true);
        const script = await window.electron.invoke('script:load', projectId);
        if (script) {
          setRawScript(script.content || '');

          // 尝试恢复 Phase1Result
          if (script.parsedData) {
            try {
              const parsed = JSON.parse(script.parsedData);
              // 检查是否是 Phase1Result 格式（有 textType 和 characters 字段）
              if (parsed.textType && parsed.characters && parsed.sceneLocations) {
                setPhase1Result(parsed as Phase1Result);
                setParseStage('confirm');
              }
            } catch {
              // 解析数据损坏或是旧格式，忽略
            }
          }
        }
      } catch (error) {
        console.error('加载剧本失败:', error);
        showMessage('error', '加载剧本失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadScript();
  }, [projectId]);

  // 保存剧本
  const handleSave = useCallback(async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      await window.electron.invoke('script:save', projectId, rawScript);
      showMessage('success', '剧本已保存');
    } catch (error) {
      console.error('保存失败:', error);
      showMessage('error', '保存失败');
    } finally {
      setIsSaving(false);
    }
  }, [projectId, rawScript, isSaving]);

  // 第一阶段解析：结构化提取
  const handlePhase1Parse = useCallback(async () => {
    if (!rawScript.trim()) {
      showMessage('info', '请先输入剧本内容');
      return;
    }

    try {
      setParseStage('phase1');
      showMessage('info', 'AI 正在分析剧本结构...');

      // 先保存剧本
      await window.electron.invoke('script:save', projectId, rawScript);

      const result: Phase1Result = await window.electron.invoke('script:parse-phase1', rawScript);
      setPhase1Result(result);
      setParseStage('confirm');

      // 保存解析结果到数据库
      await window.electron.invoke('script:save-parsed', projectId, result);

      const textTypeLabel = result.textType === 'script' ? '标准剧本' : result.textType === 'outline' ? '故事大纲' : '混合类型';
      showMessage('success', `识别为${textTypeLabel}，提取到 ${result.characters.length} 个角色，${result.sceneLocations.length} 个场景`);
    } catch (error) {
      console.error('第一阶段解析失败:', error);
      showMessage('error', error instanceof Error ? error.message : '解析失败');
      setParseStage('idle');
    }
  }, [rawScript, projectId]);

  // 第二阶段解析：生成分镜
  const handlePhase2Parse = useCallback(async () => {
    if (!phase1Result) {
      showMessage('error', '请先完成第一阶段解析');
      return;
    }

    try {
      setParseStage('phase2');
      showMessage('info', 'AI 正在生成详细分镜...');

      const shots: EnhancedShot[] = await window.electron.invoke('script:parse-phase2', rawScript, phase1Result);
      setPhase2Shots(shots);
      setParseStage('complete');

      showMessage('success', `已生成 ${shots.length} 个分镜`);
    } catch (error) {
      console.error('第二阶段解析失败:', error);
      showMessage('error', error instanceof Error ? error.message : '生成分镜失败');
      setParseStage('confirm');
    }
  }, [rawScript, phase1Result]);

  // 确认并保存到数据库
  const handleConfirmAndSave = useCallback(async () => {
    if (!phase1Result || phase2Shots.length === 0) {
      showMessage('error', '请先完成解析');
      return;
    }

    try {
      setIsGeneratingShots(true);
      showMessage('info', '正在保存角色、场景和分镜...');

      // 1. 创建角色
      const characterMap = new Map<string, string>();
      const existingCharacters: Array<{ id: string; name: string }> =
        await window.electron.invoke('character:list', projectId) || [];

      for (const char of existingCharacters) {
        characterMap.set(char.name, char.id);
      }

      for (const char of phase1Result.characters) {
        if (!characterMap.has(char.name)) {
          try {
            const newId = await window.electron.invoke('character:create', projectId, {
              name: char.name,
              role: char.role,
              description: char.description,
              appearance: char.appearance || '',
            });
            characterMap.set(char.name, newId);
          } catch (e) {
            console.error(`创建角色 ${char.name} 失败:`, e);
          }
        }
      }

      // 2. 创建场景
      const sceneMap = new Map<string, string>();
      console.log('[handleConfirmAndSave] 开始创建场景, 场景数量:', phase1Result.sceneLocations.length);
      console.log('[handleConfirmAndSave] 场景列表:', phase1Result.sceneLocations);

      for (const scene of phase1Result.sceneLocations) {
        console.log('[handleConfirmAndSave] 正在创建场景:', scene.name);
        try {
          const dbSceneId = await window.electron.invoke('scene:create', projectId, {
            name: scene.name,
            sceneInfo: scene.sceneInfo,
            location: scene.location,
            timeOfDay: scene.timeOfDay,
            interior: scene.interior,
            description: scene.description,
            props: scene.props,
            lighting: scene.lighting,
            atmosphere: scene.atmosphere,
          });
          console.log('[handleConfirmAndSave] 场景创建成功:', scene.name, '-> ID:', dbSceneId);
          sceneMap.set(scene.id, dbSceneId);
          if (scene.sceneInfo) {
            sceneMap.set(scene.sceneInfo, dbSceneId);
          }
        } catch (e) {
          console.error(`创建场景 ${scene.name} 失败:`, e);
        }
      }
      console.log('[handleConfirmAndSave] 场景创建完成, sceneMap:', [...sceneMap.entries()]);

      // 3. 创建分镜
      const shotsData = phase2Shots.map((shot, index) => {
        const characterId = shot.character ? characterMap.get(shot.character) : undefined;
        let dbSceneId: string | undefined;
        if (shot.sceneId && sceneMap.has(shot.sceneId)) {
          dbSceneId = sceneMap.get(shot.sceneId);
        } else if (shot.sceneInfo && sceneMap.has(shot.sceneInfo)) {
          dbSceneId = sceneMap.get(shot.sceneInfo);
        }

        return {
          index,
          description: shot.description,
          dialogue: shot.dialogue,
          characterId,
          sceneId: dbSceneId,
          duration: shot.duration || 5,
          cameraType: shot.cameraType || '中景',
          mood: shot.mood || '平静',
          sceneInfo: shot.sceneInfo,
          location: shot.location,
          timeOfDay: shot.timeOfDay,
          props: shot.props,
          action: shot.action,
        };
      });

      await window.electron.invoke('storyboard:create-batch', projectId, shotsData);

      // 保存剧本
      await window.electron.invoke('script:save', projectId, rawScript);

      showMessage('success', `已创建 ${phase1Result.characters.length} 个角色，${phase1Result.sceneLocations.length} 个场景，${phase2Shots.length} 个分镜`);

      // 跳转到分镜页面
      setTimeout(() => {
        navigate({ to: '/project/$projectId/storyboard', params: { projectId } });
      }, 1000);
    } catch (error) {
      console.error('保存失败:', error);
      showMessage('error', error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsGeneratingShots(false);
    }
  }, [projectId, phase1Result, phase2Shots, rawScript, navigate]);

  // 重新解析（返回到剧本输入页面）
  const handleReparse = useCallback(async () => {
    setParseStage('idle');
    setPhase1Result(null);
    setPhase2Shots([]);

    // 清除数据库中的解析结果
    try {
      await window.electron.invoke('script:save-parsed', projectId, null);
    } catch (e) {
      console.error('清除解析结果失败:', e);
    }
  }, [projectId]);

  // 编辑角色
  const handleSaveCharacter = useCallback(async (index: number, updatedChar: CharacterProfile) => {
    if (!phase1Result) return;

    const newCharacters = [...phase1Result.characters];
    newCharacters[index] = updatedChar;
    const newResult = { ...phase1Result, characters: newCharacters };
    setPhase1Result(newResult);
    setEditingCharacterIndex(null);

    // 保存到数据库
    try {
      await window.electron.invoke('script:save-parsed', projectId, newResult);
      showMessage('success', '角色已更新');
    } catch (e) {
      console.error('保存角色失败:', e);
    }
  }, [phase1Result, projectId]);

  // 删除角色
  const handleDeleteCharacter = useCallback(async (index: number) => {
    if (!phase1Result) return;

    const newCharacters = phase1Result.characters.filter((_, i) => i !== index);
    const newResult = { ...phase1Result, characters: newCharacters };
    setPhase1Result(newResult);
    setEditingCharacterIndex(null);

    // 保存到数据库
    try {
      await window.electron.invoke('script:save-parsed', projectId, newResult);
      showMessage('success', '角色已删除');
    } catch (e) {
      console.error('删除角色失败:', e);
    }
  }, [phase1Result, projectId]);

  // 编辑场景
  const handleSaveScene = useCallback(async (index: number, updatedScene: SceneLocation) => {
    if (!phase1Result) return;

    const newScenes = [...phase1Result.sceneLocations];
    newScenes[index] = updatedScene;
    const newResult = { ...phase1Result, sceneLocations: newScenes };
    setPhase1Result(newResult);
    setEditingSceneIndex(null);

    // 保存到数据库
    try {
      await window.electron.invoke('script:save-parsed', projectId, newResult);
      showMessage('success', '场景已更新');
    } catch (e) {
      console.error('保存场景失败:', e);
    }
  }, [phase1Result, projectId]);

  // 删除场景
  const handleDeleteScene = useCallback(async (index: number) => {
    if (!phase1Result) return;

    const newScenes = phase1Result.sceneLocations.filter((_, i) => i !== index);
    const newResult = { ...phase1Result, sceneLocations: newScenes };
    setPhase1Result(newResult);
    setEditingSceneIndex(null);

    // 保存到数据库
    try {
      await window.electron.invoke('script:save-parsed', projectId, newResult);
      showMessage('success', '场景已删除');
    } catch (e) {
      console.error('删除场景失败:', e);
    }
  }, [phase1Result, projectId]);

  // 导入剧本文件
  const handleImport = useCallback(async () => {
    try {
      const result = await window.electron.invoke('file:select', {
        title: '选择剧本文件',
        filters: [
          { name: '文本文件', extensions: ['txt', 'md'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (result && result.path) {
        const content = await window.electron.invoke('file:read', result.path);
        if (content) {
          setRawScript(content);
          setParseStage('idle');
          setPhase1Result(null);
          setPhase2Shots([]);
          showMessage('success', '剧本导入成功');
        }
      }
    } catch (error) {
      console.error('导入失败:', error);
      showMessage('error', '导入失败');
    }
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (isLoading) {
    return (
      <>
        <Toolbar title="剧本" />
        <PageContainer className="flex items-center justify-center">
          <PixelLoading size="lg" text="加载剧本中..." />
        </PageContainer>
      </>
    );
  }

  // 确认页面（Phase 1 完成后）
  if (parseStage === 'confirm' || parseStage === 'phase2' || parseStage === 'complete') {
    return (
      <>
        <Toolbar
          title="确认解析结果"
          actions={
            <PixelButton
              variant="ghost"
              size="sm"
              leftIcon={<IconChevronLeft size={14} />}
              onClick={handleReparse}
            >
              重新解析
            </PixelButton>
          }
        />

        <PageContainer className="flex gap-6 h-full" padded>
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

          {/* 编辑角色Modal */}
          {editingCharacterIndex !== null && phase1Result && (
            <EditCharacterModal
              character={phase1Result.characters[editingCharacterIndex]}
              onSave={(char) => handleSaveCharacter(editingCharacterIndex, char)}
              onClose={() => setEditingCharacterIndex(null)}
              onDelete={() => handleDeleteCharacter(editingCharacterIndex)}
            />
          )}

          {/* 编辑场景Modal */}
          {editingSceneIndex !== null && phase1Result && (
            <EditSceneModal
              scene={phase1Result.sceneLocations[editingSceneIndex]}
              onSave={(scene) => handleSaveScene(editingSceneIndex, scene)}
              onClose={() => setEditingSceneIndex(null)}
              onDelete={() => handleDeleteScene(editingSceneIndex)}
            />
          )}

          {/* 左侧：角色列表 */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <PixelCard padding="md" className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="font-pixel text-sm text-text-primary">
                  角色列表 ({phase1Result?.characters.length || 0})
                </h3>
                {phase1Result && (
                  <PixelBadge variant={
                    phase1Result.textType === 'script' ? 'primary' :
                    phase1Result.textType === 'outline' ? 'secondary' : 'default'
                  }>
                    {phase1Result.textType === 'script' ? '标准剧本' :
                     phase1Result.textType === 'outline' ? '故事大纲' : '混合类型'}
                  </PixelBadge>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {phase1Result?.characters.map((char, index) => (
                  <div
                    key={index}
                    className="p-3 bg-bg-tertiary border border-border hover:border-primary-main cursor-pointer transition-colors group"
                    onClick={() => setEditingCharacterIndex(index)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{char.name}</span>
                        <PixelBadge
                          variant={
                            char.role === 'protagonist' ? 'primary' :
                            char.role === 'antagonist' ? 'error' : 'default'
                          }
                          size="sm"
                        >
                          {char.role === 'protagonist' ? '主角' :
                           char.role === 'antagonist' ? '反派' : '配角'}
                        </PixelBadge>
                        {char.gender && (
                          <span className="text-xs text-text-muted">
                            {char.gender === 'male' ? '男' : char.gender === 'female' ? '女' : char.gender}
                          </span>
                        )}
                        {char.estimatedAge && (
                          <span className="text-xs text-text-muted">{char.estimatedAge}岁</span>
                        )}
                      </div>
                      <IconEdit size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {char.personality && (
                      <p className="text-xs text-text-secondary mb-1">
                        <span className="text-text-muted">性格：</span>{char.personality}
                      </p>
                    )}
                    {char.description && (
                      <p className="text-xs text-text-secondary mb-1">
                        <span className="text-text-muted">描述：</span>{char.description}
                      </p>
                    )}
                    {char.appearance && (
                      <p className="text-xs text-text-muted line-clamp-2">
                        <span>外貌：</span>{char.appearance}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </PixelCard>
          </div>

          {/* 中间：场景列表 */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <PixelCard padding="md" className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <h3 className="font-pixel text-sm text-text-primary mb-4 shrink-0">
                场景列表 ({phase1Result?.sceneLocations.length || 0})
              </h3>

              <div className="flex-1 overflow-y-auto space-y-3">
                {phase1Result?.sceneLocations.map((scene, index) => (
                  <div
                    key={index}
                    className="p-3 bg-bg-tertiary border border-border hover:border-primary-main cursor-pointer transition-colors group"
                    onClick={() => setEditingSceneIndex(index)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{scene.name}</span>
                        <PixelBadge variant={scene.interior ? 'default' : 'secondary'} size="sm">
                          {scene.interior ? '内景' : '外景'}
                        </PixelBadge>
                      </div>
                      <IconEdit size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {scene.sceneInfo && (
                      <p className="text-xs text-primary-main mb-1">{scene.sceneInfo}</p>
                    )}
                    <div className="flex gap-2 text-xs text-text-muted mb-1">
                      {scene.location && <span>{scene.location}</span>}
                      {scene.timeOfDay && <span>· {scene.timeOfDay}</span>}
                    </div>
                    {scene.description && (
                      <p className="text-xs text-text-secondary line-clamp-2">{scene.description}</p>
                    )}
                    {scene.atmosphere && (
                      <p className="text-xs text-text-muted mt-1">氛围：{scene.atmosphere}</p>
                    )}
                  </div>
                ))}
              </div>
            </PixelCard>
          </div>

          {/* 右侧：故事大纲和操作 */}
          <div className="w-80 shrink-0 overflow-y-auto min-h-0 space-y-4">
            {/* 故事大纲 */}
            <PixelCard padding="md">
              <h3 className="font-pixel text-sm text-text-primary mb-3">故事大纲</h3>
              {phase1Result?.storyOutline && (
                <div className="space-y-2 text-xs">
                  {phase1Result.storyOutline.theme && (
                    <div>
                      <span className="text-text-muted">主题：</span>
                      <span className="text-text-primary">{phase1Result.storyOutline.theme}</span>
                    </div>
                  )}
                  {phase1Result.storyOutline.setting && (
                    <div>
                      <span className="text-text-muted">背景：</span>
                      <span className="text-text-secondary">{phase1Result.storyOutline.setting}</span>
                    </div>
                  )}
                  {phase1Result.storyOutline.plotSummary && (
                    <div>
                      <span className="text-text-muted">摘要：</span>
                      <p className="text-text-secondary mt-1">{phase1Result.storyOutline.plotSummary}</p>
                    </div>
                  )}
                </div>
              )}
            </PixelCard>

            {/* 分镜预览（Phase 2 完成后） */}
            {parseStage === 'complete' && phase2Shots.length > 0 && (
              <PixelCard padding="md">
                <h3 className="font-pixel text-sm text-text-primary mb-3">
                  分镜预览 ({phase2Shots.length})
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {phase2Shots.slice(0, 10).map((shot, index) => (
                    <div key={index} className="p-2 bg-bg-tertiary border border-border text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-pixel text-text-muted">#{index + 1}</span>
                        {shot.character && (
                          <PixelBadge variant="primary" size="sm">{shot.character}</PixelBadge>
                        )}
                        {shot.cameraType && (
                          <span className="text-text-muted">{shot.cameraType}</span>
                        )}
                      </div>
                      <p className="text-text-secondary line-clamp-2">{shot.description}</p>
                      {shot.dialogue && (
                        <p className="text-primary-main mt-1 line-clamp-1">"{shot.dialogue}"</p>
                      )}
                    </div>
                  ))}
                  {phase2Shots.length > 10 && (
                    <p className="text-xs text-text-muted text-center">
                      还有 {phase2Shots.length - 10} 个分镜...
                    </p>
                  )}
                </div>
              </PixelCard>
            )}

            {/* 操作按钮 */}
            <PixelCard padding="md">
              <h3 className="font-pixel text-sm text-text-primary mb-4">操作</h3>
              <div className="space-y-3">
                {parseStage === 'confirm' && (
                  <PixelButton
                    variant="secondary"
                    fullWidth
                    leftIcon={<IconMagic size={14} />}
                    onClick={handlePhase2Parse}
                  >
                    生成分镜
                  </PixelButton>
                )}

                {parseStage === 'phase2' && (
                  <div className="text-center py-4">
                    <PixelLoading size="sm" text="正在生成分镜..." />
                  </div>
                )}

                {parseStage === 'complete' && (
                  <PixelButton
                    variant="primary"
                    fullWidth
                    leftIcon={<IconBolt size={14} />}
                    onClick={handleConfirmAndSave}
                    loading={isGeneratingShots}
                  >
                    确认并保存
                  </PixelButton>
                )}

                <p className="text-xs text-text-muted text-center">
                  {parseStage === 'confirm' && '点击卡片可编辑角色和场景'}
                  {parseStage === 'phase2' && 'AI 正在根据剧本和角色信息生成分镜...'}
                  {parseStage === 'complete' && `将创建 ${phase1Result?.characters.length || 0} 个角色、${phase1Result?.sceneLocations.length || 0} 个场景、${phase2Shots.length} 个分镜`}
                </p>
              </div>
            </PixelCard>

            {/* 提示 */}
            <PixelCard padding="md">
              <h3 className="font-pixel text-sm text-text-primary mb-3">提示</h3>
              <div className="space-y-2 text-xs text-text-muted">
                <p>1. 点击角色/场景卡片可编辑</p>
                <p>2. 确认信息无误后点击生成分镜</p>
                <p>3. 生成分镜后可在分镜页面继续编辑</p>
              </div>
            </PixelCard>
          </div>
        </PageContainer>
      </>
    );
  }

  // 默认编辑页面
  return (
    <>
      <Toolbar
        title="剧本"
        actions={
          <>
            <PixelButton
              variant="ghost"
              size="sm"
              leftIcon={<IconUpload size={14} />}
              onClick={handleImport}
            >
              导入
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
        }
      />

      <PageContainer className="flex gap-6 h-full" padded>
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

        {/* 左侧：剧本编辑器 */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-pixel text-sm text-text-primary">剧本内容</h3>
            <PixelButton
              variant="secondary"
              size="sm"
              leftIcon={<IconMagic size={14} />}
              onClick={handlePhase1Parse}
              loading={parseStage === 'phase1'}
              disabled={!rawScript.trim()}
            >
              AI 解析
            </PixelButton>
          </div>

          <PixelCard padding="none" className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {parseStage === 'phase1' ? (
              <div className="flex-1 flex items-center justify-center">
                <PixelLoading size="lg" text="AI 正在分析剧本结构..." />
              </div>
            ) : (
              <textarea
                className="flex-1 w-full p-4 bg-bg-tertiary text-text-primary placeholder:text-text-muted focus:outline-none resize-none border-none"
                placeholder={`在此输入或粘贴剧本/故事内容...

支持的格式：
1. 标准剧本格式（有场景头、对话、动作指示）
2. 故事大纲/梗概（叙述性文字）
3. 混合格式

AI 会自动识别文本类型并提取：
- 角色信息（包含外貌、性格、背景）
- 场景信息（包含环境描述、氛围）
- 故事大纲（主题、背景、情节点）

然后根据这些信息生成完整的分镜列表。`}
                value={rawScript}
                onChange={(e) => setRawScript(e.target.value)}
              />
            )}
          </PixelCard>
        </div>

        {/* 右侧：属性面板 */}
        <div className="w-80 shrink-0 overflow-y-auto min-h-0 space-y-4">
          <PixelCard padding="md">
            <h3 className="font-pixel text-sm text-text-primary mb-4">剧本信息</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">字符数</span>
                <span className="text-text-primary">{rawScript.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">行数</span>
                <span className="text-text-primary">
                  {rawScript.split('\n').filter(l => l.trim()).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">段落数</span>
                <span className="text-text-primary">
                  {rawScript.split(/\n\s*\n/).filter(p => p.trim()).length}
                </span>
              </div>
            </div>
          </PixelCard>

          <PixelCard padding="md">
            <h3 className="font-pixel text-sm text-text-primary mb-4">使用流程</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 shrink-0 bg-primary-main text-white flex items-center justify-center text-xs font-pixel">1</div>
                <div>
                  <p className="text-sm text-text-primary">输入剧本</p>
                  <p className="text-xs text-text-muted">粘贴或导入剧本/故事内容</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 shrink-0 bg-secondary-main text-white flex items-center justify-center text-xs font-pixel">2</div>
                <div>
                  <p className="text-sm text-text-primary">AI 解析</p>
                  <p className="text-xs text-text-muted">提取角色、场景、故事结构</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 shrink-0 bg-accent-purple text-white flex items-center justify-center text-xs font-pixel">3</div>
                <div>
                  <p className="text-sm text-text-primary">确认信息</p>
                  <p className="text-xs text-text-muted">检查并编辑角色和场景</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 shrink-0 bg-status-success text-white flex items-center justify-center text-xs font-pixel">4</div>
                <div>
                  <p className="text-sm text-text-primary">生成分镜</p>
                  <p className="text-xs text-text-muted">AI 生成完整分镜列表</p>
                </div>
              </div>
            </div>
          </PixelCard>

          <PixelCard padding="md">
            <h3 className="font-pixel text-sm text-text-primary mb-3">提示</h3>
            <div className="space-y-2 text-xs text-text-muted">
              <p>• 支持标准剧本格式和故事大纲</p>
              <p>• AI 会自动识别文本类型</p>
              <p>• 角色外貌会用于生成角色图</p>
              <p>• 场景描述会用于生成场景参考图</p>
              <p>• 按 Ctrl+S 快速保存</p>
            </div>
          </PixelCard>
        </div>
      </PageContainer>
    </>
  );
}
