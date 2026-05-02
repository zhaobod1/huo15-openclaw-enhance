/**
 * 模块: Session Bridge — 跨 reset 把上次会话尾段的 user/assistant 对话拉回来当 prependContext
 *
 * 触发场景（issue #1 5/2 早晨 zhaobo 失忆事故复盘）：
 *   - 5/1 23:13:26 openclaw runtime 把 wecom:direct:zhaobo 的活跃 session 硬 reset
 *     （.jsonl 改名 .jsonl.reset.<ts>，新 session 起空白上下文）
 *   - enhance 已有的 before_reset hook 当时未触发（动作不是 reset 事件而是 hard wipe），
 *     lifecycle 抢救 = 0，session-recap 又只读 chapters/todos/decisions 这些结构化元数据
 *   - 用户次日感知到"openclaw 忘了昨天下午聊的内容"
 *
 * 本模块的策略：
 *   - 不依赖 hook 抢救（避免上面那种"reset 没发 before_reset"的盲区）
 *   - before_prompt_build 时主动扫 sessions/ 找 .jsonl.reset.* 文件
 *   - 用 chat_id (case-insensitive) 匹配同一会话伙伴 — 比 sessionKey 更鲁棒
 *     （sessionKey 大小写归一化跟原始 wecom userid 大小写偶尔不一致）
 *   - 拉末 N 条 message 拼成 prependContext 注入
 *
 * 红线：
 *   - 完全只读，不动龙虾任何状态（红线 #1）
 *   - 只读自己 + 龙虾 sessions/ 目录（红线 #2）
 *   - 不在插件代码里嵌 cli 命令（红线 #4 #5）
 *   - prependContext 只追加，绝不覆盖原 system prompt
 *   - 进程内 6h dedup 防止反复注入污染同一 session
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { resolveOpenClawHome } from "../utils/resolve-home.js";
import { DEFAULT_AGENT_ID } from "../types.js";

export interface SessionBridgeConfig {
  enabled?: boolean;
  /** prior 文件 mtime 距今需 ≥ 多少分钟才桥接（防止活跃流被自己重复注入），默认 75 */
  bridgeIdleMinutes?: number;
  /** 检索 prior session 文件的最大年龄（小时），默认 48 */
  priorMaxAgeHours?: number;
  /** 桥接的末 N 条 message，默认 8 */
  tailMessages?: number;
  /** 桥接文本字符上限（含模板），默认 4000 */
  maxChars?: number;
  /** 当前 session jsonl ≥ 多少字节就视为非 fresh、不再桥接，默认 200KB */
  freshSessionMaxBytes?: number;
  /** 调试日志 */
  debug?: boolean;
}

/** 同 (agentId,sessionId) 组合 6 小时内只桥接一次，防止重复污染同一会话上下文 */
const DEDUP_WINDOW_MS = 6 * 3600 * 1000;
const MAX_DEDUP_ENTRIES = 500;
const recentBridges = new Map<string, number>();

function shouldBridge(key: string): boolean {
  const now = Date.now();
  const last = recentBridges.get(key) ?? 0;
  if (now - last < DEDUP_WINDOW_MS) return false;
  if (recentBridges.has(key)) recentBridges.delete(key);
  while (recentBridges.size >= MAX_DEDUP_ENTRIES) {
    const oldest = recentBridges.keys().next().value;
    if (oldest === undefined) break;
    recentBridges.delete(oldest);
  }
  recentBridges.set(key, now);
  return true;
}

function pickAgentId(ctx: { agentId?: string } | undefined): string {
  return ((ctx?.agentId ?? DEFAULT_AGENT_ID) + "").trim() || DEFAULT_AGENT_ID;
}
function pickSessionKey(ctx: { sessionKey?: string } | undefined): string {
  return ((ctx?.sessionKey ?? "") + "").trim();
}
function pickSessionId(ctx: { sessionId?: string } | undefined): string {
  return ((ctx?.sessionId ?? "") + "").trim();
}

