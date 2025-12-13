import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ==================== 项目表 ====================
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  styleId: text('style_id').default('animation_anime_2d'), // 项目风格ID
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  status: text('status').notNull().default('draft'), // draft | rendering | completed
  progress: integer('progress').notNull().default(0),
  thumbnailPath: text('thumbnail_path'),
  settings: text('settings'), // JSON string for project-specific settings
});

// ==================== 剧本表 ====================
export const scripts = sqliteTable('scripts', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  content: text('content'), // 原始剧本文本
  parsedData: text('parsed_data'), // JSON: 解析后的结构化数据
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ==================== 角色表 ====================
export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role').notNull().default('supporting'), // protagonist | antagonist | supporting
  description: text('description'),
  appearance: text('appearance'), // 外貌特征描述
  avatarPath: text('avatar_path'), // 头像图片路径
  generatedAvatars: text('generated_avatars'), // JSON: 生成的多个头像路径
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ==================== 场景表 ====================
export const scenes = sqliteTable('scenes', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // 场景名称，如 "英子家客厅"
  sceneInfo: text('scene_info'), // 完整场景行，如 "英子家 夜 内"
  location: text('location'), // 具体地点
  timeOfDay: text('time_of_day'), // 时间段
  interior: integer('interior', { mode: 'boolean' }).default(true), // 是否内景
  description: text('description'), // 场景详细描述（用于生成场景参考图）
  props: text('props'), // 场景道具和布置
  lighting: text('lighting'), // 光线描述
  atmosphere: text('atmosphere'), // 氛围描述
  imagePath: text('image_path'), // 场景参考图路径
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ==================== 分镜表 ====================
export const shots = sqliteTable('shots', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sceneId: text('scene_id').references(() => scenes.id, { onDelete: 'set null' }), // 关联场景
  index: integer('index').notNull(), // 分镜序号
  description: text('description').notNull(), // 画面描述
  dialogue: text('dialogue'), // 对话/旁白
  characterId: text('character_id').references(() => characters.id, { onDelete: 'set null' }), // 向后兼容：单角色
  characterIds: text('character_ids'), // JSON数组：支持多角色，如 '["id1","id2"]'
  duration: real('duration').notNull().default(3), // 时长（秒）
  cameraType: text('camera_type'), // 镜头类型: wide | medium | close | extreme_close
  mood: text('mood'), // 情绪氛围
  sceneInfo: text('scene_info'), // 完整场景信息（地点 时间 内/外）- 保留兼容
  location: text('location'), // 地点
  timeOfDay: text('time_of_day'), // 时间（白天/夜晚/黄昏等）
  props: text('props'), // 道具描述
  action: text('action'), // 动作描述
  imagePath: text('image_path'), // 生成的图像路径
  videoPath: text('video_path'), // 生成的视频路径
  status: text('status').notNull().default('empty'), // empty | generating | ready | error
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ==================== 渲染任务表 ====================
export const renderTasks = sqliteTable('render_tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  shotId: text('shot_id').references(() => shots.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // image | video
  status: text('status').notNull().default('queued'), // queued | rendering | completed | error | paused
  progress: integer('progress').notNull().default(0),
  errorMessage: text('error_message'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
});

// ==================== 设置表 ====================
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ==================== 类型导出 ====================
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Script = typeof scripts.$inferSelect;
export type NewScript = typeof scripts.$inferInsert;

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;

export type Scene = typeof scenes.$inferSelect;
export type NewScene = typeof scenes.$inferInsert;

export type Shot = typeof shots.$inferSelect;
export type NewShot = typeof shots.$inferInsert;

export type RenderTask = typeof renderTasks.$inferSelect;
export type NewRenderTask = typeof renderTasks.$inferInsert;

export type Setting = typeof settings.$inferSelect;
