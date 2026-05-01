/**
 * 模块: BOT 文件分享桥（enhance_share_file / list / revoke）
 *
 * 解决场景：企微/钉钉等 IM 渠道无法直传大文件（>20MB / >50MB），需要给用户一个
 * 临时下载链接。比如本地播客生成 90MB mp3 → 企微发不出去 → 拿这个工具生成一个
 * `https://<dashboard 域名>/plugins/enhance/share/<token>-podcast.mp3` 发给用户即可。
 *
 * 工作机制（v5.7.23 起 zero-config）：
 *   - 复用 dashboard 已经在运行的 `/plugins/enhance` HTTP route（SDK 不允许两条
 *     prefix route 互为子前缀，所以走 bridge dispatch）。
 *   - dashboard handler 顶部 detectBaseUrlFromRequest(req)：用户访问任何
 *     `/plugins/enhance/*` 一次，bridge 就从 `x-forwarded-host` / `host` 抽出
 *     公网 baseUrl 缓存住——不用配 env，不用 nginx alias。
 *   - LLM 调 enhance_share_file(filePath) 时，把文件 copy/link 到
 *     `<shareRoot>/files/<token>-<basename>`，URL 拼为
 *     `${detectedBaseUrl}/plugins/enhance/share/<token>-<basename>`。
 *   - 公网请求打到 dashboard 的 prefix route，dashboard 顶部调用
 *     tryHandleSubRoute() 让 bot-share 自己的 handler 流式吐文件。
 *
 * 配置优先级（baseUrl）：env BOT_BASE_URL > pluginConfig.botShare.baseUrl
 *   > 自动检测到的公网 host > http://localhost:18789（fallback）
 *
 * 红线一致：
 *   - 零 child_process（fs.copyFileSync / linkSync / createReadStream）
 *   - 不擅自改用户配置（写的是插件自己的 share 目录）
 *   - LLM 输入过 sanitizer：绝对路径校验 + path traversal + 敏感目录黑名单
 *   - HTTP handler 防越界（filename 不能含 / 和 ..，必须 manifest 命中）
 *   - 单文件大小上限（默认 500MB）防止误传系统盘
 */
import { Type } from "@sinclair/typebox";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, isAbsolute, join, normalize, resolve as pathResolve } from "node:path";
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";
import { resolveOpenClawHome } from "../utils/resolve-home.js";
import {
  registerSubRouteHandler,
  resolveBaseUrl as resolveBaseUrlFromBridge,
} from "../utils/http-route-bridge.js";
import type { BotShareConfig } from "../types.js";

const DEFAULT_BASE_URL_FALLBACK = "http://localhost:18789";
const DEFAULT_URL_PREFIX = "/plugins/enhance/share";
const DEFAULT_EXPIRE_HOURS = 24;
const DEFAULT_MAX_FILE_MB = 500;

const SENSITIVE_DIR_TOKENS = [
  "/.ssh/",
  "/.gnupg/",
  "/.aws/",
  "/.config/",
  "/.docker/",
  "/.kube/",
  "/.npmrc",
  "/.netrc",
  "/etc/",
];

interface ShareEntry {
  token: string;
  filename: string;
  sourcePath: string;
  sizeBytes: number;
  label?: string;
  createdAt: string;
  expireAt: string;
}

interface Manifest {
  version: 1;
  entries: ShareEntry[];
}

function resolveShareRoot(api: OpenClawPluginApi, config: BotShareConfig | undefined): string {
  if (config?.shareRoot && config.shareRoot.trim()) return config.shareRoot.trim();
  return join(resolveOpenClawHome(api), "share");
}

function resolveUrlPrefix(config: BotShareConfig | undefined): string {
  const raw = (config?.urlPrefix ?? DEFAULT_URL_PREFIX).trim();
  if (!raw) return DEFAULT_URL_PREFIX;
  return "/" + raw.replace(/^\/+/, "").replace(/\/+$/, "");
}

function safeReadManifest(path: string): Manifest {
  if (!existsSync(path)) return { version: 1, entries: [] };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as Manifest;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries)) {
      return { version: 1, entries: [] };
    }
    return parsed;
  } catch {
    return { version: 1, entries: [] };
  }
}

