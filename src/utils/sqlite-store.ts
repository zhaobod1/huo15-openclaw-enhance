/**
 * SQLite 辅助工具 — 结构化记忆存储
 *
 * 所有表都包含 agent_id 列以支持动态 Agent 隔离。
 * 每个 WeCom 用户/群组对应一个独立的 agentId，数据完全隔离。
 */
import Database from "better-sqlite3";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import type { MemoryEntry, MemoryCategory } from "../types.js";

const SCHEMA_V2 = `
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL DEFAULT 'main',
  category TEXT NOT NULL CHECK(category IN ('user','project','feedback','reference','decision')),
  content TEXT NOT NULL,
  tags TEXT DEFAULT '',
  importance INTEGER DEFAULT 5 CHECK(importance BETWEEN 1 AND 10),
  session_id TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_agent_category ON memories(agent_id, category);
CREATE INDEX IF NOT EXISTS idx_memories_agent_created ON memories(agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS safety_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL DEFAULT 'main',
  tool TEXT NOT NULL,
  params TEXT,
  action TEXT NOT NULL,
  rule TEXT,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_safety_agent ON safety_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_safety_agent_created ON safety_log(agent_id, created_at DESC);
`;

/**
 * v1 → v2 迁移：为已有表添加 agent_id 列
 */
function migrateV1ToV2(db: Database.Database): void {
  const memoryCols = db.prepare("PRAGMA table_info(memories)").all() as Array<{ name: string }>;
  if (memoryCols.length > 0 && !memoryCols.some((c) => c.name === "agent_id")) {
    db.exec("ALTER TABLE memories ADD COLUMN agent_id TEXT NOT NULL DEFAULT 'main'");
    db.exec("CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agent_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_memories_agent_category ON memories(agent_id, category)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_memories_agent_created ON memories(agent_id, created_at DESC)");
  }

  const safetyCols = db.prepare("PRAGMA table_info(safety_log)").all() as Array<{ name: string }>;
  if (safetyCols.length > 0 && !safetyCols.some((c) => c.name === "agent_id")) {
    db.exec("ALTER TABLE safety_log ADD COLUMN agent_id TEXT NOT NULL DEFAULT 'main'");
    db.exec("CREATE INDEX IF NOT EXISTS idx_safety_agent ON safety_log(agent_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_safety_agent_created ON safety_log(agent_id, created_at DESC)");
  }
}

let _db: Database.Database | null = null;

export function getDb(openclawDir: string): Database.Database {
  if (_db) return _db;

  const memoryDir = join(openclawDir, "memory");
  if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });

  const dbPath = join(memoryDir, "enhance-memory.sqlite");
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");

  // 检测是否需要迁移 v1 表
  const tables = _db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
  if (tables.some((t) => t.name === "memories")) {
    migrateV1ToV2(_db);
  } else {
    _db.exec(SCHEMA_V2);
  }

  return _db;
}

// ── 记忆操作（全部按 agentId 隔离）──

export function storeMemory(
  db: Database.Database,
  agentId: string,
  category: MemoryCategory,
  content: string,
  tags: string = "",
  importance: number = 5,
  sessionId: string = "",
): MemoryEntry {
  const stmt = db.prepare(
    `INSERT INTO memories (agent_id, category, content, tags, importance, session_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const result = stmt.run(agentId, category, content, tags, Math.min(10, Math.max(1, importance)), sessionId);
  return db.prepare("SELECT * FROM memories WHERE id = ?").get(result.lastInsertRowid) as MemoryEntry;
}

export function searchMemories(
  db: Database.Database,
  agentId: string,
  opts: {
    category?: MemoryCategory;
    keyword?: string;
    limit?: number;
    since?: string;
  } = {},
): MemoryEntry[] {
  const conditions: string[] = ["agent_id = ?"];
  const params: unknown[] = [agentId];

  if (opts.category) {
    conditions.push("category = ?");
    params.push(opts.category);
  }
  if (opts.keyword) {
    conditions.push("(content LIKE ? OR tags LIKE ?)");
    params.push(`%${opts.keyword}%`, `%${opts.keyword}%`);
  }
  if (opts.since) {
    conditions.push("created_at >= ?");
    params.push(opts.since);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const limit = opts.limit ?? 20;

  return db
    .prepare(`SELECT * FROM memories ${where} ORDER BY importance DESC, created_at DESC LIMIT ?`)
    .all(...params, limit) as MemoryEntry[];
}

export function getRecentMemories(db: Database.Database, agentId: string, limit: number = 5): MemoryEntry[] {
  return db
    .prepare("SELECT * FROM memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(agentId, limit) as MemoryEntry[];
}

export function deleteMemory(db: Database.Database, agentId: string, id: number): boolean {
  const result = db.prepare("DELETE FROM memories WHERE id = ? AND agent_id = ?").run(id, agentId);
  return result.changes > 0;
}

export function getMemoryStats(db: Database.Database, agentId?: string): Record<string, number> {
  const query = agentId
    ? "SELECT category, COUNT(*) as count FROM memories WHERE agent_id = ? GROUP BY category"
    : "SELECT category, COUNT(*) as count FROM memories GROUP BY category";
  const rows = (agentId
    ? db.prepare(query).all(agentId)
    : db.prepare(query).all()
  ) as Array<{ category: string; count: number }>;
  const stats: Record<string, number> = { total: 0 };
  for (const row of rows) {
    stats[row.category] = row.count;
    stats.total += row.count;
  }
  return stats;
}

/** 获取所有已知的 agentId 列表 */
export function getAllAgentIds(db: Database.Database): string[] {
  const rows = db
    .prepare("SELECT DISTINCT agent_id FROM memories UNION SELECT DISTINCT agent_id FROM safety_log")
    .all() as Array<{ agent_id: string }>;
  return rows.map((r) => r.agent_id);
}

// ── 安全日志操作（全部按 agentId 隔离）──

export function logSafetyEvent(
  db: Database.Database,
  agentId: string,
  tool: string,
  params: string,
  action: string,
  rule: string = "",
  reason: string = "",
): void {
  db.prepare(
    `INSERT INTO safety_log (agent_id, tool, params, action, rule, reason) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(agentId, tool, params, action, rule, reason);
}

export function getRecentSafetyEvents(
  db: Database.Database,
  agentId?: string,
  limit: number = 20,
): Array<{ id: number; agent_id: string; tool: string; params: string; action: string; rule: string; reason: string; created_at: string }> {
  if (agentId) {
    return db
      .prepare("SELECT * FROM safety_log WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(agentId, limit) as any[];
  }
  return db
    .prepare("SELECT * FROM safety_log ORDER BY created_at DESC LIMIT ?")
    .all(limit) as any[];
}

export function getSafetyStats(
  db: Database.Database,
  agentId?: string,
): { total: number; blocked: number; logged: number } {
  const where = agentId ? "WHERE agent_id = ?" : "";
  const row = (agentId
    ? db.prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN action = 'block' THEN 1 ELSE 0 END) as blocked,
           SUM(CASE WHEN action = 'log' THEN 1 ELSE 0 END) as logged
         FROM safety_log ${where}`,
      ).get(agentId)
    : db.prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN action = 'block' THEN 1 ELSE 0 END) as blocked,
           SUM(CASE WHEN action = 'log' THEN 1 ELSE 0 END) as logged
         FROM safety_log`,
      ).get()
  ) as any;
  return { total: row.total ?? 0, blocked: row.blocked ?? 0, logged: row.logged ?? 0 };
}
