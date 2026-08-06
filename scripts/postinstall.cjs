#!/usr/bin/env node
// postinstall - 提示 + 交互式配置 BOT_BASE_URL（v6.7.22 起 TTY 下直接询问并写入插件自有配置）。
// 零 require 外部包；只用 fs/path/readline（node 内置），不算 §6.2 禁的 child_process。
// 只写插件自有目录 ~/.openclaw/share/config.json（与 enhance_share_set_baseurl 同路径同格式），不动用户的 openclaw.json。
// 已配置 / CI / silent / 非 TTY 自动跳过交互（非 TTY 时仍打纯提示）。

"use strict";

var fs = require("fs");
var path = require("path");

// Skip 1: CI / silent npm
if (process.env.CI || process.env.npm_config_loglevel === "silent") {
  process.exit(0);
}

// Skip 2: env BOT_BASE_URL set
if (process.env.BOT_BASE_URL && process.env.BOT_BASE_URL.trim()) {
  process.exit(0);
}

// Skip 3: ~/.openclaw/share/config.json baseUrl set (升级安装不重复唠叨)
try {
  var home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    var cfg = path.join(home, ".openclaw", "share", "config.json");
    if (fs.existsSync(cfg)) {
      var data = JSON.parse(fs.readFileSync(cfg, "utf8"));
      if (data && typeof data.baseUrl === "string" && data.baseUrl.trim()) {
        process.exit(0);
      }
    }
  }
} catch (_e) {
  // 读不到/解析失败不影响主流程，继续往下打提示
}

// ---- 提示文案 ----
var pkgVersion = "?";
try {
  pkgVersion = require("../package.json").version || "?";
} catch (_e) {
  /* ignore */
}

var tty = process.stderr && process.stderr.isTTY;
var c = tty
  ? {
      reset: "\x1b[0m",
      bold: "\x1b[1m",
      dim: "\x1b[2m",
      cyan: "\x1b[36m",
      yellow: "\x1b[33m",
      green: "\x1b[32m",
    }
  : { reset: "", bold: "", dim: "", cyan: "", yellow: "", green: "" };

var msg =
  "\n" +
  c.bold + c.cyan + "@huo15/openclaw-enhance v" + pkgVersion + " 装好了" + c.reset + "\n" +
  "\n" +
  c.yellow + "推荐配置：" + c.bold + "BOT_BASE_URL" + c.reset + c.yellow + "（公网下载域名）" + c.reset + "\n" +
  "\n" +
  "如果你打算用 " + c.bold + "enhance_share_file" + c.reset + " 工具给企微 / 飞书 / 钉钉群发大文件下载链接\n" +
  "（>20-50MB IM 直传不了的场景），enhance 必须知道你的" + c.bold + "公网 base URL" + c.reset + "才能生成\n" +
  "群成员点得开的链接。不配置的副作用：链接会落 LAN IP / localhost，群里其他人点开 404。\n" +
  "\n" +
  c.bold + "三种配置方式（任选其一，优先级从高到低）：" + c.reset + "\n" +
  "\n" +
  "  " + c.cyan + "1." + c.reset + " shell 环境变量（最简单，OpenClaw 重启即生效）\n" +
  "       " + c.dim + "echo 'export BOT_BASE_URL=https://your-domain.com' >> ~/.zshrc" + c.reset + "\n" +
  "       " + c.dim + "source ~/.zshrc" + c.reset + "\n" +
  "\n" +
  "  " + c.cyan + "2." + c.reset + " openclaw.json 显式配（per-account 隔离）\n" +
  "       " + c.dim + 'plugins.entries.enhance.config.botShare.baseUrl = "https://your-domain.com"' + c.reset + "\n" +
  "\n" +
  "  " + c.cyan + "3." + c.reset + " 让 LLM 一次性持久化（" + c.green + "最自然" + c.reset + "——OpenClaw 启动后跟它说话即可）\n" +
  "       " + c.dim + '你："把 baseUrl 设成 https://your-domain.com"' + c.reset + "\n" +
  "       " + c.dim + "LLM 自动调 enhance_share_set_baseurl 工具，写到 ~/.openclaw/share/config.json" + c.reset + "\n" +
  "\n" +
  c.dim + "文档：https://cnb.cool/huo15/ai/huo15-openclaw-enhance" + c.reset + "\n" +
  c.dim + "（已配置 / CI 环境会自动跳过此提示）" + c.reset + "\n" +
  "\n";