interface MessageEvent {
  role: string;
  text: string;
  timestamp?: string;
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    let out = "";
    for (const block of content) {
      if (block && typeof block === "object") {
        const b = block as { type?: unknown; text?: unknown };
        if (b.type === "text" && typeof b.text === "string") out += b.text + " ";
      }
    }
    return out.trim();
  }
  if (content && typeof content === "object") {
    const b = content as { type?: unknown; text?: unknown };
    if (b.type === "text" && typeof b.text === "string") return b.text;
  }
  return "";
}

/** 从 session jsonl 头部 64KB 内抽 chat_id（custom_message 元数据块里）。case-insensitive。 */
function readChatId(filePath: string): string | null {
  try {
    const buf = readFileSync(filePath);
    const head = buf.slice(0, Math.min(buf.length, 64 * 1024)).toString("utf-8");
    const m = head.match(/"chat_id"\s*:\s*"([^"]+)"/);
    return m?.[1] ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

interface PriorCandidate {
  filePath: string;
  sessionId: string;
  mtimeMs: number;
  matchedChatId: string;
}

function findPriorBridgeSource(
  sessionsDir: string,
  currentChatId: string,
  currentSessionId: string,
  maxAgeMs: number,
): PriorCandidate | null {
  let entries: string[];
  try {
    entries = readdirSync(sessionsDir);
  } catch {
    return null;
  }

  type Cand = { path: string; sessionId: string; mtime: number };
  const cands: Cand[] = [];
  const now = Date.now();
  for (const e of entries) {
    if (!e.includes(".jsonl.reset.")) continue;
    const sessionId = e.split(".")[0];
    if (!sessionId || sessionId === currentSessionId) continue;
    const filePath = join(sessionsDir, e);
    let mtime = 0;
    try {
      mtime = statSync(filePath).mtimeMs;
    } catch {
      continue;
    }
    if (now - mtime > maxAgeMs) continue;
    cands.push({ path: filePath, sessionId, mtime });
  }
  cands.sort((a, b) => b.mtime - a.mtime);

  for (const c of cands) {
    const chatId = readChatId(c.path);
    if (!chatId) continue;
    if (chatId === currentChatId) {
      return {
        filePath: c.path,
        sessionId: c.sessionId,
        mtimeMs: c.mtime,
        matchedChatId: chatId,
      };
    }
  }
  return null;
}

function readLastMessages(
  filePath: string,
  count: number,
  perMsgCharCap: number,
): MessageEvent[] {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }
  const lines = raw.split("\n");
  const out: MessageEvent[] = [];
  for (let i = lines.length - 1; i >= 0 && out.length < count; i--) {
    const line = lines[i];
    if (!line) continue;
    let d: any;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d?.type !== "message") continue;
    const role = typeof d?.message?.role === "string" ? d.message.role : "?";
    const text = extractText(d?.message?.content).trim();
    if (!text) continue;
    const timestamp = typeof d?.timestamp === "string" ? d.timestamp : undefined;
    out.unshift({
      role,
      text: text.replace(/\s+/g, " ").slice(0, perMsgCharCap),
      timestamp,
    });
  }
  return out;
}

function fmtAge(ms: number): string {
  const h = ms / 3600 / 1000;
  if (h < 24) return `${h.toFixed(1)} 小时前`;
  return `${(h / 24).toFixed(1)} 天前`;
}

function fmtTimestamp(ts?: string): string {
  if (!ts) return "";
  return ts.slice(0, 19).replace("T", " ");
}

function buildBridgeText(
  prior: PriorCandidate,
  msgs: MessageEvent[],
  totalCharCap: number,
): string {
  if (msgs.length === 0) return "";
  const ageStr = fmtAge(Date.now() - prior.mtimeMs);
  const lines: string[] = [
    `【会话桥接 — 上次会话末尾（${ageStr}，共 ${msgs.length} 条 message）】`,
    `（当前 session 因 reset/compact 与上下文断开，自动从 .jsonl.reset.${prior.sessionId.slice(0, 8)}… 拉回最后几轮原始对话）`,
    "",
  ];
  let acc = lines.join("\n").length;
  for (const m of msgs) {
    const head = `· [${m.role}${m.timestamp ? `@${fmtTimestamp(m.timestamp)}` : ""}]`;
    const piece = `${head} ${m.text}`;
    if (acc + piece.length + 1 > totalCharCap) {
      lines.push("…(后续被字数上限截断；用 enhance_transcript_search 检索完整内容)");
      break;
    }
    lines.push(piece);
    acc += piece.length + 1;
  }
  lines.push("");
  lines.push(
    "(@huo15/openclaw-enhance session-bridge 自动注入；可在 enhance.sessionBridge.enabled=false 关闭)",
  );
  return lines.join("\n");
}

