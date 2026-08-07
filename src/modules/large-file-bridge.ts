/**
 * 模块: 大文件上传桥接 (v6.x)
 *
 * 作用: IM 渠道对文件传输有大小上限（企微聊天 100MB / 钉钉 20MB / 飞书 30MB），
 *       用户发超限文件时渠道返回纯文本错误（如企微的 "视频/文件超过100M，无法下载"）。
 *       本模块检测该错误 + 用户主动提大文件上传的意图，
 *       通过 before_prompt_build 注入上传链接引导，并提供 enhance_upload_large_file 工具。
 *
 * 非侵入式保证:
 * - 纯 hook 观察 (before_prompt_build) + 按需工具
 * - 只在 IM 渠道激活，不影响 terminal 等其他渠道
 * - 不修改 wecom/dingtalk/feishu 插件的任何逻辑
 * - 上传端点通过 dashboard HTTP route 暴露，不新增进程
 *
 * 与 bot-share-link 的边界：
 * - bot-share-link: 把本地文件投递到 share 目录 → 生成下载 URL（agent 主动调用）
 * - large-file-bridge: 检测渠道大小错误/大文件意图 → 注入上传链接引导（自动 hook）+ 提供上传表单
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { detectChannel, isImChannel } from "../utils/channel-detect.js";
import { DEFAULT_AGENT_ID } from "../types.js";
import { resolveBaseUrl as resolveBaseUrlFromBridge } from "../utils/http-route-bridge.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";

export interface LargeFileBridgeConfig {
  enabled?: boolean;
  /**
   * 自定义上传页面 URL；不填则自动生成为 `${baseUrl}/upload`（v6.7.6 起最短 URL）。
   *
   * 历程：
   *   v6.7.4: 改 /lanhuo/upload 避免 LLM 把 /lanhuo 当上传链接误用
   *   v6.7.6: cc-media-bridge v2.18.9 已 native 支持 /upload 短 URL（_lanhuo_strip 让 /upload 直命中）
   *           用户原话："能不能换成 https://keepermac.huo15.com/upload" → 改最短 URL
   *           /lanhuo/upload 仍兼容（等价 alias）
   */
  uploadUrl?: string;
  /** 上传页面基础 URL（IM 分享场景需显式填公网地址） */
  baseUrl?: string;
  /** 检测渠道大文件错误文本（企微 100M / 钉钉 20M / 飞书 30M），默认 true。旧名 detectWecomError 仍兼容 */
  detectChannelError?: boolean;
  /** 兼容旧配置：detectWecomError === false 等价于 detectChannelError === false */
  detectWecomError?: boolean;
  /** 用户提大文件/上传相关关键词时主动提供上传链接，默认 true */
  proactiveOffer?: boolean;
}

const MAX_DEDUP_ENTRIES = 200;

/**
 * 各 IM 渠道文件大小限制（来源：渠道开放平台官方文档，2026-08 核实；钉钉为社区共识值）。
 * 上传页面链接兜底：所有渠道通用，2GB 以内浏览器拖拽。
 */
interface ChannelFileLimit {
  /** 渠道显示名 */
  label: string;
  /** 聊天内直接传输上限（MB），超过需走链接上传 */
  chatMb: number;
  /** 机器人 API 发文件上限（MB），超过需走链接上传 */
  apiMb: number;
  /** 渠道系统错误文本特征正则 */
  errorPatterns: RegExp[];
}

const CHANNEL_FILE_LIMITS: ChannelFileLimit[] = [
  {
    label: "企微",
    chatMb: 100,
    apiMb: 20,
    errorPatterns: [
      // 全部要求 100M 级数字（100 或 1xx）——企微官方文案是「超过100M」；
      // 不收紧的话钉钉 20M / 飞书 30M 的错误文本会先被企微 pattern 命中（遍历在前），渠道标签误判
      /视频.*文件.*超过.*(100|1\d{2})\s*[Mm].*无法下载|文件超过.*(100|1\d{2})\s*[Mm].*无法下载|视频超过.*(100|1\d{2})\s*[Mm].*无法下载|(100|1\d{2})\s*[Mm].*无法下载/,
    ],
  },
  {
    label: "钉钉",
    chatMb: 20,
    apiMb: 20,
    errorPatterns: [
      // 数字用 2\d（20-29MB）与企微(100/1xx)、飞书(3\d) 互斥，避免「文件超过30MB」被钉钉抢先命中误标渠道
      /文件.*超过.*2\d\s*[Mm].*(无法|失败|限制)|文件.*太大.*(无法|失败|不能|传不|发不)|文件过大.*(无法|失败|不能)|超出.*大小限制.*(无法|失败|不能)|文件发送失败.*大小/,
    ],
  },
  {
    label: "飞书",
    chatMb: 30,
    apiMb: 30,
    errorPatterns: [
      // 官方错误码 234006 原文 "The file size exceed the max value."（无数字，来源飞书开放平台 im/v1/file/create 错误码表）
      // 完整短语在正常对话中不出现，误伤可忽略；另保留带数字变体（用户转述时可能补数字）
      /file size exceed the max value/i,
      /file size exceed.*\d+.*[Mm]|exceed.*max.*size.*\d+.*[Mm]|文件.*超过.*3\d\s*[Mm].*(无法|失败|不能|exceed|too large)|文件.*(过大|超限).*\d+.*(无法|失败)/i,
    ],
  },
];

