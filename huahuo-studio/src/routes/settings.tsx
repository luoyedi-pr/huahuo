import { useState, useEffect } from 'react';
import { Toolbar } from '@/components/layout/Toolbar';
import { PageContainer, PageHeader } from '@/components/layout/AppLayout';
import { PixelCard, PixelCardHeader, PixelCardTitle, PixelCardContent } from '@/components/ui/pixel-card';
import { PixelButton } from '@/components/ui/pixel-button';
import { PixelInput } from '@/components/ui/pixel-input';
import { PixelSelect } from '@/components/ui/pixel-select';
import { IconSave, IconRefresh, IconCheck, IconWarning, IconDownload, IconUpload, IconDatabase, IconFolder } from '@/components/ui/pixel-icons';
import { cn } from '@/lib/utils';

type ProviderType = 'apiyi' | 'aliyun' | 'official' | 'custom';

interface AppSettings {
  // LLM 服务商配置
  llmProvider: ProviderType;
  llmApiyiApiKey: string;
  llmAliyunApiKey: string;
  llmOfficialGeminiKey: string;
  llmOfficialClaudeKey: string;
  llmCustomBaseUrl: string;
  llmCustomApiKey: string;
  defaultTextModel: string;

  // 图像服务商配置
  imageProvider: ProviderType;
  imageApiyiApiKey: string;
  imageAliyunApiKey: string;
  imageOfficialGeminiKey: string;
  imageCustomBaseUrl: string;
  imageCustomApiKey: string;
  defaultImageModel: string;
  defaultImageSize: string;
  imageAspectRatio: string;

  // 视频服务商配置
  videoProvider: ProviderType;
  videoApiyiApiKey: string;
  videoAliyunApiKey: string;
  videoCustomBaseUrl: string;
  videoCustomApiKey: string;
  defaultVideoModel: string;
  defaultVideoDuration: number;

  // 存储
  storagePath: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  price?: string;
}

interface SelectOption {
  id: string;
  name: string;
}

const defaultSettings: AppSettings = {
  llmProvider: 'apiyi',
  llmApiyiApiKey: '',
  llmAliyunApiKey: '',
  llmOfficialGeminiKey: '',
  llmOfficialClaudeKey: '',
  llmCustomBaseUrl: '',
  llmCustomApiKey: '',
  defaultTextModel: 'gemini-2.0-flash',

  imageProvider: 'apiyi',
  imageApiyiApiKey: '',
  imageAliyunApiKey: '',
  imageOfficialGeminiKey: '',
  imageCustomBaseUrl: '',
  imageCustomApiKey: '',
  defaultImageModel: 'gemini-3-pro-image-preview',
  defaultImageSize: '2K',
  imageAspectRatio: '16:9',

  videoProvider: 'apiyi',
  videoApiyiApiKey: '',
  videoAliyunApiKey: '',
  videoCustomBaseUrl: '',
  videoCustomApiKey: '',
  defaultVideoModel: 'sora_video2',
  defaultVideoDuration: 5,

  storagePath: '',
};

/** 设置区块 */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <PixelCard padding="lg" className="mb-6">
      <PixelCardHeader>
        <PixelCardTitle>{title}</PixelCardTitle>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </PixelCardHeader>
      <PixelCardContent>{children}</PixelCardContent>
    </PixelCard>
  );
}

/** 服务商选择器 */
function ProviderSelector({
  value,
  onChange,
  providers,
}: {
  value: ProviderType;
  onChange: (provider: ProviderType) => void;
  providers: Array<{ id: ProviderType; name: string; description: string; color: string }>;
}) {
  return (
    <div className={`grid grid-cols-${providers.length} gap-3 mb-4`}>
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => onChange(provider.id)}
          className={cn(
            'p-3 border-2 border-black text-left transition-all',
            value === provider.id
              ? `${provider.color} shadow-pixel-sm`
              : 'bg-bg-tertiary hover:bg-bg-elevated'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-pixel text-xs">{provider.name}</span>
            {value === provider.id && <IconCheck size={14} className="text-primary-main" />}
          </div>
          <p className="text-[10px] text-text-secondary">{provider.description}</p>
        </button>
      ))}
    </div>
  );
}