// ---- 交互式 baseURL 输入（TTY 才有；非 TTY / 管道环境自动退回纯提示）----
// v6.7.22: 初始化时直接问用户 baseURL，写入 ~/.openclaw/share/config.json
//（与 enhance_share_set_baseurl 同格式、同路径；只写插件自有目录，不动 openclaw.json）。
// 示例：本机 OpenClaw 内网穿透域名 https://nengbaibot.huo15.com
function normalizeBaseUrl(raw) {
  var v = String(raw || "").trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  var parsed;
  try {
    parsed = new URL(v);
  } catch (_e) {
    return null;
  }
  if (parsed.pathname && parsed.pathname !== "/" && parsed.pathname !== "") return null;
  if (parsed.search || parsed.hash) return null;
  return parsed.protocol + "//" + parsed.host;
}

function persistBaseUrl(apiUrl) {
  var home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return false;
  var shareDir = path.join(home, ".openclaw", "share");
  var cfgPath = path.join(shareDir, "config.json");
  var current = {};
  try {
    if (fs.existsSync(cfgPath)) {
      var parsed = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (parsed && typeof parsed === "object") current = parsed;
    }
  } catch (_e) { /* ignore corrupt */ }
  current.baseUrl = apiUrl;
  current.setAt = new Date().toISOString();
  current.setBy = "postinstall";
  try {
    fs.mkdirSync(shareDir, { recursive: true });
    // 原子写：先写临时文件再 rename，避免 Ctrl+C 撞写瞬间损坏 config.json
    var tmpPath = cfgPath + ".tmp-" + process.pid;
    fs.writeFileSync(tmpPath, JSON.stringify(current, null, 2), "utf-8");
    fs.renameSync(tmpPath, cfgPath);
    return true;
  } catch (_e) {
    try { fs.unlinkSync(cfgPath + ".tmp-" + process.pid); } catch (_e2) { /* ignore */ }
    return false;
  }
}

// 交互段：仅当 stderr/stdin 都是 TTY 且用户未在非交互管道中
if (process.stdin && process.stdin.isTTY && process.stderr && process.stderr.isTTY) {
  var readline = require("readline");
  var rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  var answered = false;
  var prompted = false;

  function doPrompt() {
    if (prompted) return;
    prompted = true;
    rl.question(
      "\n" +
        c.cyan + "▶ " + c.reset + c.bold + "是否现在配置 baseURL（公网下载/上传域名）？" + c.reset + "\n" +
        "  测试示例：" + c.dim + "https://nengbaibot.huo15.com" + c.reset + "\n" +
        "  直接回车跳过（稍后可随时配置），请输入： ",
      function (answer) {
        var trimmed = String(answer || "").trim();
        var normalized = trimmed ? normalizeBaseUrl(answer) : null;
        if (trimmed && !normalized) {
          // 无效输入：打印警告，随后 close 时自动回退纯提示
          process.stderr.write(c.yellow + "⚠ 输入无效（需域名或 http(s)://host[:port]，不带路径/query）。已跳过，稍后可再配置。\n" + c.reset);
          rl.close();
          return;
        }
        if (normalized) {
          if (persistBaseUrl(normalized)) {
            answered = true; // 只有真正写入才算回答，close 时不再打纯提示
            process.stderr.write(c.green + "✓ baseUrl=" + normalized + " 已保存到 ~/.openclaw/share/config.json\n" + c.reset);
          } else {
            process.stderr.write(c.yellow + "⚠ 保存失败（写 ~/.openclaw/share/config.json 出错）。稍后可对 AI 说「把 baseUrl 设成 " + normalized + "」。\n" + c.reset);
          }
        }
        // 空回车：answered 保持 false → close 时回退纯提示
        rl.close();
      }
    );
  }

  // 若用户在 8s 内无输入，视为跳过，避免安装流程挂死
  var timedOut = false;
  var timer = setTimeout(function () {
    if (!answered) {
      timedOut = true;
      try { rl.close(); } catch (_e) { /* ignore */ }
    }
  }, 8000);

  // Ctrl+C 优雅退出：静默退出，不打纯提示（npm 视为安装成功）
  var sigint = false;
  rl.on("SIGINT", function () {
    sigint = true;
    clearTimeout(timer);
    try { rl.close(); } catch (_e) { /* ignore */ }
  });

  rl.on("close", function () {
    clearTimeout(timer);
    if (!answered && !sigint) {
      if (timedOut) {
        // 超时：用户不在场，只打一行，避免与纯提示重复
        process.stderr.write(
          c.dim + "\n（8 秒未收到输入，已跳过配置。稍后可对 AI 说「把 baseUrl 设成 https://your-domain.com」）\n" + c.reset
        );
      } else {
        // 空回车/无效输入：用户在场，回退完整纯提示（含三种配置方式）
        process.stderr.write(
          c.dim + "\n（未配置 baseURL，以下为配置方式）\n" + c.reset
        );
        process.stderr.write(msg);
      }
    }
    process.exit(0);
  });

  doPrompt();
} else {
  process.stderr.write(msg);
}