export function registerSessionBridge(
  api: OpenClawPluginApi,
  config?: SessionBridgeConfig,
) {
  if (config?.enabled === false) return;

  const home = resolveOpenClawHome(api);
  const idleMinutes = config?.bridgeIdleMinutes ?? 75;
  const priorMaxAgeMs = (config?.priorMaxAgeHours ?? 48) * 3600_000;
  const tailN = config?.tailMessages ?? 8;
  const maxChars = config?.maxChars ?? 4000;
  const freshMaxBytes = config?.freshSessionMaxBytes ?? 200 * 1024;
  const debug = config?.debug === true;
  const perMsgCap = Math.max(120, Math.floor(maxChars / Math.max(1, tailN)));

  api.on("before_prompt_build", (_event: unknown, ctx: any) => {
    try {
      const agentId = pickAgentId(ctx);
      const sessionKey = pickSessionKey(ctx);
      const sessionId = pickSessionId(ctx);
      if (!sessionKey || !sessionId) return undefined;

      const dedupKey = `${agentId}::${sessionId}`;
      // 不立刻 mark — 只有真正注入了内容才 mark（早返回不消耗冷却）
      const cooldownActive = (() => {
        const last = recentBridges.get(dedupKey) ?? 0;
        return Date.now() - last < DEDUP_WINDOW_MS;
      })();
      if (cooldownActive) return undefined;

      const sessionsDir = join(home, "agents", agentId, "sessions");

      // 仅对"fresh session"桥接：当前 jsonl 体量低（说明刚起没几轮）
      const currentJsonl = join(sessionsDir, `${sessionId}.jsonl`);
      let currentSize = 0;
      try {
        currentSize = statSync(currentJsonl).size;
      } catch {
        return undefined; // 当前 session 文件还没建 — 太早了
      }
      if (currentSize > freshMaxBytes) return undefined;

      // 抽当前 chat_id（如果不是 wecom 渠道，没有 chat_id 就放行不桥接）
      const currentChatId = readChatId(currentJsonl);
      if (!currentChatId) return undefined;

      const prior = findPriorBridgeSource(sessionsDir, currentChatId, sessionId, priorMaxAgeMs);
      if (!prior) return undefined;

      // idle 阈值：prior 文件 mtime 距今足够久（避免活跃同步流被自己注入）
      const idleMs = Date.now() - prior.mtimeMs;
      if (idleMs < idleMinutes * 60_000) return undefined;

      const msgs = readLastMessages(prior.filePath, tailN, perMsgCap);
      if (msgs.length === 0) return undefined;

      const text = buildBridgeText(prior, msgs, maxChars);
      if (!text) return undefined;

      shouldBridge(dedupKey); // 真正注入后才 mark 冷却
      if (debug) {
        api.logger.info(
          `[enhance-session-bridge] 桥接 prior=${prior.sessionId.slice(0, 8)}…(${msgs.length} msg, ${text.length} 字符), idle=${(idleMs / 60000).toFixed(0)}min, sessionKey=${sessionKey}`,
        );
      }
      return { prependContext: text };
    } catch (err) {
      api.logger.error(`[enhance-session-bridge] 错误: ${(err as Error).message}`);
      return undefined;
    }
  });

  api.logger.info(
    `[enhance] session-bridge 已加载（fresh<${(freshMaxBytes / 1024).toFixed(0)}KB & idle≥${idleMinutes}min & prior≤${(priorMaxAgeMs / 3600_000).toFixed(0)}h → tail ${tailN}msg/${maxChars}字 注入 prependContext）`,
  );
}
