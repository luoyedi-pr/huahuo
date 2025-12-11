import { getLlmApiConfig, getImageApiConfig, getVideoApiConfig } from './settings.service';
import { getShot, updateShot } from './shot.service';
import { getCharacter } from './character.service';
import { getProject } from './project.service';
import { saveProjectFile } from './utils';
import { net } from 'electron';
import {
  applyStyleToImagePrompt,
  applyStyleToVideoPrompt,
  applyStyleToCharacterDescription,
  getStyleNegativePrompt,
} from './style.service';

type ProgressCallback = (progress: number) => void;

/**
 * 解析 API 错误并返回友好的中文提示
 */
function parseApiError(error: string): string {
  // 尝试解析 JSON 错误
  try {
    const jsonMatch = error.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // API易 错误格式
      if (parsed.error?.localized_message) {
        return parsed.error.localized_message;
      }
      if (parsed.error?.message) {
        // 检查常见错误
        if (parsed.error.message.includes('insufficient_user_quota') ||
            parsed.error.message.includes('quota') ||
            parsed.error.message.includes('not enough')) {
          return '账户余额不足，请充值后重试';
        }
        return parsed.error.message;
      }

      // 阿里云错误格式
      if (parsed.message) {
        if (parsed.code === 'DataInspectionFailed') {
          return '内容审核未通过，请修改描述后重试';
        }
        if (parsed.code === 'InvalidApiKey') {
          return 'API密钥无效，请检查设置';
        }
        return parsed.message;
      }
    }
  } catch {
    // 解析失败，使用原始错误
  }

  // 检查常见错误关键词
  if (error.includes('insufficient') || error.includes('quota') || error.includes('余额不足')) {
    return '账户余额不足，请充值后重试';
  }
  if (error.includes('DataInspectionFailed') || error.includes('inappropriate')) {
    return '内容审核未通过，请修改描述后重试';
  }
  if (error.includes('InvalidApiKey') || error.includes('Unauthorized') || error.includes('401')) {
    return 'API密钥无效，请检查设置';
  }
  if (error.includes('timeout') || error.includes('ETIMEDOUT')) {
    return '请求超时，请稍后重试';
  }
  if (error.includes('network') || error.includes('ECONNREFUSED')) {
    return '网络连接失败，请检查网络';
  }

  return error;
}

/**
 * 下载图片并返回 Buffer（带超时和重试）
 * 用于下载阿里云 OSS 等远程图片
 */