/** 通用兜底：仅失败语义（无法/失败/超限/too large/exceed），且要求 ≥10MB 数字，降低误伤正常陈述 */
const GENERIC_LARGE_FILE_ERROR =
  /(文件|视频).*(超过|超出|大于)\s*(\d{2,})\s*[Mm].*(无法|失败|超限|不能|too large|exceed)/i;

/** agentId 前缀 → 渠道显示名，用于 proactiveOffer 渠道判断 */
const AGENT_PREFIX_TO_CHANNEL: Array<{ prefix: string; label: string }> = [
  { prefix: "wecom-", label: "企微" },
  { prefix: "dingtalk-", label: "钉钉" },
  { prefix: "dingding-", label: "钉钉" },
  { prefix: "feishu-", label: "飞书" },
  { prefix: "lark-", label: "飞书" },
];

/** 由 agentId 判断是否 IM 渠道（proactiveOffer 只在 IM 渠道激活） */
function isImAgentId(agentId: string): boolean {
  return AGENT_PREFIX_TO_CHANNEL.some((c) => agentId.startsWith(c.prefix));
}

/** 由 agentId 推断渠道限制（文案用；找不到 → undefined 走通用文案） */
function channelLimitByAgentId(agentId: string): ChannelFileLimit | undefined {
  for (const c of AGENT_PREFIX_TO_CHANNEL) {
    if (agentId.startsWith(c.prefix)) {
      return CHANNEL_FILE_LIMITS.find((l) => l.label === c.label);
    }
  }
  return undefined;
}

/** 检测 prompt 里的渠道错误文本，返回命中的渠道限制（未命中返回 undefined） */
function detectChannelLimitError(promptText: string): ChannelFileLimit | undefined {
  for (const limit of CHANNEL_FILE_LIMITS) {
    for (const re of limit.errorPatterns) {
      if (re.test(promptText)) return limit;
    }
  }
  return undefined;
}

/** 用户主动提及大文件/上传的关键词 */
const LARGE_FILE_INTENT = /(大文件|超大文件|超过\s*\d{2,}\s*[Mm]|\d{3,}\s*[Mm]|发.*大文件|文件太大|怎么传.*文件|上传.*大|大文件.*怎么|send.*large.*file|upload.*large)/i;

/** 文件类型关键词（进一步确认用户在讨论文件上传） */
const FILE_UPLOAD_KEYWORDS = /(上传|upload|传文件|发文件|分享文件|share.*file|send.*file)/i;

function pickAgentId(ctx: { agentId?: string } | undefined): string {
  return (ctx?.agentId ?? DEFAULT_AGENT_ID).trim() || DEFAULT_AGENT_ID;
}

function pickSessionId(ctx: { sessionKey?: string; sessionId?: string } | undefined): string {
  return ((ctx?.sessionKey ?? ctx?.sessionId ?? "") + "").trim();
}

