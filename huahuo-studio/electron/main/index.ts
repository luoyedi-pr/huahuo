import { app, BrowserWindow, ipcMain, protocol, net } from 'electron';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { createReadStream, statSync, existsSync } from 'fs';
import { initDatabase } from '../database';
import { registerIpcHandlers } from '../ipc/handlers';
import { setMainWindow } from '../services/render.service';
import { setMainWindow as setAiMainWindow } from '../services/ai.service';
import { getAllSettings } from '../services/settings.service';

// Windows 控制台 UTF-8 编码设置
if (process.platform === 'win32') {
  // 设置控制台输出编码为 UTF-8
  if (process.stdout && process.stdout.isTTY) {
    process.stdout.setDefaultEncoding('utf8');
  }
  if (process.stderr && process.stderr.isTTY) {
    process.stderr.setDefaultEncoding('utf8');
  }
}

// 环境判断
const isDev = !app.isPackaged;

// 主窗口引用
let mainWindow: BrowserWindow | null = null;

/**
 * 获取文件的 MIME 类型
 */
function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop() || '';
  const mimeTypes: Record<string, string> = {
    // 图片
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    // 视频
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    // 音频
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 注册自定义协议处理本地文件访问
 * 使用 local-file:// 协议来安全地访问本地文件
 * URL 格式: local-file:///C:/path/to/file.png (注意三个斜杠)
 *
 * 支持视频流式播放（Range 请求）
 */
function registerLocalFileProtocol() {
  protocol.handle('local-file', (request) => {
    // 解析文件路径
    // URL 格式应该是 local-file:///C:/path/file.png
    // request.url 例如: local-file:///C:/Users/xxx/file.png
    let filePath = request.url.replace('local-file://', '');
    filePath = decodeURIComponent(filePath);

    // Windows 路径处理：移除开头的斜杠（/C:/... -> C:/...）
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.slice(1);
    }

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return new Response('File not found', { status: 404 });
    }

    const mimeType = getMimeType(filePath);
    const isVideo = mimeType.startsWith('video/');

    // 视频文件需要支持 Range 请求（用于拖动进度条）
    if (isVideo) {
      try {
        const stat = statSync(filePath);
        const fileSize = stat.size;
        const rangeHeader = request.headers.get('range');

        if (rangeHeader) {
          // 解析 Range 请求头
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = end - start + 1;

          const stream = createReadStream(filePath, { start, end });
          const readable = new ReadableStream({
            start(controller) {
              stream.on('data', (chunk) => controller.enqueue(chunk));
              stream.on('end', () => controller.close());
              stream.on('error', (err) => controller.error(err));
            },
            cancel() {
              stream.destroy();
            }
          });

          return new Response(readable, {
            status: 206,
            headers: {
              'Content-Type': mimeType,
              'Content-Length': String(chunkSize),
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
            },
          });
        }

        // 没有 Range 请求，返回整个文件
        const stream = createReadStream(filePath);
        const readable = new ReadableStream({
          start(controller) {
            stream.on('data', (chunk) => controller.enqueue(chunk));
            stream.on('end', () => controller.close());
            stream.on('error', (err) => controller.error(err));
          },
          cancel() {
            stream.destroy();
          }
        });

        return new Response(readable, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(fileSize),
            'Accept-Ranges': 'bytes',
          },
        });
      } catch (error) {
        console.error('Video file read error:', error);
        return new Response('Error reading file', { status: 500 });
      }
    }

    // 非视频文件使用 net.fetch（更简单高效）
    return net.fetch(pathToFileURL(filePath).href);
  });
}

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0D1117',
    frame: false, // 无边框窗口，使用自定义标题栏
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#161B22',
      symbolColor: '#F0F6FC',
      height: 40,
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // 加载页面
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
  }

  // 窗口关闭处理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用就绪
app.whenReady().then(() => {
  // 注册自定义协议（必须在创建窗口之前）
  registerLocalFileProtocol();

  createWindow();

  if (mainWindow) {
    // 设置主窗口引用到渲染服务
    setMainWindow(mainWindow);
    // 设置主窗口引用到 AI 服务（用于发送解析进度）
    setAiMainWindow(mainWindow);
  }

  // 注册 IPC 处理器
  registerIpcHandlers();

  // 初始化数据库（延迟以避免启动时的本地模块问题）
  setTimeout(async () => {
    try {
      initDatabase();
      console.log('Database initialized successfully');

      // 加载设置以同步存储路径（getAllSettings 会自动设置 utils 中的存储路径）
      await getAllSettings();
      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // 不中断应用，允许继续运行
    }
  }, 500);

  // macOS 点击 dock 图标重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（除 macOS）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==================== IPC 处理器 ====================

// 窗口控制
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// 获取应用版本
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

// 获取应用路径
ipcMain.handle('app:path', (_, name: string) => {
  return app.getPath(name as any);
});