async function downloadImageWithRetry(url: string, maxRetries = 3, timeoutMs = 60000): Promise<Buffer> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI Service] 下载图片尝试 ${attempt}/${maxRetries}: ${url.substring(0, 100)}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP 错误: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(`[AI Service] 图片下载成功，大小: ${arrayBuffer.byteLength} 字节`);
        return Buffer.from(arrayBuffer);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error: any) {
      lastError = error;
      console.error(`[AI Service] 下载图片失败 (尝试 ${attempt}/${maxRetries}):`, error.message);

      if (attempt < maxRetries) {
        // 等待后重试，每次增加等待时间
        const waitTime = attempt * 2000;
        console.log(`[AI Service] ${waitTime}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error(`图片下载失败（已重试 ${maxRetries} 次）: ${lastError?.message || '未知错误'}`);
}

/**
 * 使用 Node.js fetch 发送请求（更好的兼容性）
 * 如果 Node.js fetch 失败，回退到 Electron net 模块
 */
async function electronFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  } = {}
): Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> }> {
  const timeoutMs = options.timeout || 120000;

  // 首先尝试使用 Node.js 原生 fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text: async () => responseText,
      json: async () => JSON.parse(responseText),
    };
  } catch (fetchError: any) {
    console.log('[AI Service] Node.js fetch 失败，尝试使用 Electron net:', fetchError.message);

    // 回退到 Electron net 模块
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;

      try {
        const request = net.request({
          method: options.method || 'GET',
          url,
        });

        // 设置请求头
        if (options.headers) {
          for (const [key, value] of Object.entries(options.headers)) {
            request.setHeader(key, value);
          }
        }

        let responseData = '';
        let statusCode = 0;

        // 超时处理
        timeoutId = setTimeout(() => {
          request.abort();
          reject(new Error('请求超时'));
        }, timeoutMs);

        request.on('response', (response) => {
          statusCode = response.statusCode;

          response.on('data', (chunk) => {
            responseData += chunk.toString();
          });

          response.on('end', () => {
            clearTimeout(timeoutId);
            resolve({
              ok: statusCode >= 200 && statusCode < 300,
              status: statusCode,
              text: async () => responseData,
              json: async () => JSON.parse(responseData),
            });
          });

          response.on('error', (error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
        });

        request.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });

        // 发送请求体
        if (options.body) {
          request.write(options.body);
        }

        request.end();
      } catch (error) {
        clearTimeout(timeoutId!);
        reject(error);
      }
    });
  }
}

/**
 * AI 服务 - 统一处理官方 API、API易 和通用聚合 API
 *
 * 支持的模式:
 * - official: Google Gemini 官方直连
 * - apiyi: API易 聚合服务 (推荐)
 * - aggregator: 通用 OpenAI 兼容聚合服务
 */

// ==================== 文本生成 ====================

/**
 * 调用文本生成 API
 */
export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const config = await getLlmApiConfig();

  // 检查 API 配置
  if (config.provider === 'official') {
    if (!config.geminiApiKey) {
      throw new Error('请先在设置中配置 Gemini API Key');
    }
    return await callGeminiText(config.geminiApiKey, prompt, systemPrompt, config.textModel);
  } else if (config.provider === 'aliyun') {
    if (!config.apiKey) {
      throw new Error('请先在设置中配置阿里云 API Key');
    }
    return await callOpenAICompatText(
      config.baseUrl,
      config.apiKey,
      prompt,
      systemPrompt,
      config.textModel
    );
  } else if (config.provider === 'apiyi') {
    if (!config.apiKey) {
      throw new Error('请先在设置中配置 API易 API Key');
    }
    return await callOpenAICompatText(
      config.baseUrl,
      config.apiKey,
      prompt,
      systemPrompt,
      config.textModel
    );
  } else {
    if (!config.apiKey) {
      throw new Error('请先在设置中配置 API Key');
    }
    if (!config.baseUrl) {
      throw new Error('请先在设置中配置 API 服务地址');
    }
    return await callOpenAICompatText(
      config.baseUrl,
      config.apiKey,
      prompt,
      systemPrompt,
      config.textModel
    );
  }
}

/**
 * Gemini 文本生成
 */
async function callGeminiText(
  apiKey: string,
  prompt: string,
  systemPrompt?: string,
  model = 'gemini-2.0-flash'
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];
  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: '好的，我会按照您的要求进行。' }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    if (message.includes('fetch failed') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      throw new Error('无法连接到 Google API，请检查网络设置或使用代理/VPN');
    }
    throw new Error(`网络请求失败: ${message}`);
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API 错误: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * OpenAI 兼容格式文本生成 (API易/聚合)
 */
async function callOpenAICompatText(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  systemPrompt?: string,
  model = 'gemini-2.0-flash'
): Promise<string> {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const url = `${baseUrl}/v1/chat/completions`;
  const body = JSON.stringify({
    model,
    messages,
  });

  console.log('[AI Service] 发送请求到:', url);
  console.log('[AI Service] 使用模型:', model);

  let response: { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> };
  try {
    // 使用 Electron net 模块，更好的代理支持
    response = await electronFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body,
      timeout: 300000, // 5分钟超时，剧本分析等复杂任务需要更长时间
    });
  } catch (error) {
    // 网络错误
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[AI Service] 请求失败:', message);

    if (message.includes('超时')) {
      throw new Error('请求超时，请稍后重试');
    }
    if (message.includes('fetch failed') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED') || message.includes('net::')) {
      throw new Error(`网络连接失败，请检查网络设置。服务地址: ${baseUrl}`);
    }
    throw new Error(`网络请求失败: ${message}`);
  }

  console.log('[AI Service] 响应状态:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('[AI Service] API 错误响应:', error);
    throw new Error(`API 错误: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  console.log('[AI Service] 响应内容长度:', content.length);

  return content;
}

// ==================== 图像生成 ====================

/**
 * 生成分镜图像
 * 使用完整的场景信息、角色参考图和项目风格
 */
export async function generateShotImage(
  shotId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const shot = await getShot(shotId);
  if (!shot) throw new Error('分镜不存在');

  onProgress?.(10);

  // 获取项目风格
  const project = await getProject(shot.projectId);
  const styleId = project?.styleId || 'animation_anime_2d';

  // 构建完整的场景描述
  let prompt = '';

  // 1. 场景环境信息
  if (shot.location || shot.timeOfDay) {
    prompt += `场景: ${shot.location || '未知地点'}`;
    if (shot.timeOfDay) {
      prompt += `，${shot.timeOfDay}`;
    }
    prompt += '\n';
  }

  // 2. 道具和布景
  if (shot.props) {
    prompt += `环境布置: ${shot.props}\n`;
  }

  // 3. 画面描述
  prompt += `\n画面描述: ${shot.description}`;

  // 4. 动作描述
  if (shot.action) {
    prompt += `\n动作: ${shot.action}`;
  }

  // 5. 角色信息和外貌（应用风格）
  let characterAvatarPath: string | null = null;
  if (shot.characterId) {
    const character = await getCharacter(shot.characterId);
    if (character) {
      if (character.appearance) {
        // 应用风格到角色描述
        const styledAppearance = applyStyleToCharacterDescription(character.appearance, styleId);
        prompt += `\n\n角色【${character.name}】: ${styledAppearance}`;
      }
      // 获取角色头像作为参考图
      if (character.avatarPath) {
        characterAvatarPath = character.avatarPath;
      } else if (character.generatedAvatars && character.generatedAvatars.length > 0) {
        characterAvatarPath = character.generatedAvatars[0];
      }
    }
  }

  // 6. 镜头和情绪信息
  if (shot.cameraType) {
    prompt += `\n\n镜头类型: ${shot.cameraType}`;
  }
  if (shot.mood) {
    prompt += `\n情绪氛围: ${shot.mood}`;
  }

  // 7. 应用风格提示词
  const styledPrompt = applyStyleToImagePrompt(prompt, styleId);

  onProgress?.(20);

  // 调用图像生成 API（根据是否有参考图选择不同方法）
  const config = await getImageApiConfig();
  let imageBuffer: Buffer;

  // 如果是阿里云且有角色参考图，使用图片编辑模型
  if (config.provider === 'aliyun' && characterAvatarPath) {
    imageBuffer = await generateImageWithReference(styledPrompt, characterAvatarPath, styleId);
  } else {
    imageBuffer = await generateImage(styledPrompt, styleId);
  }

  onProgress?.(80);

  // 保存图像
  const filename = `shot_${shot.index}_${Date.now()}.png`;
  const imagePath = saveProjectFile(shot.projectId, 'images', filename, imageBuffer);

  // 更新分镜
  await updateShot(shotId, {
    imagePath,
    status: 'ready',
  });

  onProgress?.(100);

  return imagePath;
}

/**
 * 调用图像生成 API
 * @param prompt 提示词（已应用风格）
 * @param styleId 风格ID（用于获取负面提示词）
 */
async function generateImage(prompt: string, styleId?: string): Promise<Buffer> {
  const config = await getImageApiConfig();
  // 获取负面提示词（后续可用于支持的 API）
  const _negativePrompt = styleId ? getStyleNegativePrompt(styleId) : '';
  void _negativePrompt; // 保留变量，后续 API 支持时使用

  // 提示词已经包含风格信息，这里只做基础增强
  const enhancedPrompt = `高质量画面，专业灯光，${prompt}`;

  if (config.provider === 'official') {
    return await callGeminiImage(config.geminiApiKey!, enhancedPrompt);
  } else if (config.provider === 'aliyun') {
    // 阿里云使用通义万相
    return await callAliyunImage(
      config.baseUrl,
      config.apiKey,
      enhancedPrompt,
      config.imageModel,
      config.imageAspectRatio,
      config.imageSize
    );
  } else if (config.provider === 'apiyi') {
    // API易 使用 Google native format 图像生成
    return await callApiyiImage(
      config.baseUrl,
      config.apiKey,
      enhancedPrompt,
      config.imageModel,
      config.imageAspectRatio,
      config.imageSize
    );
  } else {
    // 通用聚合 API 使用 DALL-E 格式
    return await callAggregatorImage(config.baseUrl!, config.apiKey!, enhancedPrompt);
  }
}

/**
 * Gemini 官方图像生成
 */
async function callGeminiImage(apiKey: string, prompt: string): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Generate an image: ${prompt}`,
        }],
      }],
      generationConfig: {
        responseModalities: ['image', 'text'],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini Image API 错误: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data: string } }) => p.inlineData?.data
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error('未能生成图像');
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}

/**
 * API易 图像生成 (Google native format)
 * 支持自定义分辨率和宽高比
 */
async function callApiyiImage(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  model = 'gemini-3-pro-image-preview',
  aspectRatio = '16:9',
  imageSize = '2K'
): Promise<Buffer> {
  const url = `${baseUrl}/v1beta/models/${model}:generateContent`;

  console.log('[AI Service] 图像生成请求:', url);
  console.log('[AI Service] 图像模型:', model);

  let response: { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> };
  try {
    response = await electronFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      }),
      timeout: 180000, // 3分钟超时，图像生成可能较慢
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[AI Service] 图像生成请求失败:', message);
    if (message.includes('超时')) {
      throw new Error('图像生成超时，请稍后重试');
    }
    throw new Error(`图像生成网络请求失败: ${message}`);
  }

  console.log('[AI Service] 图像生成响应状态:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('[AI Service] 图像生成错误响应:', error);
    throw new Error(parseApiError(`API易 图像生成错误: ${response.status} - ${error}`));
  }

  const data = await response.json();

  // 解析响应 - API易 返回 base64 图像数据
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData?.data
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error('未能生成图像');
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}

/**
 * 阿里云通义千问图像生成 (Qwen-Image)
 * 使用 DashScope 同步接口 (推荐)
 * 文档: https://help.aliyun.com/zh/model-studio/qwen-image
 */
async function callAliyunImage(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  model = 'qwen-image-plus',
  aspectRatio = '16:9',
  _imageSize = '2K' // 阿里云 Qwen-Image 使用固定尺寸，此参数保留以保持接口一致性
): Promise<Buffer> {
  // 转换宽高比为阿里云支持的尺寸
  // 支持的尺寸: 1664*928(16:9), 1472*1140(4:3), 1328*1328(1:1), 1140*1472(3:4), 928*1664(9:16)
  const sizeMap: Record<string, string> = {
    '16:9': '1664*928',
    '9:16': '928*1664',
    '1:1': '1328*1328',
    '4:3': '1472*1140',
    '3:4': '1140*1472',
  };
  const size = sizeMap[aspectRatio] || '1664*928';

  // 使用同步接口 (推荐)
  const url = `${baseUrl}/services/aigc/multimodal-generation/generation`;

  console.log('[AI Service] 阿里云图像生成请求:', url);
  console.log('[AI Service] 图像模型:', model);
  console.log('[AI Service] 图像尺寸:', size);

  let response: { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> };
  try {
    // 使用同步接口的 messages 格式
    response = await electronFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { text: prompt }
              ]
            }
          ]
        },
        parameters: {
          size,
          prompt_extend: true,
          watermark: false,
        },
      }),
      timeout: 180000, // 3分钟超时
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[AI Service] 阿里云图像生成请求失败:', message);
    throw new Error(`阿里云图像生成网络请求失败: ${message}`);
  }

  if (!response.ok) {
    const error = await response.text();
    console.error('[AI Service] 阿里云图像生成错误响应:', error);
    throw new Error(parseApiError(`阿里云图像生成错误: ${response.status} - ${error}`));
  }

  const data = await response.json();
  console.log('[AI Service] 阿里云图像生成响应:', JSON.stringify(data).substring(0, 500));

  // 同步接口响应格式: output.choices[0].message.content[0].image
  const imageUrl = data.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!imageUrl) {
    console.error('[AI Service] 阿里云图像生成响应解析失败:', JSON.stringify(data));
    throw new Error('阿里云图像生成失败: 未获取到图像URL');
  }

  console.log('[AI Service] 阿里云图像URL:', imageUrl);

  // 下载图像 - 使用带重试的下载函数
  return await downloadImageWithRetry(imageUrl);
}

/**
 * 使用参考图生成图像（阿里云 qwen-image-edit-plus）
 * 用于分镜生成时，将角色参考图融入画面
 * @param prompt 提示词（已应用风格）
 * @param referenceImagePath 参考图路径
 * @param styleId 风格ID
 */
async function generateImageWithReference(prompt: string, referenceImagePath: string, styleId?: string): Promise<Buffer> {
  const config = await getImageApiConfig();

  if (config.provider !== 'aliyun') {
    // 非阿里云，回退到普通生成
    return await generateImage(prompt, styleId);
  }

  // 读取参考图片并转为 Base64
  const fs = await import('fs');
  const path = await import('path');

  if (!fs.existsSync(referenceImagePath)) {
    console.warn('[AI Service] 参考图不存在，回退到普通生成:', referenceImagePath);
    return await generateImage(prompt, styleId);
  }

  const imageBuffer = fs.readFileSync(referenceImagePath);
  const ext = path.extname(referenceImagePath).toLowerCase();

  // 获取 MIME 类型
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.webp': 'image/webp',
  };
  const mimeType = mimeTypes[ext] || 'image/png';
  const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

  // 转换宽高比为阿里云支持的尺寸
  const aspectRatio = config.imageAspectRatio || '16:9';
  const sizeMap: Record<string, string> = {
    '16:9': '1664*928',
    '9:16': '928*1664',
    '1:1': '1328*1328',
    '4:3': '1472*1140',
    '3:4': '1140*1472',
  };
  const size = sizeMap[aspectRatio] || '1664*928';

  const url = `${config.baseUrl}/services/aigc/multimodal-generation/generation`;

  console.log('[AI Service] 阿里云参考图编辑请求:', url);
  console.log('[AI Service] 使用模型: qwen-image-edit-plus');
  console.log('[AI Service] 参考图:', referenceImagePath);
  console.log('[AI Service] 风格:', styleId);

  // 提示词已包含风格信息，这里只添加参考图指引
  const enhancedPrompt = `参考图1中的人物形象，生成以下场景：

${prompt}

保持参考图1中人物的外貌特征和风格一致性。`;

  let response: { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> };
  try {
    response = await electronFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-image-edit-plus',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { image: base64Image },
                { text: enhancedPrompt }
              ]
            }
          ]
        },
        parameters: {
          size,
          n: 1,
          prompt_extend: true,
          watermark: false,
        },
      }),
      timeout: 180000, // 3分钟超时
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[AI Service] 阿里云参考图编辑请求失败:', message);
    throw new Error(`阿里云参考图编辑请求失败: ${message}`);
  }

  if (!response.ok) {
    const error = await response.text();
    console.error('[AI Service] 阿里云参考图编辑错误响应:', error);
    throw new Error(parseApiError(`阿里云参考图编辑错误: ${response.status} - ${error}`));
  }

  const data = await response.json();
  console.log('[AI Service] 阿里云参考图编辑响应:', JSON.stringify(data).substring(0, 500));

  // 响应格式: output.choices[0].message.content[0].image
  const imageUrl = data.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!imageUrl) {
    console.error('[AI Service] 阿里云参考图编辑响应解析失败:', JSON.stringify(data));
    throw new Error('阿里云参考图编辑失败: 未获取到图像URL');
  }

  console.log('[AI Service] 阿里云生成图像URL:', imageUrl);

  // 下载图像 - 使用带重试的下载函数
  return await downloadImageWithRetry(imageUrl);
}

/**
 * 通用聚合 API 图像生成 (DALL-E 格式)
 */
async function callAggregatorImage(baseUrl: string, apiKey: string, prompt: string): Promise<Buffer> {
  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size: '1792x1024',
      quality: 'hd',
      n: 1,
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`图像生成 API 错误: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error('未能生成图像');
  }

  return Buffer.from(b64, 'base64');
}

