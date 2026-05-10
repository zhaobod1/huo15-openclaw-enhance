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

export interface LargeFileBridgeConfig {
  enabled?: boolean;
  /** 自定义上传页面 URL；不填则自动生成为 {baseUrl}/plugins/enhance/upload */
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
  return `【大文件上传指引】当前会话来自企业微信渠道。企微聊天文件传输有 100MB 上限，超过后系统会直接拒绝。
如果你或用户需要传输大文件（>100MB），**首选**调 \`enhance_upload_link\` 工具生成 token 化专属链接（24h TTL，per-token 隔离目录），把返回的 URL 发给用户即可。
用户上传完成后说"传完了"，再调 \`enhance_upload_check\`（参数 token）拉清单，路径用 Read 工具读文件分析。

兜底链接（无 token 隔离，仅在 enhance_upload_link 不可用时用）：
📎 ${url}

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

  function resolveUploadUrl(): string {
    if (config?.uploadUrl?.trim()) return config.uploadUrl.trim();
    const base = config?.baseUrl?.trim();
    if (base) return `${base.replace(/\/+$/, "")}/plugins/enhance/upload`;
    return "/plugins/enhance/upload";
  }

  api.on("before_prompt_build", (_event, ctx) => {
    const agentId = pickAgentId(ctx);
    const sessionId = pickSessionId(ctx);
    const key = `${agentId}::${sessionId}`;

    // 直接从 ctx 获取 channel，不依赖缓存
    const channel = ((ctx as any)?.channel ?? (ctx as any)?.originatingChannel ?? "").toLowerCase().trim();
    if (channel !== "wecom") return;

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