/** API 状态指示器 */
function ApiStatus({ connected, message }: { connected: boolean; message?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'w-2 h-2',
          connected ? 'bg-status-success' : 'bg-status-error'
        )}
      />
      <span className="text-xs text-text-secondary">
        {message || (connected ? '已连接' : '未连接')}
      </span>
    </div>
  );
}

// LLM 服务商列表
const llmProviders = [
  { id: 'apiyi' as const, name: 'API易', description: '推荐：支持多种模型', color: 'bg-secondary-main/20' },
  { id: 'aliyun' as const, name: '阿里云', description: '通义千问系列', color: 'bg-accent-orange/20' },
  { id: 'official' as const, name: '官方直连', description: 'Gemini/Claude', color: 'bg-primary-main/20' },
  { id: 'custom' as const, name: '自定义', description: 'OpenAI 兼容', color: 'bg-accent-purple/20' },
];

// 图像服务商列表
const imageProviders = [
  { id: 'apiyi' as const, name: 'API易', description: 'Gemini/DALL-E', color: 'bg-secondary-main/20' },
  { id: 'aliyun' as const, name: '阿里云', description: '通义万相', color: 'bg-accent-orange/20' },
  { id: 'official' as const, name: '官方直连', description: 'Gemini Image', color: 'bg-primary-main/20' },
  { id: 'custom' as const, name: '自定义', description: 'DALL-E 兼容', color: 'bg-accent-purple/20' },
];