function buildUploadContext(
  url: string,
  token: string | null,
  limit?: ChannelFileLimit,
): string {
  const label = limit?.label ?? "IM 渠道";
  const chatMb = limit?.chatMb ?? 100;
  const errorDesc = limit
    ? `「文件/视频超过 ${chatMb}MB」是${label}官方对 bot 接收文件的硬上限拦截`
    : `这是 IM 渠道官方对文件传输的硬上限拦截`;
  const replyLine = limit
    ? `文件超过 ${chatMb}MB 无法在${label}直接传输，请通过下面这个链接上传（支持 2GB 以内，浏览器拖拽即可）：`
    : `文件超过 IM 渠道大小限制无法直接传输，请通过下面这个链接上传（支持 2GB 以内，浏览器拖拽即可）：`;
  const tokenChecklist = token
    ? `

# 本次会话已预生成 token（AI 追踪用）

**token = \`${token}\`**（已写入 ~/.openclaw/upload/manifest.json，24h 有效）

## 用户上传后的处理流程（关键！LLM 必须严格按此顺序执行）

用户上传文件后会发"传完了" / "上传好了" / "已传完" / 类似确认消息。**此时你必须**：

1. 立即调用 \`enhance_upload_check({token: "${token}"})\` 工具
2. 工具返 \`{files: [{path, size, name}, ...]}\` 数组
3. 用 Read 工具读 \`files[i].path\` 拿到文件内容
4. 按用户原始任务继续处理（如"转会议纪要" / "分析内容" / "提取信息"）

**严禁的反模式**（用户上传后你回复时不要做这些）：
❌ 再次发上传链接（用户已上传，再发链接 = 死循环！）
❌ 反问"你确定上传了吗 / 请截图" / "我没收到"（请你**先调 enhance_upload_check** 再说，绝大多数情况文件就在）
❌ 跳过 enhance_upload_check 直接 ls 或 grep \`~/.openclaw/upload/\` 全盘扫（隐私 + 性能差，token 才是精确入口）`
    : "\n\n# 本次未生成 token（兜底共享 URL，AI 不能精确追踪）";

  return `【大文件上传 — 强制规则，禁止违反】

用户上一条消息是 IM 渠道的大文件拦截提示（如「视频/文件超过100M，无法下载」）。${errorDesc}，**你不需要查任何源码、不需要问任何诊断问题、不需要解释技术原因**。

# 你的回复必须是下面这一段，一字不改：

${replyLine}

${url}

上传完成后告诉我，我来处理。
${tokenChecklist}

# 严禁的行为（违反 = 用户卡死）

${limit ? `❌ 不要 exec/grep ${label} / openclaw 源码查"limit / maxBytes / MAX_DOCUMENT_BYTES"等 — 已知是 ${label} 平台 ${chatMb}MB 上限，**结论已确定**` : "❌ 不要 exec/grep openclaw 源码查\"limit / maxBytes\"等 — 已知是 IM 平台文件大小上限，**结论已确定**"}
❌ 不要反问用户"请把完整错误消息截图发给我" / "你是哪个场景" / "需要更多信息才能定位"
❌ 不要建议用户 \`openclaw config set\` 或修改任何配置 — 用户**就是想传文件给你**，不是改配置
❌ 不要叙述性提到 "large-file-bridge 模块" / "增强包 hook" / "插件内置限制" — 用户不关心实现
❌ 不要给 \`/plugins/enhance/upload\` 这种**裸路径**（缺 https:// 前缀），用户点不开
${token ? `❌ 不要再调 enhance_upload_link 工具生成新 token — token \`${token}\` 已预备好,直接发给用户即可` : ""}

