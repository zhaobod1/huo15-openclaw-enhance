/**
 * Lazy, resilient better-sqlite3 loader with Node.js ABI fingerprinting.
 *
 * Static imports fail at module-evaluation time before any try/catch can
 * intercept them.  Dynamic import() makes the failure catchable so the
 * plugin can degrade gracefully and surface a one-command repair.
 *
 * A `.node-version` fingerprint in the OpenClaw memory directory lets us
 * detect Node.js upgrades before import() fails, so we can warn early.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type Database from "better-sqlite3";

let _Database: typeof Database | null = null;
let _resolved = false;

function nodeVersionFingerprintPath(openclawDir: string): string {
  const memoryDir = join(openclawDir, "memory");
  if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
  return join(memoryDir, ".node-version");
}

function readStoredNodeVersion(openclawDir: string): string | undefined {
  try {
    const p = nodeVersionFingerprintPath(openclawDir);
    if (!existsSync(p)) return undefined;
    const raw = readFileSync(p, "utf8").trim();
    return raw || undefined;
  } catch {
    return undefined;
  }
}

function writeNodeVersion(openclawDir: string, version: string): void {
  try {
    writeFileSync(nodeVersionFingerprintPath(openclawDir), `${version}\n`, "utf8");
  } catch {
    // non-critical
  }
}

export interface SqliteEnsureResult {
  Database: typeof Database;
  /** true when the native binding was freshly loaded (no rebuild needed). */
  ok: true;
}

export interface SqliteEnsureError {
  ok: false;
  /** Human-readable error message. */
  error: string;
  /** Shell command the user should run to repair. */
  repairCmd: string;
  /** Absolute path to the extension directory for the rebuild. */
  extDir: string;
}

/**
 * Dynamically import better-sqlite3, catching ABI mismatches so the
 * plugin can fall back gracefully instead of crashing at import time.
 *
 * On Node.js version change it prints an early-warning log through the
 * supplied logger and refreshes the fingerprint on success.
 */
export async function ensureSqlite(
  openclawDir: string,
  extDir: string,
  log: { warn: (msg: string) => void; info?: (msg: string) => void },
): Promise<SqliteEnsureResult | SqliteEnsureError> {
  // Short-circuit if already resolved this session.
  if (_Database) return { Database: _Database, ok: true };

  const currentVersion = process.version;
  const storedVersion = readStoredNodeVersion(openclawDir);

  if (storedVersion && storedVersion !== currentVersion) {
    log.warn(
      `[enhance] Node.js 版本已从 ${storedVersion} 升级到 ${currentVersion}，better-sqlite3 原生绑定需要重新编译。`,
    );
  }

  try {
    const mod = await import("better-sqlite3");
    _Database = mod.default as typeof Database;
    _resolved = true;
    writeNodeVersion(openclawDir, currentVersion);
    return { Database: _Database, ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const repairCmd = `cd ${extDir} && npm rebuild better-sqlite3`;
    log.warn(`[enhance] better-sqlite3 动态加载失败: ${msg}`);
    log.warn(`[enhance] 修复命令：${repairCmd}`);
    return {
      ok: false,
      error: msg,
      repairCmd,
      extDir,
    };
  }
}

/** Expose for external retries (for example after a manual rebuild). */
export function resetSqliteCache(): void {
  _Database = null;
  _resolved = false;
}
