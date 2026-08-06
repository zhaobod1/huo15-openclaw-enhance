/**
 * 渠道检测工具 - 跨渠道统一抽象
 * 支持: wecom(企微), dingtalk(钉钉), feishu(飞书), terminal
 * 注：isTerminal/getOutputFormat 等为既有公共 API（供其他模块按需取用），
 * 当前活跃调用方为 large-file-bridge（isImChannel/detectChannel）。
 */

// sessionKey → channelId 的缓存
const channelCache = new Map<string, string>();

/**
 * 从 message_received 事件中检测渠道并缓存
 * 调用时机: api.on("message_received", ...)
 */
export function detectChannel(
  event: { channel?: string; originatingChannel?: string },
  sessionKey: string
): string {
  // OpenClaw 可能在不同字段传渠道
  const ch =
    event.originatingChannel ??
    event.channel ??
    "terminal";

  const resolved = ch.toLowerCase().trim();
  channelCache.set(sessionKey, resolved);
  return resolved;
}

/**
 * 根据 sessionKey 查询渠道
 */
export function getChannel(sessionKey: string): string {
  if (!sessionKey) return "terminal";
  return channelCache.get(sessionKey) ?? "terminal";
}

/**
 * 是否企微渠道
 */
export function isWecom(sessionKey: string): boolean {
  return getChannel(sessionKey) === "wecom";
}

/**
 * 是否钉钉渠道
 */
export function isDingtalk(sessionKey: string): boolean {
  const ch = getChannel(sessionKey);
  return ch === "dingtalk" || ch === "dingding";
}

/**
 * 是否飞书渠道（feishu / lark 两种标识都认）
 */
export function isFeishu(sessionKey: string): boolean {
  const ch = getChannel(sessionKey);
  return ch === "feishu" || ch === "lark";
}

/**
 * 是否 IM 渠道（企微 / 钉钉 / 飞书——都有文件大小上限，需走链接上传兜底）
 */
export function isImChannel(sessionKey: string): boolean {
  return isWecom(sessionKey) || isDingtalk(sessionKey) || isFeishu(sessionKey);
}

/**
 * 是否终端渠道（有 TTY）
 */
export function isTerminal(sessionKey: string): boolean {
  const ch = getChannel(sessionKey);
  return ch === "terminal" || ch === "" || ch === "cli";
}

/**
 * 获取渠道偏好的输出格式
 * wecom/dingtalk → emoji纯文本
 * terminal → ASCII艺术
 */
export type OutputFormat = "emoji" | "ascii" | "markdown";

export function getOutputFormat(sessionKey: string): OutputFormat {
  if (isTerminal(sessionKey)) return "ascii";
  if (isWecom(sessionKey)) return "markdown";
  if (isDingtalk(sessionKey)) return "emoji";
  return "emoji";
}