// 视频服务商列表
const videoProviders = [
  { id: 'apiyi' as const, name: 'API易', description: 'Sora/VEO', color: 'bg-secondary-main/20' },
  { id: 'aliyun' as const, name: '阿里云', description: '视频生成', color: 'bg-accent-orange/20' },
  { id: 'custom' as const, name: '自定义', description: '通用 API', color: 'bg-accent-purple/20' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [testingImage, setTestingImage] = useState(false);
  const [testingVideo, setTestingVideo] = useState(false);
  const [llmStatus, setLlmStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: '未测试',
  });
  const [imageStatus, setImageStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: '未测试',
  });
  const [videoStatus, setVideoStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: '未测试',
  });
  const [dbInfo, setDbInfo] = useState<{ path: string; size: number } | null>(null);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string>('');

  // 动态获取模型状态
  const [fetchingLlmModels, setFetchingLlmModels] = useState(false);
  const [fetchingImageModels, setFetchingImageModels] = useState(false);
  const [fetchingVideoModels, setFetchingVideoModels] = useState(false);

  // 模型搜索
  const [textModelSearch, setTextModelSearch] = useState('');
  const [imageModelSearch, setImageModelSearch] = useState('');
  const [videoModelSearch, setVideoModelSearch] = useState('');

  // 模型列表
  const [textModels, setTextModels] = useState<ModelOption[]>([]);
  const [imageModels, setImageModels] = useState<ModelOption[]>([]);
  const [videoModels, setVideoModels] = useState<ModelOption[]>([]);
  const [aspectRatios, setAspectRatios] = useState<SelectOption[]>([]);
  const [imageSizes, setImageSizes] = useState<SelectOption[]>([]);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await window.electron.invoke('settings:get');
        setSettings({ ...defaultSettings, ...data });

        // 获取数据库信息
        const dbData = await window.electron.invoke('settings:get-database-info');
        setDbInfo(dbData);

        // 获取模型列表
        const [textM, imageM, videoM, aspectR, imageS] = await Promise.all([
          window.electron.invoke('settings:get-text-models'),
          window.electron.invoke('settings:get-image-models'),
          window.electron.invoke('settings:get-video-models'),
          window.electron.invoke('settings:get-aspect-ratios'),
          window.electron.invoke('settings:get-image-sizes'),
        ]);

        // 确保已保存的模型 ID 在列表中（如果不在则添加）
        const ensureModelInList = (models: ModelOption[], savedId: string): ModelOption[] => {
          if (!savedId) return models;
          const exists = models.some(m => m.id === savedId);
          if (!exists) {
            return [{ id: savedId, name: savedId, provider: '已保存' }, ...models];
          }
          return models;
        };

        setTextModels(ensureModelInList(textM, data.defaultTextModel));
        setImageModels(ensureModelInList(imageM, data.defaultImageModel));
        setVideoModels(ensureModelInList(videoM, data.defaultVideoModel));
        setAspectRatios(aspectR);
        setImageSizes(imageS);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // 保存设置
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.electron.invoke('settings:update', settings);
      setBackupStatus('设置已保存');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setBackupStatus('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 测试 LLM 连接
  const handleTestLlm = async () => {
    setTestingLlm(true);
    try {
      await window.electron.invoke('settings:update', settings);
      const result = await window.electron.invoke('settings:test-llm-connection');
      setLlmStatus({
        connected: result.success,
        message: result.message,
      });
    } catch (error) {
      setLlmStatus({
        connected: false,
        message: error instanceof Error ? error.message : '测试失败',
      });
    } finally {
      setTestingLlm(false);
    }
  };

  // 测试图像连接
  const handleTestImage = async () => {
    setTestingImage(true);
    try {
      await window.electron.invoke('settings:update', settings);
      const result = await window.electron.invoke('settings:test-image-connection');
      setImageStatus({
        connected: result.success,
        message: result.message,
      });
    } catch (error) {
      setImageStatus({
        connected: false,
        message: error instanceof Error ? error.message : '测试失败',
      });
    } finally {
      setTestingImage(false);
    }
  };

  // 测试视频连接
  const handleTestVideo = async () => {
    setTestingVideo(true);
    try {
      await window.electron.invoke('settings:update', settings);
      const result = await window.electron.invoke('settings:test-video-connection');
      setVideoStatus({
        connected: result.success,
        message: result.message,
      });
    } catch (error) {
      setVideoStatus({
        connected: false,
        message: error instanceof Error ? error.message : '测试失败',
      });
    } finally {
      setTestingVideo(false);
    }
  };

  // 动态获取 LLM 模型列表
  const handleFetchLlmModels = async () => {
    setFetchingLlmModels(true);
    try {
      // 先保存当前配置
      await window.electron.invoke('settings:update', settings);
      const result = await window.electron.invoke('settings:fetch-llm-models');
      if (result.success && result.models.length > 0) {
        setTextModels(result.models);
        setLlmStatus({ connected: true, message: result.message });
      } else {
        setLlmStatus({ connected: false, message: result.message });
      }
    } catch (error) {
      setLlmStatus({
        connected: false,
        message: error instanceof Error ? error.message : '获取模型失败',
      });
    } finally {
      setFetchingLlmModels(false);
    }
  };

  // 动态获取图像模型列表
  const handleFetchImageModels = async () => {
    setFetchingImageModels(true);
    try {
      // 先保存当前配置
      await window.electron.invoke('settings:update', settings);
      const result = await window.electron.invoke('settings:fetch-image-models');
      if (result.success && result.models.length > 0) {
        setImageModels(result.models);
        setImageStatus({ connected: true, message: result.message });
      } else {
        setImageStatus({ connected: false, message: result.message });
      }
    } catch (error) {
      setImageStatus({
        connected: false,
        message: error instanceof Error ? error.message : '获取模型失败',
      });
    } finally {
      setFetchingImageModels(false);
    }
  };

  // 动态获取视频模型列表
  const handleFetchVideoModels = async () => {
    setFetchingVideoModels(true);
    try {
      // 先保存当前配置
      await window.electron.invoke('settings:update', settings);
      const result = await window.electron.invoke('settings:fetch-video-models');
      if (result.success && result.models.length > 0) {
        setVideoModels(result.models);
        setVideoStatus({ connected: true, message: result.message });
      } else {
        setVideoStatus({ connected: false, message: result.message });
      }
    } catch (error) {
      setVideoStatus({
        connected: false,
        message: error instanceof Error ? error.message : '获取模型失败',
      });
    } finally {
      setFetchingVideoModels(false);
    }
  };

  // 备份数据库
  const handleBackup = async () => {
    setBackupStatus('备份中...');
    try {
      const result = await window.electron.invoke('settings:backup-database');
      if (result.success) {
        setBackupStatus(`备份成功: ${result.path}`);
      } else {
        setBackupStatus(`备份失败: ${result.message}`);
      }
    } catch (error) {
      setBackupStatus(`备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 导入数据库
  const handleImport = async () => {
    setImportStatus('导入中...');
    try {
      const result = await window.electron.invoke('settings:import-database');
      if (result.success) {
        setImportStatus(result.message);
        // 刷新数据库信息
        const dbData = await window.electron.invoke('settings:get-database-info');
        setDbInfo(dbData);
      } else {
        setImportStatus(`导入失败: ${result.message}`);
      }
    } catch (error) {
      setImportStatus(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // 过滤后的模型列表
  const filteredTextModels = textModels.filter(m =>
    m.id.toLowerCase().includes(textModelSearch.toLowerCase()) ||
    m.name.toLowerCase().includes(textModelSearch.toLowerCase()) ||
    m.provider.toLowerCase().includes(textModelSearch.toLowerCase())
  );

  const filteredImageModels = imageModels.filter(m =>
    m.id.toLowerCase().includes(imageModelSearch.toLowerCase()) ||
    m.name.toLowerCase().includes(imageModelSearch.toLowerCase()) ||
    m.provider.toLowerCase().includes(imageModelSearch.toLowerCase())
  );

  const filteredVideoModels = videoModels.filter(m =>
    m.id.toLowerCase().includes(videoModelSearch.toLowerCase()) ||
    m.name.toLowerCase().includes(videoModelSearch.toLowerCase()) ||
    m.provider.toLowerCase().includes(videoModelSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <>
        <Toolbar title="设置" />
        <PageContainer>
          <div className="text-center py-12">
            <div className="text-text-muted">加载设置中...</div>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Toolbar title="设置" />

      <PageContainer>
        <PageHeader
          title="设置"
          description="配置 API 服务商和应用参数"
          actions={
            <PixelButton
              variant="primary"
              leftIcon={<IconSave size={16} />}
              onClick={handleSave}
              loading={isSaving}
            >
              保存设置
            </PixelButton>
          }
        />

        {/* LLM 服务商配置 */}
        <SettingsSection
          title="LLM 文本生成"
          description="配置用于剧本解析、角色描述等文本生成任务的服务商"
        >
          <ProviderSelector
            value={settings.llmProvider}
            onChange={(provider) => setSettings({ ...settings, llmProvider: provider })}
            providers={llmProviders}
          />

          {settings.llmProvider === 'apiyi' && (
            <PixelInput
              label="API易 API Key"
              placeholder="sk-..."
              type="password"
              value={settings.llmApiyiApiKey}
              onChange={(e) => setSettings({ ...settings, llmApiyiApiKey: e.target.value })}
              helperText="从 apiyi.com 控制台获取"
            />
          )}

          {settings.llmProvider === 'aliyun' && (
            <PixelInput
              label="阿里云 API Key"
              placeholder="sk-..."
              type="password"
              value={settings.llmAliyunApiKey}
              onChange={(e) => setSettings({ ...settings, llmAliyunApiKey: e.target.value })}
              helperText="从阿里云 DashScope 控制台获取"
            />
          )}

          {settings.llmProvider === 'official' && (
            <div className="space-y-4">
              <PixelInput
                label="Google Gemini API Key"
                placeholder="AIza..."
                type="password"
                value={settings.llmOfficialGeminiKey}
                onChange={(e) => setSettings({ ...settings, llmOfficialGeminiKey: e.target.value })}
                helperText="从 Google AI Studio 获取"
              />
              <PixelInput
                label="Anthropic Claude API Key"
                placeholder="sk-ant-..."
                type="password"
                value={settings.llmOfficialClaudeKey}
                onChange={(e) => setSettings({ ...settings, llmOfficialClaudeKey: e.target.value })}
                helperText="从 Anthropic Console 获取"
              />
            </div>
          )}

          {settings.llmProvider === 'custom' && (
            <div className="space-y-4">
              <PixelInput
                label="API 服务地址"
                placeholder="https://api.example.com"
                value={settings.llmCustomBaseUrl}
                onChange={(e) => setSettings({ ...settings, llmCustomBaseUrl: e.target.value })}
                helperText="OpenAI 兼容格式的 API 地址"
              />
              <PixelInput
                label="API Key"
                placeholder="sk-..."
                type="password"
                value={settings.llmCustomApiKey}
                onChange={(e) => setSettings({ ...settings, llmCustomApiKey: e.target.value })}
              />
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-text-secondary">文本模型</label>
              <PixelButton
                variant="ghost"
                size="sm"
                leftIcon={<IconRefresh size={12} />}
                onClick={handleFetchLlmModels}
                loading={fetchingLlmModels}
              >
                获取模型列表
              </PixelButton>
            </div>
            {textModels.length > 10 && (
              <PixelInput
                placeholder="搜索模型..."
                value={textModelSearch}
                onChange={(e) => setTextModelSearch(e.target.value)}
                className="mb-2"
              />
            )}
            <PixelSelect
              value={settings.defaultTextModel}
              onChange={(value) => setSettings({ ...settings, defaultTextModel: value })}
              options={filteredTextModels.map(m => ({
                value: m.id,
                label: `${m.name} (${m.provider})`,
              }))}
            />
            {textModels.length > 0 && (
              <p className="text-xs text-text-muted mt-1">
                共 {textModels.length} 个模型{textModelSearch && filteredTextModels.length !== textModels.length && `，已筛选 ${filteredTextModels.length} 个`}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <ApiStatus connected={llmStatus.connected} message={llmStatus.message} />
            <PixelButton
              variant="ghost"
              size="sm"
              leftIcon={<IconRefresh size={14} />}
              onClick={handleTestLlm}
              loading={testingLlm}
            >
              测试连接
            </PixelButton>
          </div>
        </SettingsSection>

        {/* 图像服务商配置 */}
        <SettingsSection
          title="图像生成"
          description="配置用于分镜图、角色头像等图像生成任务的服务商"
        >
          <ProviderSelector
            value={settings.imageProvider}
            onChange={(provider) => setSettings({ ...settings, imageProvider: provider })}
            providers={imageProviders}
          />

          {settings.imageProvider === 'apiyi' && (
            <PixelInput
              label="API易 API Key"
              placeholder="sk-..."
              type="password"
              value={settings.imageApiyiApiKey}
              onChange={(e) => setSettings({ ...settings, imageApiyiApiKey: e.target.value })}
              helperText="从 apiyi.com 控制台获取"
            />
          )}

          {settings.imageProvider === 'aliyun' && (
            <PixelInput
              label="阿里云 API Key"
              placeholder="sk-..."
              type="password"
              value={settings.imageAliyunApiKey}
              onChange={(e) => setSettings({ ...settings, imageAliyunApiKey: e.target.value })}
              helperText="从阿里云 DashScope 控制台获取"
            />
          )}

          {settings.imageProvider === 'official' && (
            <PixelInput
              label="Google Gemini API Key"
              placeholder="AIza..."
              type="password"
              value={settings.imageOfficialGeminiKey}
              onChange={(e) => setSettings({ ...settings, imageOfficialGeminiKey: e.target.value })}
              helperText="从 Google AI Studio 获取"
            />
          )}

          {settings.imageProvider === 'custom' && (
            <div className="space-y-4">
              <PixelInput
                label="API 服务地址"
                placeholder="https://api.example.com"
                value={settings.imageCustomBaseUrl}
                onChange={(e) => setSettings({ ...settings, imageCustomBaseUrl: e.target.value })}
                helperText="DALL-E 兼容格式的 API 地址"
              />
              <PixelInput
                label="API Key"
                placeholder="sk-..."
                type="password"
                value={settings.imageCustomApiKey}
                onChange={(e) => setSettings({ ...settings, imageCustomApiKey: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-text-secondary">图像模型</label>
                <PixelButton
                  variant="ghost"
                  size="sm"
                  leftIcon={<IconRefresh size={12} />}
                  onClick={handleFetchImageModels}
                  loading={fetchingImageModels}
                >
                  获取
                </PixelButton>
              </div>
              {imageModels.length > 10 && (
                <PixelInput
                  placeholder="搜索..."
                  value={imageModelSearch}
                  onChange={(e) => setImageModelSearch(e.target.value)}
                  className="mb-2"
                />
              )}
              <PixelSelect
                value={settings.defaultImageModel}
                onChange={(value) => setSettings({ ...settings, defaultImageModel: value })}
                options={filteredImageModels.map(m => ({
                  value: m.id,
                  label: `${m.name}`,
                }))}
              />
              {imageModels.length > 0 && (
                <p className="text-xs text-text-muted mt-1">
                  共 {imageModels.length} 个{imageModelSearch && filteredImageModels.length !== imageModels.length && `，筛选 ${filteredImageModels.length}`}
                </p>
              )}
            </div>
            <PixelSelect
              label="图像分辨率"
              value={settings.defaultImageSize}
              onChange={(value) => setSettings({ ...settings, defaultImageSize: value })}
              options={imageSizes.map(s => ({
                value: s.id,
                label: s.name,
              }))}
            />
            <PixelSelect
              label="图像宽高比"
              value={settings.imageAspectRatio}
              onChange={(value) => setSettings({ ...settings, imageAspectRatio: value })}
              options={aspectRatios.map(r => ({
                value: r.id,
                label: r.name,
              }))}
            />
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <ApiStatus connected={imageStatus.connected} message={imageStatus.message} />
            <PixelButton
              variant="ghost"
              size="sm"
              leftIcon={<IconRefresh size={14} />}
              onClick={handleTestImage}
              loading={testingImage}
            >
              测试连接
            </PixelButton>
          </div>
        </SettingsSection>

        {/* 视频服务商配置 */}
        <SettingsSection
          title="视频生成"
          description="配置用于分镜视频生成任务的服务商"
        >
          <ProviderSelector
            value={settings.videoProvider}
            onChange={(provider) => setSettings({ ...settings, videoProvider: provider })}
            providers={videoProviders}
          />

          {settings.videoProvider === 'apiyi' && (
            <PixelInput
              label="API易 API Key"
              placeholder="sk-..."
              type="password"
              value={settings.videoApiyiApiKey}
              onChange={(e) => setSettings({ ...settings, videoApiyiApiKey: e.target.value })}
              helperText="从 apiyi.com 控制台获取"
            />
          )}

          {settings.videoProvider === 'aliyun' && (
            <PixelInput
              label="阿里云 API Key"
              placeholder="sk-..."
              type="password"
              value={settings.videoAliyunApiKey}
              onChange={(e) => setSettings({ ...settings, videoAliyunApiKey: e.target.value })}
              helperText="从阿里云 DashScope 控制台获取"
            />
          )}

          {settings.videoProvider === 'custom' && (
            <div className="space-y-4">
              <PixelInput
                label="API 服务地址"
                placeholder="https://api.example.com"
                value={settings.videoCustomBaseUrl}
                onChange={(e) => setSettings({ ...settings, videoCustomBaseUrl: e.target.value })}
                helperText="视频生成 API 地址"
              />
              <PixelInput
                label="API Key"
                placeholder="sk-..."
                type="password"
                value={settings.videoCustomApiKey}
                onChange={(e) => setSettings({ ...settings, videoCustomApiKey: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-text-secondary">视频模型</label>
                <PixelButton
                  variant="ghost"
                  size="sm"
                  leftIcon={<IconRefresh size={12} />}
                  onClick={handleFetchVideoModels}
                  loading={fetchingVideoModels}
                >
                  获取
                </PixelButton>
              </div>
              {videoModels.length > 10 && (
                <PixelInput
                  placeholder="搜索..."
                  value={videoModelSearch}
                  onChange={(e) => setVideoModelSearch(e.target.value)}
                  className="mb-2"
                />
              )}
              <PixelSelect
                value={settings.defaultVideoModel}
                onChange={(value) => setSettings({ ...settings, defaultVideoModel: value })}
                options={filteredVideoModels.map(m => ({
                  value: m.id,
                  label: m.price ? `${m.name} - ${m.price}` : m.name,
                }))}
              />
              {videoModels.length > 0 && (
                <p className="text-xs text-text-muted mt-1">
                  共 {videoModels.length} 个{videoModelSearch && filteredVideoModels.length !== videoModels.length && `，筛选 ${filteredVideoModels.length}`}
                </p>
              )}
            </div>
            <PixelInput
              label="默认视频时长"
              value={String(settings.defaultVideoDuration)}
              type="number"
              onChange={(e) =>
                setSettings({ ...settings, defaultVideoDuration: parseInt(e.target.value) || 5 })
              }
              helperText="单个分镜视频时长（秒）"
            />
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <ApiStatus connected={videoStatus.connected} message={videoStatus.message} />
            <PixelButton
              variant="ghost"
              size="sm"
              leftIcon={<IconRefresh size={14} />}
              onClick={handleTestVideo}
              loading={testingVideo}
            >
              测试连接
            </PixelButton>
          </div>
        </SettingsSection>

        {/* 数据管理 */}
        <SettingsSection
          title="数据管理"
          description="备份和恢复应用数据"
        >
          {/* 数据库信息 */}
          {dbInfo && (
            <div className="mb-6 p-4 bg-bg-tertiary border-2 border-border">
              <div className="flex items-center gap-2 mb-2">
                <IconDatabase size={16} className="text-text-muted" />
                <span className="font-pixel text-sm">数据库信息</span>
              </div>
              <div className="text-xs text-text-secondary space-y-1">
                <p>位置: {dbInfo.path}</p>
                <p>大小: {formatSize(dbInfo.size)}</p>
              </div>
            </div>
          )}

          {/* 备份/导入按钮 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-bg-tertiary border-2 border-border">
              <h4 className="font-pixel text-sm mb-2">备份数据库</h4>
              <p className="text-xs text-text-secondary mb-4">
                将当前数据库备份到指定位置，包括所有项目、角色、分镜数据
              </p>
              <PixelButton
                variant="ghost"
                size="sm"
                leftIcon={<IconDownload size={14} />}
                onClick={handleBackup}
              >
                备份数据库
              </PixelButton>
              {backupStatus && (
                <p className="text-xs text-text-muted mt-2">{backupStatus}</p>
              )}
            </div>

            <div className="p-4 bg-bg-tertiary border-2 border-border">
              <h4 className="font-pixel text-sm mb-2">导入数据库</h4>
              <p className="text-xs text-text-secondary mb-4">
                从备份文件恢复数据，当前数据将被替换
              </p>
              <PixelButton
                variant="ghost"
                size="sm"
                leftIcon={<IconUpload size={14} />}
                onClick={handleImport}
              >
                导入数据库
              </PixelButton>
              {importStatus && (
                <p className="text-xs text-text-muted mt-2">{importStatus}</p>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-bg-tertiary border-2 border-border flex items-start gap-2">
            <IconWarning size={16} className="text-status-warning shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              导入数据库会覆盖当前所有数据，建议先进行备份。导入完成后请重启应用以确保数据完整性。
            </p>
          </div>
        </SettingsSection>

        {/* 存储设置 */}
        <SettingsSection
          title="存储设置"
          description="配置项目文件的存储位置（生成的图片、视频等资源）"
        >
          <div>
            <label className="block text-sm text-text-secondary mb-2">项目存储路径</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <PixelInput
                  value={settings.storagePath || '使用默认路径'}
                  onChange={(e) => setSettings({ ...settings, storagePath: e.target.value })}
                />
              </div>
              <PixelButton
                variant="ghost"
                leftIcon={<IconFolder size={14} />}
                onClick={async () => {
                  try {
                    const result = await window.electron.invoke('settings:select-storage-path');
                    if (result.success && result.path) {
                      setSettings({ ...settings, storagePath: result.path });
                    }
                  } catch (error) {
                    console.error('Failed to select storage path:', error);
                  }
                }}
              >
                浏览
              </PixelButton>
            </div>
            <p className="text-xs text-text-muted mt-2">项目资源文件存储位置</p>
          </div>
          <div className="mt-4 p-3 bg-bg-tertiary border-2 border-border flex items-start gap-2">
            <IconWarning size={16} className="text-status-warning shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              更改存储路径不会移动现有项目文件，请手动迁移。留空则使用默认路径。
            </p>
          </div>
        </SettingsSection>
      </PageContainer>
    </>
  );
}