// ==================== 视频生成 ====================

/**
 * 生成分镜视频
 * 使用完整的场景信息、角色外貌和项目风格来生成视频
 */
export async function generateShotVideo(
  shotId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const shot = await getShot(shotId);
  if (!shot) throw new Error('分镜不存在');

  onProgress?.(10);

  // 获取项目风格
  const project = await getProject(shot.projectId);
  const styleId = project?.styleId || 'animation_anime_2d';

  // 构建完整的视频提示词
  let prompt = '';

  // 1. 场景信息
  if (shot.sceneInfo || shot.location || shot.timeOfDay) {
    prompt += '场景: ';
    if (shot.location) {
      prompt += shot.location;
    }
    if (shot.timeOfDay) {
      prompt += `，${shot.timeOfDay}`;
    }
    prompt += '\n';
  }

  // 2. 道具和布景
  if (shot.props) {
    prompt += `环境布置: ${shot.props}\n`;
  }

  // 3. 画面描述
  prompt += `\n画面描述: ${shot.description}`;

  // 4. 动作描述
  if (shot.action) {
    prompt += `\n动作: ${shot.action}`;
  }

  // 5. 角色信息和外貌（应用风格）
  if (shot.characterId) {
    const character = await getCharacter(shot.characterId);
    if (character) {
      if (character.appearance) {
        const styledAppearance = applyStyleToCharacterDescription(character.appearance, styleId);
        prompt += `\n\n角色【${character.name}】: ${styledAppearance}`;
      }
    }
  }

  // 6. 镜头和情绪信息
  if (shot.cameraType) {
    prompt += `\n\n镜头类型: ${shot.cameraType}`;
  }
  if (shot.mood) {
    prompt += `\n情绪氛围: ${shot.mood}`;
  }

  // 7. 应用风格提示词
  const styledPrompt = applyStyleToVideoPrompt(prompt, styleId);

  onProgress?.(20);

  // 视频生成
  const videoBuffer = await generateVideo(styledPrompt, shot.imagePath, onProgress);

  onProgress?.(80);

  // 保存视频
  const filename = `shot_${shot.index}_${Date.now()}.mp4`;
  const videoPath = saveProjectFile(shot.projectId, 'videos', filename, videoBuffer);

  // 更新分镜
  await updateShot(shotId, {
    videoPath,
    status: 'ready',
  });

  onProgress?.(100);

  return videoPath;
}

/**
 * 调用视频生成 API
 */
async function generateVideo(
  prompt: string,
  imagePath: string | null,
  onProgress?: ProgressCallback
): Promise<Buffer> {
  const config = await getVideoApiConfig();

  if (config.provider === 'aliyun') {
    // 阿里云视频生成
    return await callAliyunVideo(
      config.baseUrl,
      config.apiKey,
      prompt,
      imagePath,
      config.videoModel,
      onProgress
    );
  }

  if (config.provider === 'apiyi') {
    // API易 使用 Sora/VEO 视频生成
    return await callApiyiVideo(
      config.baseUrl,
      config.apiKey,
      prompt,
      imagePath,
      config.videoModel,
      onProgress
    );
  }

  // 通用聚合 API
  return await callAggregatorVideo(config.baseUrl!, config.apiKey!, prompt);
}

/**
 * API易 视频生成 (Sora/VEO)
 * 使用 chat completions 端点，流式响应
 */
async function callApiyiVideo(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  imagePath: string | null,
  model = 'sora_video2',
  onProgress?: ProgressCallback
): Promise<Buffer> {
  // 构建消息内容
  const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: 'text', text: prompt }
  ];

  // 如果有参考图片，添加图片（图生视频）
  if (imagePath) {
    try {
      const fs = require('fs');
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`
        }
      });
    } catch {
      // 图片读取失败，使用纯文本生成
    }
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{
        role: 'user',
        content: contentParts
      }]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(parseApiError(`API易 视频生成错误: ${response.status} - ${error}`));
  }

  // 处理流式响应
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  let videoUrl = '';
  let progress = 20;
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          // 检查是否有视频 URL
          const content = parsed.choices?.[0]?.delta?.content ||
                         parsed.choices?.[0]?.message?.content || '';

          // API易 返回的视频 URL 格式可能在 content 中
          if (content.includes('http') && (content.includes('.mp4') || content.includes('video'))) {
            const urlMatch = content.match(/https?:\/\/[^\s"']+/);
            if (urlMatch) {
              videoUrl = urlMatch[0];
            }
          }

          // 更新进度
          progress = Math.min(progress + 5, 75);
          onProgress?.(progress);
        } catch {
          // 跳过无法解析的行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!videoUrl) {
    throw new Error('视频生成失败: 未获取到视频 URL');
  }

  // 下载视频
  onProgress?.(80);
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`视频下载失败: ${videoResponse.status}`);
  }

  return Buffer.from(await videoResponse.arrayBuffer());
}

/**
 * 阿里云通义万相图生视频
 * 使用 DashScope 图生视频 API (video-synthesis)
 * 文档: https://help.aliyun.com/zh/model-studio/wanx-image-to-video
 */
async function callAliyunVideo(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  imagePath: string | null,
  model = 'wan2.1-i2v-turbo',
  onProgress?: ProgressCallback
): Promise<Buffer> {
  // 图生视频端点 (video-synthesis)
  const url = `${baseUrl}/services/aigc/video-generation/video-synthesis`;

  console.log('[AI Service] Aliyun I2V request:', url);
  console.log('[AI Service] Video model:', model);

  // 构建请求体
  const requestBody: any = {
    model,
    input: {
      prompt,
    },
    parameters: {
      resolution: '720P',
      duration: 5,
      prompt_extend: true,
      watermark: false,
    },
  };

  // 图生视频必须有参考图片
  if (imagePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const imageBuffer = fs.readFileSync(imagePath);
      const ext = path.extname(imagePath).toLowerCase();

      // 获取 MIME 类型
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
      };
      const mimeType = mimeTypes[ext] || 'image/png';
      const base64Image = imageBuffer.toString('base64');
      requestBody.input.img_url = `data:${mimeType};base64,${base64Image}`;
      console.log('[AI Service] Image loaded, size:', imageBuffer.length, 'bytes');
    } catch (err) {
      console.error('[AI Service] Failed to load image:', err);
      throw new Error('Failed to load reference image for video generation');
    }
  } else {
    throw new Error('Image-to-video requires a reference image (imagePath)');
  }

  let response: { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> };
  try {
    response = await electronFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(requestBody),
      timeout: 300000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI Service] Aliyun video request failed:', message);
    throw new Error(`Aliyun video network error: ${message}`);
  }

  if (!response.ok) {
    const error = await response.text();
    console.error('[AI Service] Aliyun video error response:', error);
    throw new Error(`Aliyun video error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('[AI Service] Task created:', JSON.stringify(data).substring(0, 200));

  // 阿里云异步任务，需要轮询获取结果
  const taskId = data.output?.task_id;
  if (!taskId) {
    throw new Error('Aliyun video task creation failed');
  }

  // 轮询获取结果 (视频生成通常需要1-5分钟)
  const resultUrl = `${baseUrl}/tasks/${taskId}`;
  let result: any;
  let progress = 20;

  // 最多等待10分钟 (200次 * 3秒)
  for (let i = 0; i < 200; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const statusResponse = await electronFetch(resultUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!statusResponse.ok) continue;

    result = await statusResponse.json();
    const taskStatus = result.output?.task_status;

    console.log(`[AI Service] Task status: ${taskStatus} (${i + 1}/200)`);

    if (taskStatus === 'SUCCEEDED') {
      break;
    } else if (taskStatus === 'FAILED') {
      const errorMsg = result.output?.message || 'Unknown error';
      throw new Error(`Aliyun video generation failed: ${errorMsg}`);
    }

    // 更新进度
    if (taskStatus === 'RUNNING') {
      progress = Math.min(progress + 1, 75);
    }
    onProgress?.(progress);
  }

  const videoUrl = result?.output?.video_url;
  if (!videoUrl) {
    throw new Error('Aliyun video generation timeout');
  }

  // 下载视频
  console.log('[AI Service] Downloading video:', videoUrl.substring(0, 100));
  onProgress?.(80);
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Video download failed: ${videoResponse.status}`);
  }

  return Buffer.from(await videoResponse.arrayBuffer());
}

/**
 * 通用聚合 API 视频生成
 */
async function callAggregatorVideo(
  baseUrl: string,
  apiKey: string,
  prompt: string
): Promise<Buffer> {
  const response = await fetch(`${baseUrl}/v1/videos/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'veo-2',
      prompt,
      duration: 5,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`视频生成 API 错误: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // 如果是异步任务，需要轮询获取结果
  if (data.taskId) {
    return await pollVideoTask(baseUrl, apiKey, data.taskId);
  }

  const videoUrl = data.data?.[0]?.url;
  if (!videoUrl) {
    throw new Error('未能生成视频');
  }

  // 下载视频
  const videoResponse = await fetch(videoUrl);
  return Buffer.from(await videoResponse.arrayBuffer());
}

/**
 * 轮询视频任务
 */
async function pollVideoTask(baseUrl: string, apiKey: string, taskId: string): Promise<Buffer> {
  const maxAttempts = 60;
  const interval = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    const response = await fetch(`${baseUrl}/v1/videos/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) continue;

    const data = await response.json();

    if (data.status === 'completed' && data.output?.url) {
      const videoResponse = await fetch(data.output.url);
      return Buffer.from(await videoResponse.arrayBuffer());
    }

    if (data.status === 'failed') {
      throw new Error(`视频生成失败: ${data.error || '未知错误'}`);
    }
  }

  throw new Error('视频生成超时');
}