(由 enhance large-file-bridge 触发；关闭: config.largeFileBridge.enabled = false)`;
}

export function registerLargeFileBridge(
  api: OpenClawPluginApi,
  config?: LargeFileBridgeConfig,
) {
  if (config?.enabled === false) return;

  // v6.7.22: 配置项改名 detectWecomError → detectChannelError（多渠道语义），旧名仍兼容
  const detectChannelError = config?.detectChannelError !== false && config?.detectWecomError !== false;
  const proactiveOffer = config?.proactiveOffer !== false;

  // v6.7.12: 每个 session 关联一个 token，让 prompt 引导 + 兜底 hook 都给同一个 token URL
  // → AI 之后能调 enhance_upload_check({token}) 拿清单（精确追踪谁传了什么）
  // v6.7.13: 加 replyAppendUsed 标记 — 每次 inject 只兜底一次，避免后续 reply（用户说
  // "传完了" / "继续帮我处理" 等）都被 hook 强制覆盖回上传链接（用户卡死循环）
  const injectedSessions = new Map<
    string,
    { token: string; createdAt: number; replyAppendUsed: boolean }
  >();

  // v6.7.12: token 自动生成 + manifest 写入（跟 bot-upload-link 同一份 ~/.openclaw/upload/）
  // 这样 LLM 不调 enhance_upload_link 工具,我们 hook 兜底也能给 token URL,enhance_upload_check 仍能查清单
  const UPLOAD_ROOT = join(homedir(), ".openclaw", "upload");
  const MANIFEST_PATH = join(UPLOAD_ROOT, "manifest.json");
  const URL_PREFIX = "/plugins/enhance-upload";

  function createUploadToken(
    label: string | undefined,
    ownerAgent: string | undefined,
    sessionId: string | undefined,
  ): string | null {
    try {
      const token = randomBytes(6).toString("hex");  // 12 hex chars,与 bot-upload-link 一致
      const tokenDir = join(UPLOAD_ROOT, token, "files");
      mkdirSync(tokenDir, { recursive: true });

      // 读取或新建 manifest（跟 bot-upload-link 同一份,所以 enhance_upload_check 能查到）
      let manifest: { version: 1; entries: any[] } = { version: 1, entries: [] };
      if (existsSync(MANIFEST_PATH)) {
        try {
          const parsed = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
          if (parsed && Array.isArray(parsed.entries)) manifest = parsed;
        } catch { /* ignore corrupt manifest, start fresh */ }
      }

      const now = new Date();
      const expireAt = new Date(now.getTime() + 24 * 3600 * 1000);  // 24h TTL（跟 bot-upload-link 默认一致）
      manifest.entries.push({
        token,
        label,
        ownerAgent,
        // v6.7.24: 绑定当前 session 完整 sessionKey（供上传完成后会话注入 + 按 session 查询）
        sessionId,
        createdAt: now.toISOString(),
        expireAt: expireAt.toISOString(),
        files: [],
      });

      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
      return token;
    } catch (err) {
      api.logger.warn(`[enhance-large-file] createUploadToken 失败,fallback 到无 token URL: ${(err as Error).message}`);
      return null;
    }
  }

  function buildTokenUrl(baseUrl: string, token: string): string {
    return `${baseUrl.replace(/\/+$/, "")}${URL_PREFIX}/${token}`;
  }

  /**
   * v6.7.9: baseUrl 优先级（跟 bot-share-link / bot-upload-link 同款）:
   *   env BOT_BASE_URL > config.baseUrl > ~/.openclaw/share/config.json
   *   > bridge 检测到的外网 URL > internal fallback
   *
   * 修 v6.7.8- bug：默认推 `/plugins/enhance/upload` 时没拼公网域名，
   * LLM 给用户的回复变成 `👉 /plugins/enhance/upload`（没 https://...），用户根本点不开。
   */
  function readSharedBaseUrl(): string | undefined {
    try {
      const sharePath = join(homedir(), ".openclaw", "share", "config.json");
      if (!existsSync(sharePath)) return undefined;
      const j = JSON.parse(readFileSync(sharePath, "utf-8")) as { baseUrl?: string };
      return j?.baseUrl?.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  function resolveUploadUrl(): string {
    if (config?.uploadUrl?.trim()) return config.uploadUrl.trim();
    // 多源 baseUrl: env > config > shared share/config.json > bridge detected
    const base = resolveBaseUrlFromBridge({
      configBaseUrl: config?.baseUrl?.trim() || readSharedBaseUrl(),
      envName: "BOT_BASE_URL",
      fallback: "http://localhost:18789",
    });
    return `${base.replace(/\/+$/, "")}/plugins/enhance/upload`;
  }

  // v6.7.22: channel-detect 缓存写入——message_received 时记下 sessionKey→channel，
  // 让 before_prompt_build 里的 isImChannel(sessionKey) 双通道判断真正生效
  // （此前 detectChannel 无人调用，缓存恒空，isImChannel 恒 false，agentId 前缀是唯一信号）
  api.on("message_received", (event, ctx) => {
    try {
      detectChannel(event as any, pickSessionId(ctx));
    } catch {
      /* 观察性 hook，失败不影响主流程 */
    }
  });

  api.on("before_prompt_build", (_event, ctx) => {
    const agentId = pickAgentId(ctx);
    const sessionId = pickSessionId(ctx);
    const key = `${agentId}::${sessionId}`;

    const promptText = (() => {
      try {
        return String((_event as any).prompt ?? (_event as any).promptText ?? "");
      } catch {
        return "";
      }
    })();

    if (!promptText) return;

    let reason = "";
    let limit: ChannelFileLimit | undefined;

    // v6.7.10: 触发条件**不再卡 agentId**——「视频/文件超过 100M，无法下载」
    // 是企微独家错误文本，命中即必定是企微大文件场景，**不管 channel 是什么**都该引导。
    // 之前 v6.7.0 加 agentId.startsWith("wecom-") 是为了"避免 terminal 误触"，但实际
    // terminal 用户也可能粘贴这句错误文本来问 AI 怎么处理——同样应该给上传链接。
    // v6.7.22: 扩展为多渠道——企微 / 钉钉 / 飞书各自的错误文本都检测，另有通用兜底正则
    // 接住"文件超过 X MB 无法/失败"这类未收录文案。
    if (detectChannelError) {
      limit = detectChannelLimitError(promptText);
      if (limit) {
        reason = `detected-${limit.label}-large-file-error`;
      } else if (GENERIC_LARGE_FILE_ERROR.test(promptText)) {
        limit = channelLimitByAgentId(agentId); // 泛文案优先按当前 agent 渠道解释
        reason = "detected-generic-large-file-error";
      }
    }
    if (!reason && proactiveOffer) {
      const intentMatch =
        LARGE_FILE_INTENT.test(promptText) &&
        FILE_UPLOAD_KEYWORDS.test(promptText);
      // v6.7.22: IM 渠道判断双通道——agentId 前缀（历史可靠信号）∪ sessionKey 缓存
      // （channel-detect 在 message_received 时写入；terminal/未缓存则返回 "terminal" 不命中）
      const imByAgent = isImAgentId(agentId);
      const imBySession = isImChannel(sessionId);
      if (intentMatch && (imByAgent || imBySession)) {
        // 主动引导卡 IM 渠道（wecom-/dingtalk-/feishu-/lark- 前缀或已缓存渠道）——
        // 这种泛泛的「想传大文件」表达 terminal 用户其实有别的路径
        reason = "detected-large-file-intent";
        limit = channelLimitByAgentId(agentId);
      }
    }

    if (!reason) return;

    if (injectedSessions.has(key)) return;

    // v6.7.12: 自动生成 token + 拼 token URL（让 AI 通过 enhance_upload_check 能追踪）
    const baseUrl = resolveBaseUrlFromBridge({
      configBaseUrl: config?.baseUrl?.trim() || readSharedBaseUrl(),
      envName: "BOT_BASE_URL",
      fallback: "http://localhost:18789",
    });
    const token = createUploadToken(`session:${sessionId.slice(0, 12)}`, agentId, sessionId || undefined);
    const url = token
      ? buildTokenUrl(baseUrl, token)
      : resolveUploadUrl();  // token 生成失败兜底用共享 URL

    const text = buildUploadContext(url, token, limit);

    if (injectedSessions.size >= MAX_DEDUP_ENTRIES) {
      const oldest = injectedSessions.keys().next().value;
      if (oldest !== undefined) injectedSessions.delete(oldest);
    }
    injectedSessions.set(key, {
      token: token ?? "",
      createdAt: Date.now(),
      replyAppendUsed: false,
    });

    api.logger.info(
      `[enhance-large-file] ${reason} | token=${token ?? "<fallback-no-token>"} | url=${url} (agent=${agentId}, session=${sessionId.slice(0, 12)})`,
    );

    return { prependContext: text };
  });

  // before_agent_reply 第三层防御：如果 LLM 回复里没含上传链接关键词，hook 接管整个 reply，
  // 把原 body 拼上上传链接 suffix 一起作为最终回复返回。
  //
  // v6.7.4 修正：v6.7.3 用了 `{appendText: suffix}` —— 但 PluginHookBeforeAgentReplyResult 类型
  // 实际是 `{handled, reply, reason}`，`appendText` 字段不被 OpenClaw runtime 识别！v6.7.3 那个
  // hook 实际上**没起作用**（runtime 拿到 unknown field 就 silent ignore）。
  // 正确做法：return `{ handled: true, reply: { text: body + suffix } }` 接管 reply 并自己拼。
  api.on("before_agent_reply", (event, ctx) => {
    const agentId = pickAgentId(ctx);
    const sessionId = pickSessionId(ctx);
    const key = `${agentId}::${sessionId}`;

    const entry = injectedSessions.get(key);
    if (!entry) return;
    // v6.7.13: 每次 inject 兜底只 fire 一次。后续 user 消息（如"传完了" / "继续处理"）
    // LLM 应该正常调 enhance_upload_check 工具，hook 不再强行 appendText 上传链接覆盖。
    if (entry.replyAppendUsed) return;

    try {
      const body: string = (event as any)?.cleanedBody ?? (event as any)?.body ?? "";
      if (!body) return;

      // v6.7.12: 用 before_prompt_build 时记下的 token 拼 URL（前后一致）
      const baseUrl = resolveBaseUrlFromBridge({
        configBaseUrl: config?.baseUrl?.trim() || readSharedBaseUrl(),
        envName: "BOT_BASE_URL",
        fallback: "http://localhost:18789",
      });
      const url = entry.token
        ? buildTokenUrl(baseUrl, entry.token)
        : resolveUploadUrl();
      // v6.7.11: 收紧"已含上传链接"判断 — 只在含**真实可点 URL**时跳过。
      // 之前用 body.includes("upload") 太宽泛 — LLM 叙述性提到 "large-file-bridge"
      // 或 "上传相关问题" 也会误判为"已给链接"。MiniMax M2.7 等弱模型反向操作
      // (问诊断 + 自己 grep source code) 时回复里有 "upload" 字符串但**没真给 URL**，
      // 兜底 hook 不接管 = 用户什么都拿不到。
      const hasRealUrl =
        body.includes(url) ||                                       // 完整匹配本次 url
        /https?:\/\/[^\s)]+\/plugins\/enhance(-upload)?\//.test(body) ||  // 任何 enhance 上传 URL
        body.includes("enhance_upload_link") ||                     // LLM 调过工具会留下 marker
        body.includes("enhance_upload_check");
      if (hasRealUrl) {
        // LLM 已经按引导给链接（或调过工具）→ 标记本轮 inject 已完成，后续 reply 不再兜底
        entry.replyAppendUsed = true;
        return;
      }

      // 只在 final/block 类型 reply 接管（流式片段不接管）
      const kind: string = (event as any)?.kind ?? "";
      if (kind && kind !== "block" && kind !== "final") return;

      // v6.7.22: 渠道感知兜底文案（企微 100MB / 钉钉 20MB / 飞书 30MB）
      const limit = channelLimitByAgentId(agentId);
      const suffix = limit
        ? `\n\n---\n📎 **大文件上传**：文件超过 ${limit.chatMb}MB 无法在${limit.label}直接传输，请通过以下链接上传：\n👉 ${url}\n上传完成后告诉我，我来处理文件。`
        : `\n\n---\n📎 **大文件上传**：文件超过 IM 渠道大小限制无法直接传输，请通过以下链接上传：\n👉 ${url}\n上传完成后告诉我，我来处理文件。`;

      api.logger.info(
        `[enhance-large-file] before_agent_reply 强制接管 reply 拼上传链接 (agent=${agentId}, token=${entry.token || "<no-token>"})`,
      );

      // v6.7.13: 标记本轮 inject 兜底已用，后续不再 fire
      entry.replyAppendUsed = true;

      // v6.7.4: return PluginHookBeforeAgentReplyResult shape: {handled, reply, reason}
      return {
        handled: true,
        reply: { text: body + suffix },
        reason: "large-file-bridge: 强制把上传链接拼到 LLM 回复末尾",
      };
    } catch {
      return;
    }
  });

  api.registerTool(
    (ctx) => ({
      name: "enhance_upload_large_file",
      description: "获取大文件上传链接（企微 100MB / 钉钉 20MB / 飞书 30MB 渠道上限时使用）返回 uploadUrl 及使用说明",
      inputSchema: {
        type: "object",
        properties: {
          filename: {
            type: "string",
            description: "可选，建议用户使用的文件名",
          },
        },
      },
      async execute(_params: unknown) {
        const url = resolveUploadUrl();
        const agentId = pickAgentId(ctx);
        try {
          api.logger.info(
            `[enhance-large-file] tool called by agent=${agentId}`,
          );
        } catch { /* silent */ }
        // v6.7.22: 渠道感知 note——企微 20/100MB、钉钉 20MB、飞书 30MB
        const limit = channelLimitByAgentId(agentId);
        const note = limit
          ? `${limit.label} Bot 文件上传：聊天传输上限 ${limit.chatMb}MB，API 发文件上限 ${limit.apiMb}MB。超出请走此上传通道。`
          : "IM 渠道（企微/钉钉/飞书）对文件传输有大小上限。超出请走此上传通道。";
        return {
          uploadUrl: url,
          instructions:
            "用户点击链接后选择文件上传。上传完成后系统会返回分享链接。" +
            "如果辉火云 Odoo 文档引擎可用，文件会自动同步到 documents.document。" +
            "本地上传的文件也可通过 enhance_share_file 转为分享链接。",
          note,
        };
      },
    }) as any,
    { tier: "tools" } as any,
  );

  api.logger.info("[enhance] 大文件上传桥接模块已加载 (large-file-bridge)");
}