function safeWriteManifest(path: string, manifest: Manifest): void {
  writeFileSync(path, JSON.stringify(manifest, null, 2), "utf-8");
}

function pruneExpired(
  filesDir: string,
  manifest: Manifest,
  now: Date,
): { pruned: number; pendingMissing: number } {
  const fresh: ShareEntry[] = [];
  let pruned = 0;
  let pendingMissing = 0;
  for (const e of manifest.entries) {
    const localPath = join(filesDir, e.filename);
    const expired = new Date(e.expireAt).getTime() <= now.getTime();
    if (expired) {
      if (existsSync(localPath)) {
        try {
          rmSync(localPath, { force: true });
        } catch {
          // ignore
        }
      }
      pruned++;
      continue;
    }
    if (!existsSync(localPath)) pendingMissing++;
    fresh.push(e);
  }
  manifest.entries = fresh;
  return { pruned, pendingMissing };
}

function sanitizeBaseName(name: string): string {
  const cleaned = name
    .replace(/[\/\\\x00-\x1F<>:"|?*]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100);
  return cleaned || "file";
}

function isSensitivePath(absPath: string): boolean {
  const tail = absPath.endsWith("/") ? absPath : absPath + "/";
  return SENSITIVE_DIR_TOKENS.some((t) => tail.includes(t));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

function errorResponse(msg: string) {
  return { content: [{ type: "text" as const, text: `✗ ${msg}` }] };
}

function resolveBaseUrl(config: BotShareConfig | undefined): string {
  return resolveBaseUrlFromBridge({
    configBaseUrl: config?.baseUrl,
    fallback: DEFAULT_BASE_URL_FALLBACK,
  });
}

function buildShareUrl(
  baseUrl: string,
  urlPrefix: string,
  filename: string,
): string {
  return `${baseUrl}${urlPrefix}/${encodeURIComponent(filename)}`;
}

/** 把原始文件名（去掉 token 前缀）抽出来，用于 Content-Disposition。 */
function deriveFriendlyName(finalName: string): string {
  const dash = finalName.indexOf("-");
  return dash > 0 ? finalName.slice(dash + 1) : finalName;
}

export function registerBotShareLink(
  api: OpenClawPluginApi,
  config: BotShareConfig | undefined,
) {
  const shareRoot = resolveShareRoot(api, config);
  const filesDir = join(shareRoot, "files");
  const manifestPath = join(shareRoot, "manifest.json");
  const expireHours = config?.expireHours ?? DEFAULT_EXPIRE_HOURS;
  const maxFileMB = config?.maxFileSizeMB ?? DEFAULT_MAX_FILE_MB;
  const urlPrefix = resolveUrlPrefix(config);

  try {
    mkdirSync(filesDir, { recursive: true });
  } catch (err) {
    api.logger.error(
      `[enhance-bot-share] 创建 share 目录失败 ${filesDir}：${(err as Error).message}`,
    );
  }

  // ── 注册 HTTP sub-route handler 到 bridge（dashboard handler 顶部会 dispatch） ──
  registerSubRouteHandler(async (req: IncomingMessage, res: ServerResponse) => {
    const rawUrl = req.url ?? "/";
    let pathname: string;
    try {
      pathname = new URL(rawUrl, `http://${req.headers.host || "localhost"}`).pathname;
    } catch {
      return false;
    }
    if (pathname !== urlPrefix && !pathname.startsWith(urlPrefix + "/")) return false;

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end("Method Not Allowed");
      return true;
    }

    // 提取 filename（必须在 prefix 之后，且不能含 / 和 ..）
    if (pathname === urlPrefix || pathname === urlPrefix + "/") {
      res.writeHead(404);
      res.end("Not Found");
      return true;
    }
    let filename: string;
    try {
      filename = decodeURIComponent(pathname.slice(urlPrefix.length + 1));
    } catch {
      res.writeHead(400);
      res.end("Bad Request");
      return true;
    }
    if (!filename || filename.includes("/") || filename.includes("..") || filename.includes("\\")) {
      res.writeHead(400);
      res.end("Bad Request");
      return true;
    }

    const manifest = safeReadManifest(manifestPath);
    const entry = manifest.entries.find((e) => e.filename === filename);
    if (!entry) {
      res.writeHead(404);
      res.end("Not Found");
      return true;
    }
    if (new Date(entry.expireAt).getTime() <= Date.now()) {
      res.writeHead(410);
      res.end("Gone (link expired)");
      return true;
    }

    const localPath = pathResolve(join(filesDir, filename));
    if (!localPath.startsWith(pathResolve(filesDir) + "/") || !existsSync(localPath)) {
      res.writeHead(404);
      res.end("Not Found (file missing)");
      return true;
    }
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(localPath);
    } catch {
      res.writeHead(404);
      res.end("Not Found");
      return true;
    }

    const friendlyName = deriveFriendlyName(filename);
    // RFC 5987 双声明，兼容老浏览器 + UTF-8 文件名
    const safeAscii = friendlyName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "_");
    const contentDisposition =
      `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(friendlyName)}`;

    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Length": st.size,
      "Content-Disposition": contentDisposition,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") {
      res.end();
      return true;
    }

    await new Promise<void>((done) => {
      const stream = createReadStream(localPath);
      let finished = false;
      const finish = () => {
        if (!finished) {
          finished = true;
          done();
        }
      };
      stream.on("error", (err) => {
        api.logger.warn(
          `[enhance-bot-share] stream error on ${localPath}: ${(err as Error).message}`,
        );
        try {
          if (!res.headersSent) res.writeHead(500);
          res.end();
        } catch {
          // ignore
        }
        finish();
      });
      stream.on("end", finish);
      res.on("close", () => {
        stream.destroy();
        finish();
      });
      stream.pipe(res);
    });
    return true;
  });

  api.logger.info(
    `[enhance] BOT 文件分享模块已加载（root=${shareRoot}，prefix=${urlPrefix}，默认 ${expireHours}h 过期，上限 ${maxFileMB}MB；URL 通过 dashboard route + bridge 自动路由，无需 nginx alias / env）`,
  );

  api.registerTool(
    ((_ctx: OpenClawPluginToolContext) => ({
      name: "enhance_share_file",
      description:
        "把本地大文件投递到 OpenClaw share 目录，返回对外的临时下载链接。" +
        "用于企微/钉钉等无法直传大文件（>20-50MB）的场景：传一个绝对路径，返回 https://<dashboard 公网域名>/plugins/enhance/share/<token>-<filename> 给用户下载。" +
        "v5.7.23 起 zero-config：用户访问过一次 dashboard 后，公网 baseUrl 自动从 host header 检测，不需要配 env 或 nginx alias。文件 24h 后下次工具调用时自动 lazy 清理。",
      parameters: Type.Object({
        filePath: Type.String({
          description:
            "本地文件绝对路径（必须存在；不允许敏感目录如 ~/.ssh / .aws / .gnupg / /etc 下的文件）",
        }),
        label: Type.Optional(
          Type.String({ description: "可选展示名（仅记录用，不影响 URL）" }),
        ),
        expireHours: Type.Optional(
          Type.Number({
            description: `链接有效小时数，默认 ${DEFAULT_EXPIRE_HOURS}，最长 720 (30天)`,
            minimum: 1,
            maximum: 24 * 30,
          }),
        ),
        copyMode: Type.Optional(
          Type.Union([Type.Literal("copy"), Type.Literal("link")], {
            description: "copy=复制（默认，跨分区可用）/ link=硬链接（同分区零拷贝，失败自动降级 copy）",
          }),
        ),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const filePath = String(params.filePath ?? "").trim();
        const label = String(params.label ?? "").trim() || undefined;
        const ttlH =
          typeof params.expireHours === "number" && Number.isFinite(params.expireHours)
            ? Math.min(Math.max(Number(params.expireHours), 1), 24 * 30)
            : expireHours;
        const copyMode = (params.copyMode as "copy" | "link" | undefined) ?? "copy";

        if (!filePath) return errorResponse("filePath 必填且需为绝对路径。");
        if (!isAbsolute(filePath)) {
          return errorResponse(`filePath 必须是绝对路径，收到：${filePath}`);
        }
        const normalized = normalize(filePath);
        if (normalized.split("/").includes("..")) {
          return errorResponse("filePath 不能含 .. 段。");
        }
        if (isSensitivePath(normalized)) {
          return errorResponse(
            `拒绝分享敏感目录文件（黑名单 token：${SENSITIVE_DIR_TOKENS.join("、")}）。`,
          );
        }
        if (!existsSync(normalized)) {
          return errorResponse(`文件不存在：${normalized}`);
        }
        let st: ReturnType<typeof statSync>;
        try {
          st = statSync(normalized);
        } catch (err) {
          return errorResponse(`stat 失败：${(err as Error).message}`);
        }
        if (!st.isFile()) {
          return errorResponse(`只能分享普通文件，${normalized} 不是 file。`);
        }
        const sizeMB = st.size / 1024 / 1024;
        if (sizeMB > maxFileMB) {
          return errorResponse(
            `文件 ${formatSize(st.size)} 超过上限 ${maxFileMB}MB（可在 enhance.botShare.maxFileSizeMB 调整）。`,
          );
        }

        const manifest = safeReadManifest(manifestPath);
        const now = new Date();
        const { pruned } = pruneExpired(filesDir, manifest, now);

        const token = randomBytes(6).toString("hex");
        const sanitized = sanitizeBaseName(basename(normalized));
        const finalName = `${token}-${sanitized}`;
        const destPath = pathResolve(join(filesDir, finalName));
        if (!destPath.startsWith(pathResolve(filesDir) + "/")) {
          return errorResponse("内部错误：dest 越出 share 目录。");
        }

        try {
          if (copyMode === "link") {
            try {
              linkSync(normalized, destPath);
            } catch (err) {
              api.logger.warn(
                `[enhance-bot-share] hardlink 失败降级 copy：${(err as Error).message}`,
              );
              copyFileSync(normalized, destPath);
            }
          } else {
            copyFileSync(normalized, destPath);
          }
        } catch (err) {
          return errorResponse(`投递失败：${(err as Error).message}`);
        }

        const expireAt = new Date(now.getTime() + ttlH * 3600 * 1000);
        manifest.entries.push({
          token,
          filename: finalName,
          sourcePath: normalized,
          sizeBytes: st.size,
          label,
          createdAt: now.toISOString(),
          expireAt: expireAt.toISOString(),
        });
        try {
          safeWriteManifest(manifestPath, manifest);
        } catch (err) {
          api.logger.warn(
            `[enhance-bot-share] manifest 写入失败：${(err as Error).message}`,
          );
        }

        const baseUrl = resolveBaseUrl(config);
        const url = buildShareUrl(baseUrl, urlPrefix, finalName);
        const detected = baseUrl !== DEFAULT_BASE_URL_FALLBACK;
        const lines = [
          `✓ 已生成临时下载链接（${formatSize(st.size)}，${ttlH}h 后过期）：`,
          ``,
          url,
          ``,
          label ? `展示名：${label}` : "",
          `源文件：${normalized}`,
          `落盘：${destPath}`,
          `过期：${expireAt.toISOString()}`,
          pruned > 0 ? `（顺手清理了 ${pruned} 个过期文件）` : "",
          ``,
          detected
            ? `baseUrl=${baseUrl}（来自 env/config/dashboard 自动检测）`
            : `⚠ baseUrl 仍是默认 ${baseUrl}——请先在浏览器访问一次你的 dashboard 公网地址（任何 /plugins/enhance/* 都行），让 enhance 自动捕获 host；或显式 export BOT_BASE_URL / 在 botShare.baseUrl 配置`,
        ]
          .filter(Boolean)
          .join("\n");

        return {
          content: [{ type: "text" as const, text: lines }],
          structuredContent: {
            url,
            token,
            filename: finalName,
            sourcePath: normalized,
            sizeBytes: st.size,
            sizeFormatted: formatSize(st.size),
            label,
            expireAt: expireAt.toISOString(),
            baseUrl,
            baseUrlDetected: detected,
            urlPrefix,
            shareRoot,
            prunedExpired: pruned,
          },
        };
      },
    })) as any,
    { name: "enhance_share_file" },
  );

  api.registerTool(
    ((_ctx: OpenClawPluginToolContext) => ({
      name: "enhance_share_list",
      description: "列出当前活跃的 BOT 分享链接（自动顺手清理过期文件）",
      parameters: Type.Object({}),
      async execute() {
        const manifest = safeReadManifest(manifestPath);
        const now = new Date();
        const { pruned, pendingMissing } = pruneExpired(filesDir, manifest, now);
        try {
          safeWriteManifest(manifestPath, manifest);
        } catch {
          // 不致命
        }

        const baseUrl = resolveBaseUrl(config);
        if (manifest.entries.length === 0) {
          const head = pruned > 0 ? `（清理了 ${pruned} 个过期文件）\n` : "";
          return {
            content: [
              {
                type: "text" as const,
                text: `${head}暂无活跃分享。基址：${baseUrl}${urlPrefix} → ${filesDir}/`,
              },
            ],
            structuredContent: {
              entries: [],
              pruned,
              pendingMissing,
              baseUrl,
              urlPrefix,
              shareRoot,
            },
          };
        }

        const sorted = [...manifest.entries].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const lines: string[] = [
          `当前 ${manifest.entries.length} 个活跃分享${pruned > 0 ? `（${pruned} 个刚被清理）` : ""}：`,
          ``,
        ];
        for (const e of sorted) {
          const url = buildShareUrl(baseUrl, urlPrefix, e.filename);
          const remainH = (
            (new Date(e.expireAt).getTime() - now.getTime()) /
            3600 /
            1000
          ).toFixed(1);
          lines.push(`  · ${e.label ?? e.filename} · ${formatSize(e.sizeBytes)} · 剩 ${remainH}h`);
          lines.push(`    ${url}`);
          lines.push(`    源: ${e.sourcePath}`);
        }
        if (pendingMissing > 0) {
          lines.push(``);
          lines.push(`⚠ ${pendingMissing} 个 manifest 条目对应本地文件已丢失（可能被外部删除），URL 会 404。`);
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          structuredContent: {
            entries: sorted.map((e) => ({
              ...e,
              url: buildShareUrl(baseUrl, urlPrefix, e.filename),
            })),
            pruned,
            pendingMissing,
            baseUrl,
            urlPrefix,
            shareRoot,
          },
        };
      },
    })) as any,
    { name: "enhance_share_list" },
  );

  api.registerTool(
    ((_ctx: OpenClawPluginToolContext) => ({
      name: "enhance_share_revoke",
      description: "撤销分享链接（按 token 或 filename 匹配，立刻删除本地文件 + manifest 条目）",
      parameters: Type.Object({
        match: Type.String({ description: "token (12 hex) 或 filename（落盘文件名）" }),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const match = String(params.match ?? "").trim();
        if (!match) return errorResponse("match 必填。");

        const manifest = safeReadManifest(manifestPath);
        const before = manifest.entries.length;
        const removed: ShareEntry[] = [];
        manifest.entries = manifest.entries.filter((e) => {
          const hit = e.token === match || e.filename === match;
          if (hit) removed.push(e);
          return !hit;
        });

        if (removed.length === 0) {
          return {
            content: [{ type: "text" as const, text: `未找到匹配 ${match} 的分享。` }],
            structuredContent: { match, removed: [] },
          };
        }

        for (const e of removed) {
          const p = join(filesDir, e.filename);
          if (existsSync(p)) {
            try {
              rmSync(p, { force: true });
            } catch (err) {
              api.logger.warn(
                `[enhance-bot-share] 删除 ${p} 失败：${(err as Error).message}`,
              );
            }
          }
        }
        try {
          safeWriteManifest(manifestPath, manifest);
        } catch {
          // 不致命
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `✓ 已撤销 ${removed.length} 个分享（${before} → ${manifest.entries.length}）：${removed.map((e) => e.filename).join("、")}`,
            },
          ],
          structuredContent: {
            match,
            removed: removed.map((e) => e.filename),
            remaining: manifest.entries.length,
          },
        };
      },
    })) as any,
    { name: "enhance_share_revoke" },
  );
}