// ==================== 角色头像生成 ====================

/**
 * 生成角色头像
 * 会应用项目的视觉风格
 */
export async function generateCharacterAvatar(
  characterId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const character = await getCharacter(characterId);
  if (!character) throw new Error('角色不存在');

  // 获取项目风格
  const project = await getProject(character.projectId);
  const styleId = project?.styleId || 'animation_anime_2d';

  onProgress?.(20);

  // 应用风格到角色描述
  const styledAppearance = applyStyleToCharacterDescription(
    character.appearance || '普通人物',
    styleId
  );

  const prompt = `人物肖像，高清头像，专业角色设计。

人物描述: ${character.name}
外貌特征: ${styledAppearance}
角色性格: ${character.description || ''}

要求: 角色设计图，简洁背景，突出人物特征`;

  // 应用风格提示词
  const styledPrompt = applyStyleToImagePrompt(prompt, styleId);

  const imageBuffer = await generateImage(styledPrompt, styleId);

  onProgress?.(80);

  const filename = `avatar_${character.name}_${Date.now()}.png`;
  const avatarPath = saveProjectFile(character.projectId, 'avatars', filename, imageBuffer);

  onProgress?.(100);

  return avatarPath;
}

/**
 * AI 生成角色外貌特征描述
 * 会根据项目风格生成对应风格的外貌描述
 */
export async function generateCharacterAppearance(
  characterId: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const character = await getCharacter(characterId);
  if (!character) throw new Error('角色不存在');

  // 获取项目风格
  const project = await getProject(character.projectId);
  const styleId = project?.styleId || 'animation_anime_2d';
  const styleConfig = await import('./style.service').then(m => m.getStyleConfig(styleId));

  onProgress?.(20);

  // 根据风格生成对应的系统提示词
  let styleGuidance = '';
  if (styleId.includes('children') || styleId.includes('animation_children')) {
    styleGuidance = `
**重要：这是儿童动画项目！**
- 角色必须是可爱、萌系的卡通风格
- 如果是儿童角色，要强调童真、活泼的特点
- 使用圆润、Q版的描述词汇
- 服装要色彩明亮、适合儿童`;
  } else if (styleId.includes('miyazaki') || styleId.includes('ghibli')) {
    styleGuidance = `
**重要：这是吉卜力/宫崎骏风格项目！**
- 角色要有吉卜力动画的特点：简洁但富有表现力
- 眼睛要温暖有神，表情自然
- 服装偏向日常、自然的风格
- 整体感觉要温暖、治愈`;
  } else if (styleId.includes('shinkai')) {
    styleGuidance = `
**重要：这是新海诚风格项目！**
- 角色要有新海诚动画的精致感
- 五官精致，眼睛明亮有神
- 整体感觉青春、唯美`;
  } else if (styleId.includes('shanghai')) {
    styleGuidance = `
**重要：这是中国传统动画风格项目！**
- 角色要有中国传统美术的特点
- 可以融入戏曲、国画等元素
- 整体风格要有中国古典美感`;
  } else if (styleId.includes('pixel')) {
    styleGuidance = `
**重要：这是像素风格项目！**
- 描述要适合像素化呈现
- 特征要简洁、易于辨识
- 避免过于复杂的细节`;
  } else if (styleId.includes('live_action')) {
    styleGuidance = `
**重要：这是真人风格项目！**
- 角色外貌要真实自然
- 描述要像真实人物
- 避免过于卡通化的描述`;
  }

  const systemPrompt = `你是一个专业的角色设计师。请根据角色的名字、定位和描述，生成详细的外貌特征描述。
描述需要具体、详细，便于 AI 绘图工具生成一致的角色形象。
${styleGuidance}

**必须包含以下方面：**
1. 性别（必须明确！）
2. 具体年龄（如"8岁"、"25岁"，不要模糊）
3. 脸型和五官特征（眼睛、鼻子、嘴巴、脸型）
4. 发型和发色（具体描述）
5. 体型和身高（相对描述即可）
6. 肤色
7. 服装风格（具体描述穿着）
8. 特殊标志（如配饰、特征等）

**注意：**
- 如果角色名暗示是儿童（如小明、小红、宝宝），必须描述为儿童
- 如果剧本是儿童剧，角色通常也是儿童或与儿童相关的成人
- 描述要与项目风格匹配：${styleConfig?.name || '通用风格'}

直接输出描述文字，不需要任何格式标记。`;

  const prompt = `请为以下角色生成详细的外貌特征描述：

角色名: ${character.name}
角色定位: ${character.role === 'protagonist' ? '主角' : character.role === 'antagonist' ? '反派' : '配角'}
角色描述: ${character.description || '暂无描述'}
项目风格: ${styleConfig?.name || '通用风格'}

请生成一段详细的外貌特征描述（200-300字），要符合【${styleConfig?.name || '通用'}】的艺术风格：`;

  onProgress?.(40);

  const appearance = await generateText(prompt, systemPrompt);

  onProgress?.(100);

  return appearance.trim();
}

/**
 * 生成角色三视图（正面、侧面、背面）
 * 会应用项目的视觉风格
 */
export async function generateCharacterViews(
  characterId: string,
  onProgress?: ProgressCallback
): Promise<{ front: string; side: string; back: string }> {
  const character = await getCharacter(characterId);
  if (!character) throw new Error('角色不存在');
  if (!character.appearance) throw new Error('请先生成或填写外貌特征');

  // 获取项目风格
  const project = await getProject(character.projectId);
  const styleId = project?.styleId || 'animation_anime_2d';

  // 应用风格到角色描述
  const styledAppearance = applyStyleToCharacterDescription(character.appearance, styleId);

  const basePrompt = `角色设计参考图，白色简洁背景，全身像，高质量，专业角色设计。

角色描述: ${character.name}
外貌特征: ${styledAppearance}`;

  // 应用风格提示词到基础提示
  const styledBasePrompt = applyStyleToImagePrompt(basePrompt, styleId);

  const views: { front: string; side: string; back: string } = {
    front: '',
    side: '',
    back: '',
  };

  // 生成正面图
  onProgress?.(10);
  const frontPrompt = `${styledBasePrompt}

视角: 正面视图，角色面向镜头，直视前方`;

  try {
    const frontBuffer = await generateImage(frontPrompt, styleId);
    const frontFilename = `view_front_${character.name}_${Date.now()}.png`;
    views.front = saveProjectFile(character.projectId, 'avatars', frontFilename, frontBuffer);
  } catch (error) {
    console.error('生成正面图失败:', error);
    throw new Error('生成正面图失败');
  }

  onProgress?.(40);

  // 生成侧面图
  const sidePrompt = `${styledBasePrompt}

视角: 侧面视图，角色侧身，展示侧面轮廓`;

  try {
    const sideBuffer = await generateImage(sidePrompt, styleId);
    const sideFilename = `view_side_${character.name}_${Date.now()}.png`;
    views.side = saveProjectFile(character.projectId, 'avatars', sideFilename, sideBuffer);
  } catch (error) {
    console.error('生成侧面图失败:', error);
    throw new Error('生成侧面图失败');
  }

  onProgress?.(70);

  // 生成背面图
  const backPrompt = `${styledBasePrompt}

视角: 背面视图，角色背对镜头，展示背部`;

  try {
    const backBuffer = await generateImage(backPrompt, styleId);
    const backFilename = `view_back_${character.name}_${Date.now()}.png`;
    views.back = saveProjectFile(character.projectId, 'avatars', backFilename, backBuffer);
  } catch (error) {
    console.error('生成背面图失败:', error);
    throw new Error('生成背面图失败');
  }

  onProgress?.(100);

  return views;
}

