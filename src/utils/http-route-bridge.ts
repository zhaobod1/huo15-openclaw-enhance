/**
 * HTTP route bridge — 跨模块共享一条 SDK 已注册的 prefix route。
 *
 * 背景：SDK 的 `registerHttpRoute` 不允许两条 prefix route 互为子前缀
 * （http-route-overlap.js 的 doPluginHttpRoutesOverlap 会拒掉），所以
 * 我们已有的 `/plugins/enhance` (prefix, by dashboard) 把整片
 * `/plugins/enhance/*` 都占了。bot-share-link 想 serve 静态文件，得
 * 让 dashboard handler 顶部先调用 `tryHandleSubRoute(req, res)`，
 * dispatch 给 bot-share 注册进来的 handler。
 *
 * 同时 bridge 干一件相关的事：当任何外部请求打到 `/plugins/enhance/*`
 * 时，自动从 `x-forwarded-host` / `host` header 抽出公网 baseUrl，
 * 缓存下来。这样 LLM 调用 `enhance_share_file` 时不用配 env，工具
 * 自己就能拼出公网 URL（前提是用户至少访问过一次仪表盘或 share 链接）。
 *
 * 红线：纯只读 + in-memory，零 child_process，零 fs 写。
 */
import type { IncomingMessage, ServerResponse } from "node:http";

export type SubRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<boolean> | boolean;

const handlers: SubRouteHandler[] = [];

/** bot-share 之类的子模块在 register 时调用，把自己的 dispatcher 加进去。 */
export function registerSubRouteHandler(handler: SubRouteHandler): void {
  handlers.push(handler);
}

/**
 * dashboard handler 顶部调用：依次问每个子 handler 是否处理本次请求；
 * 任一返回 true 即视为已处理（短路），dashboard 不再进入它的 if 链。
 */
export async function tryHandleSubRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  for (const h of handlers) {
    try {
      const ok = await h(req, res);
      if (ok) return true;
    } catch {
      // 单个 handler 抛错不应影响其它 handler，也不影响 dashboard 兜底
    }
  }
  return false;
}

// ────────── baseUrl 自动检测 ──────────

let detectedExternalBaseUrl: string | null = null;
let detectedInternalBaseUrl: string | null = null;

function isLikelyPublicHost(host: string): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0];
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "0.0.0.0") return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false; // IPv4
  if (/^\[.*\]$/.test(hostname)) return false; // bracketed IPv6
  return hostname.includes(".");
}

function pickProto(req: IncomingMessage): string {
  const fwd = req.headers["x-forwarded-proto"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0];
  // socket.encrypted only present on TLSSocket
  const encrypted = (req.socket as { encrypted?: boolean } | undefined)?.encrypted;
  return encrypted ? "https" : "http";
}

function pickHost(req: IncomingMessage): string | undefined {
  const fwd = req.headers["x-forwarded-host"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0];
  return req.headers.host;
}

/** dashboard handler 顶部调用：从请求头抽公网 baseUrl 缓存起来。 */
export function detectBaseUrlFromRequest(req: IncomingMessage): void {
  const host = pickHost(req);
  if (!host) return;
  const proto = pickProto(req);
  const baseUrl = `${proto}://${host}`.replace(/\/+$/, "");
  if (isLikelyPublicHost(host)) {
    detectedExternalBaseUrl = baseUrl;
  } else if (!detectedInternalBaseUrl) {
    detectedInternalBaseUrl = baseUrl;
  }
}

/** 工具运行时调用：拿到最佳猜测的公网 baseUrl。env > 配置 > 自动检测 > 默认 */
export function resolveBaseUrl(opts: {
  configBaseUrl?: string;
  envName?: string;
  fallback?: string;
}): string {
  const envName = opts.envName ?? "BOT_BASE_URL";
  const env = (globalThis as any).process?.env?.[envName]?.trim();
  if (env) return env.replace(/\/+$/, "");
  if (opts.configBaseUrl && opts.configBaseUrl.trim()) {
    return opts.configBaseUrl.trim().replace(/\/+$/, "");
  }
  if (detectedExternalBaseUrl) return detectedExternalBaseUrl;
  if (detectedInternalBaseUrl) return detectedInternalBaseUrl;
  return opts.fallback ?? "http://localhost:18789";
}

/** 测试/调试用 */
export function _resetBridge(): void {
  handlers.length = 0;
  detectedExternalBaseUrl = null;
  detectedInternalBaseUrl = null;
}

/** 调试用：暴露当前检测状态 */
export function getDetectionState(): {
  external: string | null;
  internal: string | null;
  handlerCount: number;
} {
  return {
    external: detectedExternalBaseUrl,
    internal: detectedInternalBaseUrl,
    handlerCount: handlers.length,
  };
}
