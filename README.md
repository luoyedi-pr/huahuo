# 花火 Studio (Huahuo Studio)

> AI 短剧生产工具 - 从剧本到视频，让创意变成现实

花火 Studio 是一款基于 AI 的短剧/短视频创作工具，帮助创作者从剧本构思到视频生成的全流程自动化生产。

## 功能特性

### 剧本创作
- 支持剧本导入和编辑
- AI 智能解析剧本，自动提取场景、角色、分镜信息
- 支持多种剧本格式

### 角色管理
- 角色信息管理（姓名、性别、年龄、性格等）
- AI 生成角色形象（头像、多视角设定图）
- 角色外貌 AI 智能描述生成

### 场景管理
- 场景信息编辑（地点、时间、氛围等）
- AI 生成场景参考图
- 场景与分镜自动关联

### 分镜制作
- 自动从剧本生成分镜
- 分镜画面描述编辑
- AI 生成分镜参考图
- AI 生成分镜视频（图生视频）
- 支持批量生成

### 多种视觉风格
支持多种视觉风格，包括：
- **动画风格**: 日式2D动画、3D动画、儿童动画、粘土动画、水彩、像素、素描
- **真人风格**: 现代都市、年代剧、奇幻、科幻、纪录片
- **大师风格**: 宫崎骏、新海诚、上海美影厂、迪士尼、皮克斯、吉卜力、赛博朋克、黑色电影、韦斯·安德森

### 渲染与导出
- 渲染任务队列管理
- 支持视频导出

## 技术栈

- **前端**: React 19 + TypeScript + TailwindCSS
- **桌面框架**: Electron 33
- **数据库**: SQLite (better-sqlite3) + Drizzle ORM
- **路由**: TanStack Router
- **状态管理**: Zustand
- **UI 组件**: Radix UI + 自定义像素风格组件
- **构建工具**: Vite

## 支持的 AI 服务

### 图像生成
- 阿里云通义万相
- API易 (Gemini)

### 视频生成
- 阿里云通义万相（图生视频）
- API易 (Sora/VEO)

### 大语言模型
- OpenAI 兼容 API
- 阿里云通义千问
- Gemini

## 快速开始

### 环境要求
- Node.js >= 18
- Windows / macOS / Linux

### 安装

```bash
# 克隆项目
git clone https://github.com/luoyedi-pr/huahuo-studio.git
cd huahuo-studio

# 安装依赖
npm install

# 启动开发模式
npm run dev
```

### 构建

```bash
# 构建生产版本
npm run build
```

构建产物将输出到 `release` 目录。

## 项目结构

```
huahuo-studio/
├── electron/                 # Electron 主进程
│   ├── main/                # 主进程入口
│   ├── preload/             # 预加载脚本
│   ├── services/            # 业务服务
│   │   ├── ai.service.ts    # AI 服务（图像/视频生成）
│   │   ├── project.service.ts
│   │   ├── character.service.ts
│   │   ├── scene.service.ts
│   │   ├── shot.service.ts
│   │   ├── script.service.ts
│   │   ├── style.service.ts
│   │   ├── render.service.ts
│   │   ├── export.service.ts
│   │   └── settings.service.ts
│   ├── database/            # 数据库
│   │   ├── index.ts
│   │   └── schema.ts
│   └── ipc/                 # IPC 通信
│       └── handlers.ts
├── src/                     # 渲染进程（React）
│   ├── components/          # UI 组件
│   │   ├── ui/             # 基础 UI 组件
│   │   └── layout/         # 布局组件
│   ├── routes/             # 页面路由
│   │   ├── project/        # 项目相关页面
│   │   │   ├── overview.tsx
│   │   │   ├── script.tsx
│   │   │   ├── characters.tsx
│   │   │   ├── scenes.tsx
│   │   │   ├── storyboard.tsx
│   │   │   ├── render.tsx
│   │   │   └── export.tsx
│   │   ├── settings.tsx
│   │   └── index.tsx
│   ├── stores/             # 状态管理
│   ├── hooks/              # 自定义 Hooks
│   ├── contexts/           # React Context
│   ├── lib/                # 工具函数
│   └── styles/             # 全局样式
├── package.json
└── vite.config.ts
```

## 配置

首次启动后，进入设置页面配置 API：

1. **数据存储路径**: 设置项目文件保存位置
2. **LLM API**: 配置大语言模型 API（用于剧本解析）
3. **图像 API**: 配置图像生成 API（用于生成参考图）
4. **视频 API**: 配置视频生成 API（用于图生视频）

## 使用流程

1. **创建项目** - 新建一个短剧项目
2. **导入剧本** - 导入或编写剧本内容
3. **AI 解析** - 让 AI 自动解析剧本，提取角色、场景、分镜
4. **完善角色** - 编辑角色信息，生成角色形象
5. **完善场景** - 编辑场景信息，生成场景参考图
6. **生成分镜** - 编辑分镜描述，批量生成分镜图片
7. **生成视频** - 基于分镜图片生成视频片段
8. **导出** - 导出最终视频

## 开发

```bash
# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 开发模式（热更新）
npm run dev
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
