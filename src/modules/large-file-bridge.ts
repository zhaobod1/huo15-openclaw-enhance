/**
 * 模块: 大文件上传桥接 (v6.x)
 *
 * 作用: 企微有 100MB 文件传输上限，用户发 >100MB 文件时企微系统返回纯文本错误
 *       "视频/文件超过100M，无法下载"。本模块检测该错误 + 用户主动提大文件上传的意图，
 *       通过 before_prompt_build 注入上传链接引导，并提供 enhance_upload_large_file 工具。
 *
 * 非侵入式保证:
 * - 纯 hook 观察 (before_prompt_build) + 按需工具
 * - 只在 wecom 渠道激活，不影响 terminal 等其他渠道
 * - 不修改 wecom 插件的任何逻辑
 * - 上传端点通过 dashboard HTTP route 暴露，不新增进程
 *
 * 与 bot-share-link 的边界：
 * - bot-share-link: 把本地文件投递到 share 目录 → 生成下载 URL（agent 主动调用）
 * - large-file-bridge: 检测 >100MB 错误/大文件意图 → 注入上传链接引导（自动 hook）+ 提供上传表单
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { getChannel } from "../utils/channel-detect.js";
import { DEFAULT_AGENT_ID } from "../types.js";
import { resolveBaseUrl as resolveBaseUrlFromBridge } from "../utils/http-route-bridge.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

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
  /** 上传页面基础 URL（企微分享场景需显式填公网地址） */
  baseUrl?: string;
  /** 检测企微 >100M 错误文本，默认 true */
  detectWecomError?: boolean;
  /** 用户提大文件/上传相关关键词时主动提供上传链接，默认 true */
  proactiveOffer?: boolean;
}

const MAX_DEDUP_ENTRIES = 200;

/** 企微系统大文件错误提示的关键词匹配模式 */
const WECOM_LARGE_FILE_ERROR = /视频.*文件.*超过.*100.*[Mm].*无法下载|文件超过.*[Mm].*无法下载|视频超过.*[Mm].*无法下载|100.*[Mm].*无法下载/;

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

function buildUploadContext(url: string): string {
  return `【大文件上传指引 — 必读！】用户刚才发送的消息是"视频/文件超过100M，无法下载"。这是企微官方限制。

**首选：调 \`enhance_upload_link\` 工具拿 token 化 URL 给用户**（token 隔离，AI 能追踪上传了什么文件）：
1. 你调 enhance_upload_link({label: "<本次任务简述>"}) → 返回 \`${url.replace("/plugins/enhance/upload", "/plugins/enhance-upload/<token>")}\` 这种带 token 的 URL
2. 把 URL 发给用户："请通过此链接上传：<url>，传完告诉我"
3. 用户上传完说"传完了" → 你调 enhance_upload_check({token: "<token>"}) → 拉清单
4. 拿到文件路径 → Read 工具读文件分析

**备用（仅在 enhance_upload_link 不可用时）**：直接给共享 URL ${url}（无 token，AI 不知道是谁传了什么，仅适合一次性快速上传）：
"企微聊天文件上限 100MB，2GB 以内大文件都可以通过下面这个链接上传：${url}
（流式上传，浏览器拖拽即可，传完告诉我我来处理。）"

⚠️ 严格区分（v6.7.8+）：
- 共享上传 = ${url}（无 token，备用）
- token 化上传 = enhance_upload_link 工具生成，URL 含 \`/plugins/enhance-upload/<12-hex-token>\`（首选）
- /lanhuo = 蓝火任务 dashboard，**不是**上传页！不要把它当上传链接给用户！
- /upload 和 /lanhuo/upload **均不可用**！v6.7.8 已删除（OpenClaw SPA 截 root /upload；/lanhuo/upload 跟 cc-media-bridge namespace 混淆）

(由 enhance large-file-bridge 触发；关闭: config.largeFileBridge.enabled = false)`;
}

export function registerLargeFileBridge(
  api: OpenClawPluginApi,
  config?: LargeFileBridgeConfig,
) {
  if (config?.enabled === false) return;

  const detectWecomError = config?.detectWecomError !== false;
  const proactiveOffer = config?.proactiveOffer !== false;

  const injectedSessions = new Map<string, number>();

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

  api.on("before_prompt_build", (_event, ctx) => {
    const agentId = pickAgentId(ctx);
    const sessionId = pickSessionId(ctx);
    const key = `${agentId}::${sessionId}`;

    // agentId 以 "wecom-" 开头 = 企微渠道
    // ctx 中 channel/originatingChannel 字段在 before_prompt_build 时可能为空
    if (!agentId.startsWith("wecom-")) return;

    const promptText = (() => {
      try {
        return String((_event as any).prompt ?? (_event as any).promptText ?? "");
      } catch {
        return "";
      }
    })();

    if (!promptText) return;

    let reason = "";

    if (detectWecomError && WECOM_LARGE_FILE_ERROR.test(promptText)) {
      reason = "detected-wecom-large-file-error";
    } else if (proactiveOffer && LARGE_FILE_INTENT.test(promptText) && FILE_UPLOAD_KEYWORDS.test(promptText)) {
      reason = "detected-large-file-intent";
    }

    if (!reason) return;

    if (injectedSessions.has(key)) return;

    const url = resolveUploadUrl();
    const text = buildUploadContext(url);

    if (injectedSessions.size >= MAX_DEDUP_ENTRIES) {
      const oldest = injectedSessions.keys().next().value;
      if (oldest !== undefined) injectedSessions.delete(oldest);
    }
    injectedSessions.set(key, Date.now());

    api.logger.info(
      `[enhance-large-file] ${reason} (agent=${agentId}, session=${sessionId.slice(0, 12)})`,
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

    if (!injectedSessions.has(key)) return;
    if (!agentId.startsWith("wecom-")) return;

    try {
      const body: string = (event as any)?.cleanedBody ?? (event as any)?.body ?? "";
      if (!body) return;

      const url = resolveUploadUrl();
      // 已含上传相关关键词 → LLM 已经按引导给链接，不重复
      if (
        body.includes("upload") ||
        body.includes("/plugins/enhance") ||
        body.includes("/lanhuo/upload") ||
        body.includes("上传链接") ||
        body.includes("上传页面")
      ) {
        return;
      }

      // 只在 final/block 类型 reply 接管（流式片段不接管）
      const kind: string = (event as any)?.kind ?? "";
      if (kind && kind !== "block" && kind !== "final") return;

      const suffix = `\n\n---\n📎 **大文件上传**：文件超过 100MB 无法在企微直接传输，请通过以下链接上传：\n👉 ${url}\n上传完成后告诉我，我来处理文件。`;

      api.logger.info(
        `[enhance-large-file] before_agent_reply 强制接管 reply 拼上传链接 (agent=${agentId})`,
      );

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
      description: "获取大文件上传链接（企微文件上限 100MB 时使用）返回 uploadUrl 及使用说明",
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
        return {
          uploadUrl: url,
          instructions:
            "用户点击链接后选择文件上传。上传完成后系统会返回分享链接。" +
            "如果辉火云 Odoo 文档引擎可用，文件会自动同步到 documents.document。" +
            "本地上传的文件也可通过 enhance_share_file 转为分享链接。",
          note: "企微Bot API 文件上传上限为 20MB，聊天传输上限为 100MB。超出请走此上传通道。",
        };
      },
    }) as any,
    { tier: "tools" } as any,
  );

  api.logger.info("[enhance] 大文件上传桥接模块已加载 (large-file-bridge)");
}