// ==================== 剧本 AI 解析（两阶段解析） ====================

/**
 * 场景定义（用于场景参考图生成）
 */
export interface SceneLocation {
  id: string;                    // 场景唯一ID，如 "scene_1"
  name: string;                  // 场景名称，如 "英子和肖扬家客厅"
  sceneInfo: string;             // 场景行，如 "英子和肖扬家 夜 内"
  location: string;              // 具体地点
  timeOfDay: string;             // 时间段
  interior: boolean;             // 是否内景
  description: string;           // 场景详细描述（用于生成场景参考图）
  props: string;                 // 场景道具和布置
  lighting: string;              // 光线描述
  atmosphere: string;            // 氛围描述
}

/**
 * 角色定义（含详细人物小传）
 */
export interface CharacterProfile {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  description: string;           // 角色性格、背景故事
  appearance: string;            // 详细外貌特征
  gender: string;
  ageGroup: string;
  estimatedAge: number | null;
  personality?: string;          // 性格特点
  background?: string;           // 背景故事
  relationships?: string;        // 与其他角色的关系
}

/**
 * 故事大纲/情节脉络
 */
export interface StoryOutline {
  theme: string;                 // 主题
  setting: string;               // 背景设定
  plotSummary: string;           // 情节摘要
  plotPoints: Array<{            // 情节点
    order: number;
    sceneId: string;
    summary: string;
    characters: string[];
  }>;
}

/**
 * 第一阶段解析结果：结构化提取
 */
export interface Phase1Result {
  textType: 'script' | 'outline' | 'mixed';  // 文本类型
  characters: CharacterProfile[];             // 角色列表（含人物小传）
  sceneLocations: SceneLocation[];           // 场景列表
  storyOutline: StoryOutline;                // 故事大纲
}

/**
 * 增强的分镜定义
 */
export interface EnhancedShot {
  sceneId: string;               // 所属场景ID
  sceneInfo: string;             // 场景信息
  location: string;              // 地点
  timeOfDay: string;             // 时间
  props: string;                 // 道具
  description: string;           // 画面描述（完整，用于AI生图）
  dialogue?: string;             // 对话内容
  character?: string;            // 说话角色
  targetCharacter?: string;      // 对话对象（对谁说）
  tone?: string;                 // 说话语气（温柔、愤怒、疑惑、调侃、严肃等）
  emotion?: string;              // 角色情绪（开心、难过、紧张、愤怒、平静等）
  action?: string;               // 动作描述
  cameraType?: string;           // 镜头类型
  mood?: string;                 // 画面氛围
  duration: number;              // 时长
}

/**
 * 第一阶段：结构化提取
 * 分析文本类型，提取角色（含人物小传）、场景、故事大纲
 */
