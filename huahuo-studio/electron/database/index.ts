import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;
let sqlite: Database.Database | null = null;

/**
 * 获取数据库路径
 */
export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = join(userDataPath, 'data');

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  return join(dbDir, 'huahuo.db');
}

/**
 * 初始化数据库
 */
export function initDatabase(): ReturnType<typeof drizzle> {
  if (db) return db;

  const dbPath = getDatabasePath();
  console.log('Database path:', dbPath);

  sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema });

  // 创建表（如果不存在）
  createTables();

  return db;
}

/**
 * 创建数据库表
 */
function createTables() {
  if (!sqlite) return;

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      progress INTEGER NOT NULL DEFAULT 0,
      thumbnail_path TEXT,
      settings TEXT
    );

    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      content TEXT,
      parsed_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'supporting',
      description TEXT,
      appearance TEXT,
      avatar_path TEXT,
      generated_avatars TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      scene_info TEXT,
      location TEXT,
      time_of_day TEXT,
      interior INTEGER DEFAULT 1,
      description TEXT,
      props TEXT,
      lighting TEXT,
      atmosphere TEXT,
      image_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
      "index" INTEGER NOT NULL,
      description TEXT NOT NULL,
      dialogue TEXT,
      character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
      duration REAL NOT NULL DEFAULT 3,
      camera_type TEXT,
      mood TEXT,
      scene_info TEXT,
      location TEXT,
      time_of_day TEXT,
      props TEXT,
      action TEXT,
      image_path TEXT,
      video_path TEXT,
      status TEXT NOT NULL DEFAULT 'empty',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS render_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      shot_id TEXT REFERENCES shots(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_scripts_project ON scripts(project_id);
    CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
    CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
    CREATE INDEX IF NOT EXISTS idx_shots_project ON shots(project_id);
    CREATE INDEX IF NOT EXISTS idx_shots_scene ON shots(scene_id);
    CREATE INDEX IF NOT EXISTS idx_shots_index ON shots(project_id, "index");
    CREATE INDEX IF NOT EXISTS idx_render_tasks_project ON render_tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_render_tasks_status ON render_tasks(status);
  `);

  // 运行数据库迁移（添加新字段到已存在的表）
  runMigrations();

  // 输出 scenes 表结构用于调试
  const scenesColumns = sqlite.prepare("PRAGMA table_info(scenes)").all() as Array<{ name: string; type: string }>;
  console.log('[Database] scenes 表结构:', scenesColumns.map(c => `${c.name}(${c.type})`).join(', '));
}

/**
 * 运行数据库迁移
 */
function runMigrations() {
  if (!sqlite) return;

  // 检查并添加 projects 表的新字段
  const projectsColumns = sqlite.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
  const projectColumnNames = projectsColumns.map(c => c.name);

  if (!projectColumnNames.includes('style_id')) {
    try {
      sqlite.exec(`ALTER TABLE projects ADD COLUMN style_id TEXT DEFAULT 'animation_anime_2d'`);
      console.log('Migration: Added column style_id to projects table');
    } catch (error) {
      console.log('Column style_id may already exist');
    }
  }

  // 检查并添加 shots 表的新字段
  const shotsColumns = sqlite.prepare("PRAGMA table_info(shots)").all() as Array<{ name: string }>;
  const shotColumnNames = shotsColumns.map(c => c.name);

  const newShotColumns = [
    { name: 'scene_info', type: 'TEXT' },
    { name: 'location', type: 'TEXT' },
    { name: 'time_of_day', type: 'TEXT' },
    { name: 'props', type: 'TEXT' },
    { name: 'action', type: 'TEXT' },
    { name: 'scene_id', type: 'TEXT REFERENCES scenes(id) ON DELETE SET NULL' },
  ];

  for (const col of newShotColumns) {
    if (!shotColumnNames.includes(col.name)) {
      try {
        sqlite.exec(`ALTER TABLE shots ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Migration: Added column ${col.name} to shots table`);
      } catch (error) {
        console.log(`Column ${col.name} may already exist`);
      }
    }
  }

  // 创建 scenes 表索引（如果表刚创建）
  try {
    sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_shots_scene ON shots(scene_id)`);
  } catch (error) {
    // 索引可能已存在
  }

  // 检查并添加 scenes 表的新字段
  const scenesColumns = sqlite.prepare("PRAGMA table_info(scenes)").all() as Array<{ name: string }>;
  const sceneColumnNames = scenesColumns.map(c => c.name);

  const newSceneColumns = [
    { name: 'scene_info', type: 'TEXT' },
    { name: 'location', type: 'TEXT' },
    { name: 'time_of_day', type: 'TEXT' },
    { name: 'interior', type: 'INTEGER DEFAULT 1' },
    { name: 'description', type: 'TEXT' },
    { name: 'props', type: 'TEXT' },
    { name: 'lighting', type: 'TEXT' },
    { name: 'atmosphere', type: 'TEXT' },
    { name: 'image_path', type: 'TEXT' },
  ];

  for (const col of newSceneColumns) {
    if (!sceneColumnNames.includes(col.name)) {
      try {
        sqlite.exec(`ALTER TABLE scenes ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Migration: Added column ${col.name} to scenes table`);
      } catch (error) {
        console.log(`Column ${col.name} may already exist in scenes table`);
      }
    }
  }
}

/**
 * 获取数据库实例
 */
export function getDatabase(): ReturnType<typeof drizzle> {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

export { schema };
