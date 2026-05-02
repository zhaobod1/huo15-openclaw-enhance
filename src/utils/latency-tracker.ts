/**
 * v5.8.5 Provider 延迟+错误率追踪
 *
 * 接 openclaw 的 `model_call_ended` hook：每次 LLM 调用完成时记一次样本，
 * 按 provider 维护滑动窗口（最近 50 样本 / 1h 内），计算 P50/P95/errRate，
 * 节流写回 ModelRouteConfig.speedTracking 给 selectProvider speed mode 用。
 *
 * 红线：
 *   - 内存优先，磁盘 IO 节流（debounce 60s 或攒 10+ 新样本）
 *   - 只读 hook event，不改 model 选择（5.8.3 的 before_model_resolve 单独管路由）
 *   - 不用 child_process / 不阻塞 hook 返回
 */
import type { ModelRouteConfig, SpeedSample } from "./model-route-config.js";
import { saveModelRouteConfig } from "./model-route-config.js";
import { appendSnapshot } from "./route-history.js";

interface Sample {
  /** epoch ms */
  ts: number;
  /** 优先用 TTFB（首字节），缺失时用 totalDurationMs */
  latencyMs: number;
  errored: boolean;
}

const SAMPLE_WINDOW = 50;            // 每 provider 保留最近 50 次调用
const MAX_SAMPLE_AGE_MS = 3_600_000; // 1h 内的样本才算
const PERSIST_DEBOUNCE_MS = 60_000;  // 至少 60s 才 persist 一次
const PERSIST_BATCH_THRESHOLD = 10;  // 或攒 10+ 新样本就 persist

interface ProviderState {
  samples: Sample[];
  /** 上次 persist 后新增的样本数 */
  pendingCount: number;
  /** 上次 persist 时间 */
  lastPersistMs: number;
}

const stats = new Map<string, ProviderState>();
let persistTimer: NodeJS.Timeout | null = null;

function ensure(providerId: string): ProviderState {
  let s = stats.get(providerId);
  if (!s) {
    s = { samples: [], pendingCount: 0, lastPersistMs: 0 };
    stats.set(providerId, s);
  }
  return s;
}

function percentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * pct)));
  return sorted[idx];
}

function computeSample(state: ProviderState, now: number): SpeedSample | null {
  const fresh = state.samples.filter((s) => now - s.ts <= MAX_SAMPLE_AGE_MS);
  if (fresh.length === 0) return null;
  const lats = fresh.map((s) => s.latencyMs).sort((a, b) => a - b);
  const errors = fresh.filter((s) => s.errored).length;
  const oldest = fresh[0];
  return {
    p50Ms: Math.round(percentile(lats, 0.5)),
    p95Ms: Math.round(percentile(lats, 0.95)),
    errRate: Math.round((errors / fresh.length) * 100) / 100,
    samples: fresh.length,
    windowStartedAt: new Date(oldest.ts).toISOString(),
  };
}

/**
 * 记一次 LLM 调用样本。从 model_call_ended hook 调用。
 *
 * 调用内不写盘——只更新内存，由 schedulePersist 节流。
 */
export function recordSample(
  providerId: string,
  latencyMs: number,
  errored: boolean,
): void {
  if (!Number.isFinite(latencyMs) || latencyMs < 0) return;
  const state = ensure(providerId);
  const now = Date.now();
  state.samples.push({ ts: now, latencyMs, errored });
  // 滑动窗口：超过 SAMPLE_WINDOW 砍最旧
  if (state.samples.length > SAMPLE_WINDOW) {
    state.samples.splice(0, state.samples.length - SAMPLE_WINDOW);
  }
  state.pendingCount += 1;
}

/**
 * 把所有 provider 当前 stats 计算后 inject 进 config.speedTracking 并 saveConfig。
 *
 * 由 schedulePersist 节流调用。直接调用立即写。
 */
export function flushTracking(config: ModelRouteConfig): void {
  const now = Date.now();
  if (!config.speedTracking) config.speedTracking = {};
  let touched = false;
  for (const [providerId, state] of stats) {
    const sample = computeSample(state, now);
    if (!sample) {
      // 1h 内无样本——清掉
      if (config.speedTracking[providerId]) {
        delete config.speedTracking[providerId];
        touched = true;
      }
      continue;
    }
    config.speedTracking[providerId] = sample;
    state.pendingCount = 0;
    state.lastPersistMs = now;
    touched = true;
  }
  if (touched) {
    try {
      saveModelRouteConfig(config);
    } catch {
      // 写盘失败不阻塞——下次 flush 重试
    }
    // v5.8.6: 同步 append 一份快照到 history.jsonl，给 enhance_model_route_history 工具用
    try {
      appendSnapshot({
        ts: new Date(now).toISOString(),
        providers: { ...config.speedTracking },
      });
    } catch {
      // history 写失败也不阻塞主流程
    }
  }
}

/**
 * 决定是否要触发 persist（节流策略）。从 hook 调用，廉价。
 */
export function schedulePersist(config: ModelRouteConfig): void {
  // 已有 timer pending —— 让它跑
  if (persistTimer) return;

  const now = Date.now();
  let shouldImmediate = false;
  for (const state of stats.values()) {
    if (state.pendingCount >= PERSIST_BATCH_THRESHOLD) {
      shouldImmediate = true;
      break;
    }
    // 距上次 persist > 60s 且有新样本，也立刻刷
    if (state.pendingCount > 0 && now - state.lastPersistMs > PERSIST_DEBOUNCE_MS) {
      shouldImmediate = true;
      break;
    }
  }
  if (shouldImmediate) {
    flushTracking(config);
    return;
  }
  // 否则起一个 60s 的 debounce timer
  persistTimer = setTimeout(() => {
    persistTimer = null;
    flushTracking(config);
  }, PERSIST_DEBOUNCE_MS);
  // 不要 unref 否则 timer 在 process exit 前不跑，写盘丢失（这里 unref 反而 OK：进程要退也无所谓）
  persistTimer.unref?.();
}

/**
 * 返回当前所有 provider 的内存状态（diagnostic / status 工具用）。
 */
export function snapshotStats(): Record<string, { samples: number; pending: number; lastPersistMs: number }> {
  const out: Record<string, { samples: number; pending: number; lastPersistMs: number }> = {};
  for (const [k, s] of stats) {
    out[k] = { samples: s.samples.length, pending: s.pendingCount, lastPersistMs: s.lastPersistMs };
  }
  return out;
}

/**
 * 测试 / 重置用——清空所有内存状态。
 */
export function resetTracker(): void {
  stats.clear();
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}