export async function parseScriptPhase1(content: string): Promise<Phase1Result> {
  console.log(`[AI Service] 第一阶段解析开始，文本长度: ${content.length} 字符`);

  const systemPrompt = `你是一个专业的影视剧本分析师。你的任务是分析用户提供的文本，进行结构化提取。

## 重要：你需要判断文本类型

文本可能是以下三种类型之一：
1. **标准剧本（script）**：有明确的场景头（如【客厅 日 内】）、对话格式（角色名：台词）、动作指示
2. **故事梗概/大纲（outline）**：叙述性文字，可能包含人物简介、主题说明、故事梗概
3. **混合类型（mixed）**：既有剧本元素也有大纲元素

## 你需要提取以下内容

### 1. 角色分析（极其重要！）
从文本中识别所有角色，并为每个角色提供详细的人物小传：
- **name**: 角色名
- **role**: protagonist（主角）/ antagonist（反派）/ supporting（配角）
- **description**: 性格描述、剧情作用
- **appearance**: 详细外貌特征（必须包含：性别、年龄、身高体型、脸型五官、发型发色、肤色、穿着风格、特殊特征）
- **gender**: male/female
- **ageGroup**: child/teenager/young_adult/middle_aged/elderly
- **estimatedAge**: 具体年龄数字
- **personality**: 性格特点（如：孤僻、清高、善良、狡诈等）
- **background**: 背景故事（如：美术专业出身、被女友抛弃、家境贫寒等）
- **relationships**: 与其他角色的关系（如：王力的领导、领导的小舅子等）

### 2. 场景识别
识别所有独立的场景/地点，每个场景需要：
- **id**: 场景唯一ID，如 "scene_1"
- **name**: 场景名称
- **sceneInfo**: 场景行（如有）
- **location**: 具体地点
- **timeOfDay**: 时间（白天/夜晚/黄昏等）
- **interior**: 是否内景
- **description**: 详细环境描述（200-300字），用于生成场景参考图
- **props**: 场景道具
- **lighting**: 光线描述
- **atmosphere**: 氛围描述

### 3. 故事大纲
提取故事的整体结构：
- **theme**: 主题/中心思想
- **setting**: 背景设定（时代、社会环境等）
- **plotSummary**: 故事摘要（100-200字）
- **plotPoints**: 主要情节点列表

## 返回格式（严格 JSON）
{
  "textType": "script|outline|mixed",
  "characters": [
    {
      "name": "角色名",
      "role": "protagonist|antagonist|supporting",
      "description": "角色性格、剧情作用描述",
      "appearance": "详细外貌特征（200-300字）",
      "gender": "male|female",
      "ageGroup": "child|teenager|young_adult|middle_aged|elderly",
      "estimatedAge": 25,
      "personality": "性格特点",
      "background": "背景故事",
      "relationships": "与其他角色的关系"
    }
  ],
  "sceneLocations": [
    {
      "id": "scene_1",
      "name": "场景名称",
      "sceneInfo": "完整场景行",
      "location": "具体地点",
      "timeOfDay": "时间",
      "interior": true,
      "description": "详细的场景环境描述（200-300字）",
      "props": "场景道具",
      "lighting": "光线描述",
      "atmosphere": "氛围描述"
    }
  ],
  "storyOutline": {
    "theme": "故事主题",
    "setting": "背景设定",
    "plotSummary": "故事摘要",
    "plotPoints": [
      {
        "order": 1,
        "sceneId": "scene_1",
        "summary": "情节点描述",
        "characters": ["角色1", "角色2"]
      }
    ]
  }
}`;

  const prompt = `请分析以下文本，提取角色、场景和故事大纲：

${content}

请严格按照 JSON 格式返回分析结果。`;

  const response = await generateText(prompt, systemPrompt);

  // 解析 JSON
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);

      // 确保所有字段都存在
      const phase1Result: Phase1Result = {
        textType: result.textType || 'mixed',
        characters: (result.characters || []).map((char: any) => ({
          name: char.name || '',
          role: char.role || 'supporting',
          description: char.description || '',
          appearance: char.appearance || '',
          gender: char.gender || 'unknown',
          ageGroup: char.ageGroup || 'young_adult',
          estimatedAge: char.estimatedAge || null,
          personality: char.personality || '',
          background: char.background || '',
          relationships: char.relationships || '',
        })),
        sceneLocations: (result.sceneLocations || []).map((scene: any, index: number) => ({
          id: scene.id || `scene_${index + 1}`,
          name: scene.name || `场景${index + 1}`,
          sceneInfo: scene.sceneInfo || '',
          location: scene.location || '',
          timeOfDay: scene.timeOfDay || '白天',
          interior: scene.interior !== false,
          description: scene.description || '',
          props: scene.props || '',
          lighting: scene.lighting || '',
          atmosphere: scene.atmosphere || '',
        })),
        storyOutline: {
          theme: result.storyOutline?.theme || '',
          setting: result.storyOutline?.setting || '',
          plotSummary: result.storyOutline?.plotSummary || '',
          plotPoints: (result.storyOutline?.plotPoints || []).map((point: any, index: number) => ({
            order: point.order || index + 1,
            sceneId: point.sceneId || '',
            summary: point.summary || '',
            characters: point.characters || [],
          })),
        },
      };

      console.log(`[AI Service] 第一阶段解析完成: ${phase1Result.characters.length} 个角色, ${phase1Result.sceneLocations.length} 个场景`);
      return phase1Result;
    }
    throw new Error('无法解析 AI 响应');
  } catch (error) {
    console.error('第一阶段解析失败，原始响应:', response);
    throw new Error(`第一阶段解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 第二阶段：生成详细分镜
 * 基于第一阶段的角色和场景信息，生成完整的分镜列表
 */
export async function parseScriptPhase2(
  content: string,
  phase1Result: Phase1Result
): Promise<EnhancedShot[]> {
  console.log(`[AI Service] 第二阶段解析开始，基于 ${phase1Result.characters.length} 个角色和 ${phase1Result.sceneLocations.length} 个场景`);

  // 构建角色和场景上下文
  const charactersContext = phase1Result.characters.map(c =>
    `- ${c.name}（${c.role === 'protagonist' ? '主角' : c.role === 'antagonist' ? '反派' : '配角'}）: ${c.personality || c.description}`
  ).join('\n');

  const scenesContext = phase1Result.sceneLocations.map(s =>
    `- ${s.id}: ${s.name}（${s.location}，${s.timeOfDay}，${s.interior ? '内' : '外'}）`
  ).join('\n');

  const systemPrompt = `你是一个专业的分镜师。你的任务是将剧本/故事内容转换为详细的分镜列表。

## 已知信息

### 角色列表
${charactersContext}

### 场景列表
${scenesContext}

### 故事主题
${phase1Result.storyOutline.theme}

### 故事背景
${phase1Result.storyOutline.setting}

## 分镜生成规则

### 1. 完整性（最重要！）
- **你必须完整地将整个故事转换为分镜，不能遗漏任何情节！**
- 每个情节点、每段对话、每个重要动作都需要对应的分镜
- 一个长故事可能需要 50-100+ 个分镜，这是正常的

### 2. 分镜原则
- 每句对话单独成为一个分镜
- 每个重要动作单独成为一个分镜
- 场景切换时要有建立镜头
- 时长通常 3-8 秒

### 3. 画面描述要求
description 字段是给 AI 生图用的，必须包含：
- 场景环境（地点、时间、光线、道具）
- 人物（谁在画面中、姿态、表情）
- 动作（正在做什么）
- 氛围（整体感觉）

### 4. 情绪和语气
对于有对话的分镜，必须标注：
- tone（语气）: 温柔、严肃、愤怒、调侃、疑惑、惊讶、悲伤、兴奋、紧张、平静、讽刺、无奈、坚定、犹豫
- emotion（情绪）: 开心、难过、愤怒、紧张、平静、惊讶、害怕、期待、失望、满足、焦虑、困惑

### 5. 镜头类型
根据内容选择合适的镜头：
- "特写" / "close": 面部特写，表现情绪
- "中景" / "medium": 半身，展示动作
- "全景" / "wide": 全身或场景
- "远景" / "extreme_wide": 大场景

## 返回格式（严格 JSON 数组）
[
  {
    "sceneId": "scene_1",
    "sceneInfo": "场景信息",
    "location": "具体地点",
    "timeOfDay": "时间",
    "props": "道具",
    "description": "完整的画面描述，用于AI生图",
    "dialogue": "对话内容（如有）",
    "character": "说话角色（如有）",
    "targetCharacter": "对话对象（如有）",
    "tone": "语气（如有对话）",
    "emotion": "情绪",
    "action": "动作描述",
    "cameraType": "镜头类型",
    "mood": "画面氛围",
    "duration": 5
  }
]`;

  const prompt = `请将以下内容转换为详细的分镜列表。

注意：
1. 必须完整转换，不要遗漏任何情节
2. 每个分镜的 sceneId 必须使用已知场景列表中的ID
3. 如果故事很长，分镜数量可以很多（50-100+个），这是正常的

内容：
${content}

请返回 JSON 数组格式的分镜列表。`;

  const response = await generateText(prompt, systemPrompt);

  // 解析 JSON
  try {
    // 尝试匹配数组格式
    let jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // 尝试匹配对象中的 shots 数组
      const objMatch = response.match(/\{[\s\S]*\}/);
      if (objMatch) {
        const obj = JSON.parse(objMatch[0]);
        if (obj.shots) {
          jsonMatch = [JSON.stringify(obj.shots)];
        }
      }
    }

    if (jsonMatch) {
      const shots = JSON.parse(jsonMatch[0]);

      const enhancedShots: EnhancedShot[] = shots.map((shot: any) => {
        // 查找匹配的场景
        const matchingScene = phase1Result.sceneLocations.find(s =>
          s.id === shot.sceneId || s.sceneInfo === shot.sceneInfo
        );

        return {
          sceneId: shot.sceneId || matchingScene?.id || 'scene_1',
          sceneInfo: shot.sceneInfo || matchingScene?.sceneInfo || '',
          location: shot.location || matchingScene?.location || '',
          timeOfDay: shot.timeOfDay || matchingScene?.timeOfDay || '',
          props: shot.props || matchingScene?.props || '',
          description: shot.description || '',
          dialogue: shot.dialogue || undefined,
          character: shot.character || undefined,
          targetCharacter: shot.targetCharacter || undefined,
          tone: shot.tone || undefined,
          emotion: shot.emotion || undefined,
          action: shot.action || undefined,
          cameraType: shot.cameraType || '中景',
          mood: shot.mood || '平静',
          duration: shot.duration || 5,
        };
      });

      console.log(`[AI Service] 第二阶段解析完成: ${enhancedShots.length} 个分镜`);
      return enhancedShots;
    }
    throw new Error('无法解析 AI 响应');
  } catch (error) {
    console.error('第二阶段解析失败，原始响应:', response);
    throw new Error(`第二阶段解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * AI 解析剧本（增强版）
 *
 * 解析结果包含：
 * - sceneLocations: 场景列表（每个独立场景，可生成场景参考图）
 * - shots: 分镜列表（关联到场景，包含语气和情绪）
 * - characters: 角色列表
 */
export async function parseScriptWithAI(content: string): Promise<{
  sceneLocations?: SceneLocation[];
  scenes: EnhancedShot[];
  characters: Array<{
    name: string;
    role: 'protagonist' | 'antagonist' | 'supporting';
    description: string;
    appearance?: string;
    gender?: string;
    ageGroup?: string;
    estimatedAge?: number | null;
  }>;
}> {
  // Qwen-Turbo 支持超长上下文（最高100万tokens），大幅提高阈值
  // 只有超过50000字符（约2.5万汉字）的超长剧本才分批
  const MAX_CONTENT_LENGTH = 50000;
  const isLongScript = content.length > MAX_CONTENT_LENGTH;

  if (isLongScript) {
    console.log(`[AI Service] 剧本超长(${content.length}字符)，将分批处理...`);
    return await parseScriptInBatches(content, MAX_CONTENT_LENGTH);
  }

  console.log(`[AI Service] 剧本长度: ${content.length}字符，直接处理`);
  return await parseScriptSingle(content);
}

/**
 * 分批处理长剧本
 */
async function parseScriptInBatches(content: string, batchSize: number): Promise<{
  sceneLocations?: SceneLocation[];
  scenes: EnhancedShot[];
  characters: Array<{
    name: string;
    role: 'protagonist' | 'antagonist' | 'supporting';
    description: string;
    appearance?: string;
    gender?: string;
    ageGroup?: string;
    estimatedAge?: number | null;
  }>;
}> {
  // 按场景行分割剧本（通常场景行格式为：地点 时间 内/外）
  const scenePattern = /\n\s*(?=[^\n]+\s+(?:日|夜|晨|昏|白天|夜晚|黄昏|清晨|傍晚|午后|深夜)\s+(?:内|外|内\/外))/g;
  const scenes = content.split(scenePattern).filter(s => s.trim());

  // 如果无法按场景分割，则按字符数分割
  let batches: string[] = [];
  if (scenes.length <= 1) {
    // 按段落分割
    const paragraphs = content.split(/\n\s*\n/);
    let currentBatch = '';
    for (const para of paragraphs) {
      if ((currentBatch + para).length > batchSize && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = para;
      } else {
        currentBatch += (currentBatch ? '\n\n' : '') + para;
      }
    }
    if (currentBatch) batches.push(currentBatch);
  } else {
    // 按场景分割
    let currentBatch = '';
    for (const scene of scenes) {
      if ((currentBatch + scene).length > batchSize && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = scene;
      } else {
        currentBatch += (currentBatch ? '\n' : '') + scene;
      }
    }
    if (currentBatch) batches.push(currentBatch);
  }

  console.log(`[AI Service] 剧本分为 ${batches.length} 批处理`);

  // 合并结果
  const allSceneLocations: SceneLocation[] = [];
  const allShots: EnhancedShot[] = [];
  const allCharacters: Map<string, any> = new Map();

  for (let i = 0; i < batches.length; i++) {
    console.log(`[AI Service] 处理第 ${i + 1}/${batches.length} 批...`);

    try {
      const batchResult = await parseScriptSingle(batches[i], i + 1, batches.length);

      // 合并场景
      if (batchResult.sceneLocations) {
        for (const scene of batchResult.sceneLocations) {
          // 检查是否已存在相同场景
          const existing = allSceneLocations.find(s => s.sceneInfo === scene.sceneInfo);
          if (!existing) {
            scene.id = `scene_${allSceneLocations.length + 1}`;
            allSceneLocations.push(scene);
          }
        }
      }

      // 合并分镜，更新场景ID
      for (const shot of batchResult.scenes) {
        const matchingScene = allSceneLocations.find(s => s.sceneInfo === shot.sceneInfo);
        if (matchingScene) {
          shot.sceneId = matchingScene.id;
        }
        allShots.push(shot);
      }

      // 合并角色（去重）
      for (const char of batchResult.characters) {
        if (!allCharacters.has(char.name)) {
          allCharacters.set(char.name, char);
        } else {
          // 合并角色信息，保留更详细的描述
          const existing = allCharacters.get(char.name);
          if (char.appearance && (!existing.appearance || char.appearance.length > existing.appearance.length)) {
            existing.appearance = char.appearance;
          }
          if (char.description && char.description.length > (existing.description?.length || 0)) {
            existing.description = char.description;
          }
        }
      }
    } catch (error) {
      console.error(`[AI Service] 第 ${i + 1} 批处理失败:`, error);
      // 继续处理其他批次
    }
  }

  return {
    sceneLocations: allSceneLocations,
    scenes: allShots,
    characters: Array.from(allCharacters.values()),
  };
}

/**
 * 解析单个剧本片段
 */
async function parseScriptSingle(content: string, batchIndex?: number, totalBatches?: number): Promise<{
  sceneLocations?: SceneLocation[];
  scenes: EnhancedShot[];
  characters: Array<{
    name: string;
    role: 'protagonist' | 'antagonist' | 'supporting';
    description: string;
    appearance?: string;
    gender?: string;
    ageGroup?: string;
    estimatedAge?: number | null;
  }>;
}> {
  const batchInfo = batchIndex ? `（第${batchIndex}/${totalBatches}批）` : '';

  const systemPrompt = `你是一个专业的影视剧本分析师和分镜师。请仔细分析用户提供的剧本内容${batchInfo}，将其拆解为可用于视频制作的分镜。

## 重要：你必须完整分析整个剧本，不要遗漏任何内容！

## 分析要求

### 1. 场景识别与管理（极其重要！）
首先识别剧本中的所有独立场景。每个场景应该有：
- 场景行格式通常为："地点 时间 内/外"
- 同一个场景可能在剧本中多次出现
- 每个独立场景需要生成场景参考图，所以描述要详细

你需要为每个场景提供：
- id: 场景唯一标识，如 "scene_1"
- name: 场景名称，如 "英子家客厅"
- sceneInfo: 完整的场景行
- location: 具体地点
- timeOfDay: 时间（白天/夜晚/黄昏/清晨等）
- interior: 是否内景（true/false）
- description: **详细的场景环境描述**（200-300字），包括：
  * 空间布局（房间大小、格局）
  * 主要家具和摆设
  * 墙面、地板材质和颜色
  * 装饰风格（现代/古典/简约等）
  * 窗户位置和窗外景色
- props: 场景中的重要道具
- lighting: 光线描述（如"温暖的台灯光"、"明亮的日光"）
- atmosphere: 整体氛围（如"温馨家庭氛围"、"紧张压抑"）

### 2. 分镜拆分原则
- **必须完整处理所有内容，不要省略！**
- 每一句对话单独成为一个分镜
- 每个动作描述单独成为一个分镜或附加到相邻对话
- 每个分镜时长建议 3-8 秒

### 3. 动作识别
括号内的内容通常是动作指示，如：（转身看了一眼英子）、（背过身去）
这些要作为 action 字段保留

### 4. 对话分析（新增重要！）
对于每句对话，你必须分析：
- character: 说话的角色
- targetCharacter: 对谁说的（对话对象），如果是自言自语则为空
- tone: 说话的语气，从以下选择或自定义：
  * 温柔、严肃、愤怒、调侃、疑惑、惊讶、悲伤、兴奋、紧张、平静、讽刺、无奈、坚定、犹豫、撒娇、央求
- emotion: 角色当时的情绪状态：
  * 开心、难过、愤怒、紧张、平静、惊讶、害怕、期待、失望、满足、焦虑、困惑、尴尬、得意

### 5. 镜头和画面氛围
根据对话内容和动作，推断合适的：
- cameraType: 镜头类型
  - "特写" / "close": 面部特写，表现情绪
  - "中景" / "medium": 半身或大半身，展示动作
  - "全景" / "wide": 全身或场景，交代环境
  - "远景" / "extreme_wide": 大场景，建立氛围
- mood: 画面情绪氛围（如 "紧张"、"温馨"、"悲伤"、"愤怒"、"平静"）

### 6. 角色分析（极其重要！）
你必须对每个角色进行全面、准确的分析，这直接影响后续AI绘图的效果。

**必须明确的信息：**
- **性别**：必须明确是男性还是女性，不能模糊
- **年龄段**：必须准确判断
  - 儿童（3-12岁）：如果剧本是儿童剧、童话故事，角色很可能是小孩子
  - 青少年（13-17岁）
  - 青年（18-35岁）
  - 中年（36-55岁）
  - 老年（55岁以上）
- **角色定位**：主角/反派/配角

**判断年龄的线索：**
- 剧本类型：儿童剧、童话、校园剧的主角通常是相应年龄段
- 角色名字：小明、小红、宝宝等暗示是儿童；爷爷、奶奶暗示是老年
- 对话内容：说话方式、用词、称呼可以判断年龄
- 角色关系：如果提到"妈妈"、"爸爸"，则对应角色是成人，而被称呼的孩子是儿童
- 场景环境：幼儿园、小学说明是儿童；公司、办公室说明是成人

**外貌特征必须包含：**
1. 性别（男/女）
2. 具体年龄或年龄段（如"8岁的小女孩"、"35岁左右的中年男性"）
3. 身高体型（如"身材娇小"、"瘦高"、"圆润可爱"）
4. 脸型五官（如"圆脸、大眼睛、小鼻子"）
5. 发型发色（如"黑色短发"、"扎着双马尾的棕色长发"）
6. 肤色（如"白皙"、"小麦色"）
7. 穿着风格（如"穿着校服"、"穿着可爱的粉色连衣裙"）
8. 特殊特征（如"戴眼镜"、"有雀斑"、"缺了一颗门牙"）

## 返回格式（严格 JSON）
{
  "sceneLocations": [
    {
      "id": "scene_1",
      "name": "场景名称",
      "sceneInfo": "完整场景行",
      "location": "具体地点",
      "timeOfDay": "时间",
      "interior": true,
      "description": "详细的场景环境描述（200-300字），用于生成场景参考图",
      "props": "场景道具",
      "lighting": "光线描述",
      "atmosphere": "氛围描述"
    }
  ],
  "shots": [
    {
      "sceneId": "scene_1",
      "sceneInfo": "场景信息",
      "location": "具体地点",
      "timeOfDay": "时间段",
      "props": "场景道具",
      "description": "画面描述（完整的AI生图提示词，包含场景+人物+动作+表情+光线）",
      "dialogue": "对话内容（如有）",
      "character": "说话的角色名（如有）",
      "targetCharacter": "对话对象（对谁说，如有）",
      "tone": "说话语气（如有对话）",
      "emotion": "角色情绪",
      "action": "动作描述（如有）",
      "cameraType": "镜头类型",
      "mood": "画面氛围",
      "duration": 5
    }
  ],
  "characters": [
    {
      "name": "角色名",
      "role": "protagonist/antagonist/supporting",
      "description": "角色性格和特征描述",
      "gender": "male/female",
      "ageGroup": "child/teenager/young_adult/middle_aged/elderly",
      "estimatedAge": "估计的具体年龄，如 8、25、45",
      "appearance": "详细的外貌特征描述"
    }
  ]
}

## 重要提示
- **你必须完整分析整个剧本内容，不要遗漏任何对话或场景！**
- description 字段要描述这个分镜的完整画面内容，包括：
  * 场景环境（地点、时间、光线、道具）
  * 人物（谁在画面中、什么姿态、什么表情）
  * 动作（正在做什么）
  * 氛围（整体感觉）
- 不要合并多句对话，每句对话单独一个分镜
- 场景开头的环境描述也要生成一个分镜（用于建立场景）
- 同一场景的多个分镜应该关联到相同的 sceneId
- 对话必须标注语气(tone)和情绪(emotion)`;

  const prompt = `请分析以下剧本，按要求拆解为分镜。注意：必须完整分析，不要遗漏任何内容！

${content}

请严格按照 JSON 格式返回分析结果，确保包含 sceneLocations、shots、characters 三个数组。`;

  const response = await generateText(prompt, systemPrompt);

  // 解析 JSON
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);

      // 处理场景位置
      let sceneLocations: SceneLocation[] = [];
      if (result.sceneLocations && Array.isArray(result.sceneLocations)) {
        sceneLocations = result.sceneLocations.map((scene: any, index: number) => ({
          id: scene.id || `scene_${index + 1}`,
          name: scene.name || scene.location || `场景${index + 1}`,
          sceneInfo: scene.sceneInfo || '',
          location: scene.location || '',
          timeOfDay: scene.timeOfDay || '白天',
          interior: scene.interior !== false,
          description: scene.description || '',
          props: scene.props || '',
          lighting: scene.lighting || '',
          atmosphere: scene.atmosphere || '',
        }));
      }

      // 处理分镜（兼容 shots 和 scenes 字段名）
      const shotsData = result.shots || result.scenes || [];
      const scenes: EnhancedShot[] = shotsData.map((shot: any, index: number) => {
        // 查找对应的场景
        const matchingScene = sceneLocations.find(s =>
          s.sceneInfo === shot.sceneInfo || s.id === shot.sceneId
        );

        return {
          sceneId: shot.sceneId || matchingScene?.id || 'scene_1',
          sceneInfo: shot.sceneInfo || matchingScene?.sceneInfo || '',
          location: shot.location || matchingScene?.location || '',
          timeOfDay: shot.timeOfDay || matchingScene?.timeOfDay || '',
          props: shot.props || matchingScene?.props || '',
          description: shot.description || `场景 ${index + 1}`,
          dialogue: shot.dialogue || undefined,
          character: shot.character || undefined,
          targetCharacter: shot.targetCharacter || undefined,
          tone: shot.tone || undefined,
          emotion: shot.emotion || undefined,
          action: shot.action || undefined,
          cameraType: shot.cameraType || '中景',
          mood: shot.mood || '平静',
          duration: shot.duration || 5,
        };
      });

      // 处理角色
      const characters = (result.characters || []).map((char: any) => {
        let enhancedAppearance = char.appearance || '';

        const gender = char.gender === 'male' ? '男性' : char.gender === 'female' ? '女性' : '';
        const ageGroupMap: Record<string, string> = {
          'child': '儿童',
          'teenager': '青少年',
          'young_adult': '青年',
          'middle_aged': '中年',
          'elderly': '老年'
        };
        const ageGroup = ageGroupMap[char.ageGroup as string] || '';

        if (!enhancedAppearance || enhancedAppearance.length < 20) {
          const age = char.estimatedAge ? `${char.estimatedAge}岁` : ageGroup;
          enhancedAppearance = `${age}的${gender}，${enhancedAppearance}`;
        }

        return {
          name: char.name,
          role: char.role || 'supporting',
          description: char.description || '',
          appearance: enhancedAppearance.trim(),
          gender: char.gender || 'unknown',
          ageGroup: char.ageGroup || 'young_adult',
          estimatedAge: char.estimatedAge || null,
        };
      });

      return {
        sceneLocations: sceneLocations.length > 0 ? sceneLocations : undefined,
        scenes,
        characters,
      };
    }
    throw new Error('无法解析 AI 响应');
  } catch (error) {
    console.error('剧本解析失败，原始响应:', response);
    throw new Error(`剧本解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// ==================== 场景参考图生成 ====================

/**
 * 生成场景参考图
 * 根据场景描述生成场景环境图，用于保持分镜的场景一致性
 */
export async function generateSceneImage(
  projectId: string,
  sceneLocation: SceneLocation,
  styleId?: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const project = await getProject(projectId);
  const effectiveStyleId = styleId || project?.styleId || 'animation_anime_2d';

  onProgress?.(10);

  // 构建场景描述提示词
  const timeDesc = sceneLocation.timeOfDay || '白天';
  const lightingDesc = sceneLocation.lighting || (timeDesc.includes('夜') ? '温暖的室内灯光' : '明亮的自然光');
  const atmosphereDesc = sceneLocation.atmosphere || '日常氛围';

  let scenePrompt = `场景环境图，无人物，${sceneLocation.interior ? '室内' : '室外'}场景。

场景名称：${sceneLocation.name}
地点：${sceneLocation.location}
时间：${timeDesc}
光线：${lightingDesc}
氛围：${atmosphereDesc}

详细描述：${sceneLocation.description}

道具布置：${sceneLocation.props}

要求：
- 这是一个场景参考图，用于展示环境
- 画面中不要有人物
- 清晰展示场景的空间布局和主要元素
- 光线和氛围要与描述一致`;

  onProgress?.(30);

  // 应用风格
  const styledPrompt = applyStyleToImagePrompt(scenePrompt, effectiveStyleId);

  onProgress?.(50);

  // 生成图片
  const imageBuffer = await generateImage(styledPrompt, effectiveStyleId);

  onProgress?.(80);

  // 保存图片
  const filename = `scene_${sceneLocation.id}_${Date.now()}.png`;
  const imagePath = saveProjectFile(projectId, 'scenes', filename, imageBuffer);

  onProgress?.(100);

  return imagePath;
}

/**
 * 批量生成所有场景参考图
 */
export async function generateAllSceneImages(
  projectId: string,
  sceneLocations: SceneLocation[],
  styleId?: string,
  onProgress?: ProgressCallback
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const total = sceneLocations.length;

  for (let i = 0; i < total; i++) {
    const scene = sceneLocations[i];
    const progress = Math.round((i / total) * 100);
    onProgress?.(progress);

    try {
      const imagePath = await generateSceneImage(projectId, scene, styleId);
      results.set(scene.id, imagePath);
      console.log(`[AI Service] 场景 ${scene.name} 参考图生成完成: ${imagePath}`);
    } catch (error) {
      console.error(`[AI Service] 场景 ${scene.name} 参考图生成失败:`, error);
      // 继续处理其他场景
    }
  }

  onProgress?.(100);
  return results;
}

// ==================== 可用模型列表 ====================

/**
 * 获取可用的文本模型列表
 */
export function getAvailableTextModels(): Array<{ id: string; name: string; provider: string }> {
  return [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', provider: 'Google' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI' },
    { id: 'claude-sonnet-4.5-20250514', name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
    { id: 'grok-4', name: 'Grok 4', provider: 'xAI' },
    { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' },
  ];
}

/**
 * 获取可用的图像模型列表
 */
export function getAvailableImageModels(): Array<{ id: string; name: string; provider: string }> {
  return [
    { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro', provider: 'API易' },
    { id: 'gpt-image-1', name: 'GPT Image 1', provider: 'OpenAI' },
    { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'Google' },
  ];
}

/**
 * 获取可用的视频模型列表
 */
export function getAvailableVideoModels(): Array<{ id: string; name: string; provider: string; price: string }> {
  return [
    // 阿里云通义万相图生视频
    { id: 'wan2.5-i2v-preview', name: '万相2.5 (有声)', provider: 'Aliyun', price: '¥0.24/秒' },
    { id: 'wan2.2-i2v-flash', name: '万相2.2 极速', provider: 'Aliyun', price: '¥0.06/秒' },
    { id: 'wan2.2-i2v-plus', name: '万相2.2 专业', provider: 'Aliyun', price: '¥0.30/秒' },
    { id: 'wan2.1-i2v-turbo', name: '万相2.1 极速', provider: 'Aliyun', price: '¥0.04/秒' },
    { id: 'wan2.1-i2v-plus', name: '万相2.1 专业', provider: 'Aliyun', price: '¥0.20/秒' },
    // API易
    { id: 'sora_video2', name: 'Sora 2', provider: 'OpenAI', price: '$0.15/视频' },
    { id: 'sora_video2-landscape', name: 'Sora 2 横屏', provider: 'OpenAI', price: '$0.15/视频' },
    { id: 'sora_video2-15s', name: 'Sora 2 (15秒)', provider: 'OpenAI', price: '$0.22/视频' },
    { id: 'veo-3.1', name: 'VEO 3.1', provider: 'Google', price: '$0.25/视频' },
    { id: 'veo-3.1-fast', name: 'VEO 3.1 快速', provider: 'Google', price: '$0.15/视频' },
    { id: 'veo-3.1-landscape', name: 'VEO 3.1 横屏', provider: 'Google', price: '$0.25/视频' },
  ];
}

/**
 * 获取可用的图像宽高比列表
 */
export function getAvailableAspectRatios(): Array<{ id: string; name: string }> {
  return [
    { id: '1:1', name: '1:1 (正方形)' },
    { id: '3:4', name: '3:4 (竖屏)' },
    { id: '4:3', name: '4:3 (标准)' },
    { id: '9:16', name: '9:16 (手机竖屏)' },
    { id: '16:9', name: '16:9 (宽屏)' },
    { id: '2:3', name: '2:3 (竖向)' },
    { id: '3:2', name: '3:2 (横向)' },
    { id: '21:9', name: '21:9 (超宽屏)' },
    { id: '9:21', name: '9:21 (超长竖屏)' },
    { id: '4:5', name: '4:5 (Instagram)' },
  ];
}

/**
 * 获取可用的图像分辨率列表
 */
export function getAvailableImageSizes(): Array<{ id: string; name: string }> {
  return [
    { id: '1K', name: '1K (基础)' },
    { id: '2K', name: '2K (推荐)' },
    { id: '4K', name: '4K (高清)' },
  ];
}
