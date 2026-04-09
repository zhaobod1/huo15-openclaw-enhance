import { j as formatMemoryDreamingDay } from "./dreaming-BXqo2sMj.js";
import "./memory-core-host-status-BJj-fXlX.js";
import path from "node:path";
import fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
const CONCEPT_STOP_WORDS = new Set(Object.values({
	shared: [
		"about",
		"after",
		"agent",
		"again",
		"also",
		"because",
		"before",
		"being",
		"between",
		"build",
		"called",
		"could",
		"daily",
		"default",
		"deploy",
		"during",
		"every",
		"file",
		"files",
		"from",
		"have",
		"into",
		"just",
		"line",
		"lines",
		"long",
		"main",
		"make",
		"memory",
		"month",
		"more",
		"most",
		"move",
		"much",
		"next",
		"note",
		"notes",
		"over",
		"part",
		"past",
		"port",
		"same",
		"score",
		"search",
		"session",
		"sessions",
		"short",
		"should",
		"since",
		"some",
		"than",
		"that",
		"their",
		"there",
		"these",
		"they",
		"this",
		"through",
		"today",
		"using",
		"with",
		"work",
		"workspace",
		"year"
	],
	english: [
		"and",
		"are",
		"for",
		"into",
		"its",
		"our",
		"then",
		"were"
	],
	spanish: [
		"al",
		"con",
		"como",
		"de",
		"del",
		"el",
		"en",
		"es",
		"la",
		"las",
		"los",
		"para",
		"por",
		"que",
		"se",
		"sin",
		"su",
		"sus",
		"una",
		"uno",
		"unos",
		"unas",
		"y"
	],
	french: [
		"au",
		"aux",
		"avec",
		"dans",
		"de",
		"des",
		"du",
		"en",
		"est",
		"et",
		"la",
		"le",
		"les",
		"ou",
		"pour",
		"que",
		"qui",
		"sans",
		"ses",
		"son",
		"sur",
		"une",
		"un"
	],
	german: [
		"auf",
		"aus",
		"bei",
		"das",
		"dem",
		"den",
		"der",
		"des",
		"die",
		"ein",
		"eine",
		"einem",
		"einen",
		"einer",
		"für",
		"im",
		"in",
		"mit",
		"nach",
		"oder",
		"ohne",
		"über",
		"und",
		"von",
		"zu",
		"zum",
		"zur"
	],
	cjk: [
		"が",
		"から",
		"する",
		"して",
		"した",
		"で",
		"と",
		"に",
		"の",
		"は",
		"へ",
		"まで",
		"も",
		"や",
		"を",
		"与",
		"为",
		"了",
		"及",
		"和",
		"在",
		"将",
		"或",
		"把",
		"是",
		"用",
		"的",
		"과",
		"는",
		"도",
		"로",
		"를",
		"에",
		"에서",
		"와",
		"은",
		"으로",
		"을",
		"이",
		"하다",
		"한",
		"할",
		"해",
		"했다",
		"했다"
	],
	pathNoise: [
		"cjs",
		"cpp",
		"cts",
		"jsx",
		"json",
		"md",
		"mjs",
		"mts",
		"text",
		"toml",
		"ts",
		"tsx",
		"txt",
		"yaml",
		"yml"
	]
}).flatMap((words) => words).map((word) => word.toLowerCase()));
const PROTECTED_GLOSSARY = [
	"backup",
	"backups",
	"embedding",
	"embeddings",
	"failover",
	"gateway",
	"glacier",
	"gpt",
	"kv",
	"network",
	"openai",
	"qmd",
	"router",
	"s3",
	"vlan",
	"sauvegarde",
	"routeur",
	"passerelle",
	"konfiguration",
	"sicherung",
	"überwachung",
	"configuración",
	"respaldo",
	"enrutador",
	"puerta-de-enlace",
	"バックアップ",
	"フェイルオーバー",
	"ルーター",
	"ネットワーク",
	"ゲートウェイ",
	"障害対応",
	"路由器",
	"备份",
	"故障转移",
	"网络",
	"网关",
	"라우터",
	"백업",
	"페일오버",
	"네트워크",
	"게이트웨이",
	"장애대응"
].map((word) => word.normalize("NFKC").toLowerCase());
const COMPOUND_TOKEN_RE = /[\p{L}\p{N}]+(?:[._/-][\p{L}\p{N}]+)+/gu;
const LETTER_OR_NUMBER_RE = /[\p{L}\p{N}]/u;
const LATIN_RE = /\p{Script=Latin}/u;
const HAN_RE = /\p{Script=Han}/u;
const HIRAGANA_RE = /\p{Script=Hiragana}/u;
const KATAKANA_RE = /\p{Script=Katakana}/u;
const HANGUL_RE = /\p{Script=Hangul}/u;
const DEFAULT_WORD_SEGMENTER = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("und", { granularity: "word" }) : null;
function containsLetterOrNumber(value) {
	return LETTER_OR_NUMBER_RE.test(value);
}
function classifyConceptTagScript(tag) {
	const normalized = tag.normalize("NFKC");
	const hasLatin = LATIN_RE.test(normalized);
	const hasCjk = HAN_RE.test(normalized) || HIRAGANA_RE.test(normalized) || KATAKANA_RE.test(normalized) || HANGUL_RE.test(normalized);
	if (hasLatin && hasCjk) return "mixed";
	if (hasCjk) return "cjk";
	if (hasLatin) return "latin";
	return "other";
}
function minimumTokenLengthForScript(script) {
	if (script === "cjk") return 2;
	return 3;
}
function isKanaOnlyToken(value) {
	return !HAN_RE.test(value) && !HANGUL_RE.test(value) && (HIRAGANA_RE.test(value) || KATAKANA_RE.test(value));
}
function normalizeConceptToken(rawToken) {
	const normalized = rawToken.normalize("NFKC").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").replaceAll("_", "-").toLowerCase();
	if (!normalized || !containsLetterOrNumber(normalized) || normalized.length > 32) return null;
	if (/^\d+$/.test(normalized) || /^\d{4}-\d{2}-\d{2}$/u.test(normalized) || /^\d{4}-\d{2}-\d{2}\.[\p{L}\p{N}]+$/u.test(normalized)) return null;
	const script = classifyConceptTagScript(normalized);
	if (normalized.length < minimumTokenLengthForScript(script)) return null;
	if (isKanaOnlyToken(normalized) && normalized.length < 3) return null;
	if (CONCEPT_STOP_WORDS.has(normalized)) return null;
	return normalized;
}
function collectGlossaryMatches(source) {
	const normalizedSource = source.normalize("NFKC").toLowerCase();
	const matches = [];
	for (const entry of PROTECTED_GLOSSARY) {
		if (!normalizedSource.includes(entry)) continue;
		matches.push(entry);
	}
	return matches;
}
function collectCompoundTokens(source) {
	return source.match(COMPOUND_TOKEN_RE) ?? [];
}
function collectSegmentTokens(source) {
	if (DEFAULT_WORD_SEGMENTER) return Array.from(DEFAULT_WORD_SEGMENTER.segment(source), (part) => part.isWordLike ? part.segment : "").filter(Boolean);
	return source.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
function pushNormalizedTag(tags, rawToken, limit) {
	const normalized = normalizeConceptToken(rawToken);
	if (!normalized || tags.includes(normalized)) return;
	tags.push(normalized);
	if (tags.length > limit) tags.splice(limit);
}
function deriveConceptTags(params) {
	const source = `${path.basename(params.path)} ${params.snippet}`;
	const limit = Number.isFinite(params.limit) ? Math.max(0, Math.floor(params.limit)) : 8;
	if (limit === 0) return [];
	const tags = [];
	for (const rawToken of [
		...collectGlossaryMatches(source),
		...collectCompoundTokens(source),
		...collectSegmentTokens(source)
	]) {
		pushNormalizedTag(tags, rawToken, limit);
		if (tags.length >= limit) break;
	}
	return tags;
}
function summarizeConceptTagScriptCoverage(conceptTagsByEntry) {
	const coverage = {
		latinEntryCount: 0,
		cjkEntryCount: 0,
		mixedEntryCount: 0,
		otherEntryCount: 0
	};
	for (const conceptTags of conceptTagsByEntry) {
		let hasLatin = false;
		let hasCjk = false;
		let hasOther = false;
		for (const tag of conceptTags) {
			const family = classifyConceptTagScript(tag);
			if (family === "mixed") {
				hasLatin = true;
				hasCjk = true;
				continue;
			}
			if (family === "latin") {
				hasLatin = true;
				continue;
			}
			if (family === "cjk") {
				hasCjk = true;
				continue;
			}
			hasOther = true;
		}
		if (hasLatin && hasCjk) coverage.mixedEntryCount += 1;
		else if (hasCjk) coverage.cjkEntryCount += 1;
		else if (hasLatin) coverage.latinEntryCount += 1;
		else if (hasOther) coverage.otherEntryCount += 1;
	}
	return coverage;
}
//#endregion
//#region extensions/memory-core/src/short-term-promotion.ts
const SHORT_TERM_PATH_RE = /(?:^|\/)memory\/(\d{4})-(\d{2})-(\d{2})\.md$/;
const SHORT_TERM_BASENAME_RE = /^(\d{4})-(\d{2})-(\d{2})\.md$/;
const DAY_MS = 1440 * 60 * 1e3;
const DEFAULT_RECENCY_HALF_LIFE_DAYS = 14;
const DEFAULT_PROMOTION_MIN_SCORE = .75;
const PROMOTION_MARKER_PREFIX = "openclaw-memory-promotion:";
const MAX_QUERY_HASHES = 32;
const MAX_RECALL_DAYS = 16;
const SHORT_TERM_STORE_RELATIVE_PATH = path.join("memory", ".dreams", "short-term-recall.json");
const SHORT_TERM_PHASE_SIGNAL_RELATIVE_PATH = path.join("memory", ".dreams", "phase-signals.json");
const SHORT_TERM_LOCK_RELATIVE_PATH = path.join("memory", ".dreams", "short-term-promotion.lock");
const SHORT_TERM_LOCK_WAIT_TIMEOUT_MS = 1e4;
const SHORT_TERM_LOCK_STALE_MS = 6e4;
const SHORT_TERM_LOCK_RETRY_DELAY_MS = 40;
const PHASE_SIGNAL_LIGHT_BOOST_MAX = .05;
const PHASE_SIGNAL_REM_BOOST_MAX = .08;
const PHASE_SIGNAL_HALF_LIFE_DAYS = 14;
const DEFAULT_PROMOTION_WEIGHTS = {
	frequency: .24,
	relevance: .3,
	diversity: .15,
	recency: .15,
	consolidation: .1,
	conceptual: .06
};
function clampScore(value) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}
function toFiniteScore(value, fallback) {
	const num = Number(value);
	if (!Number.isFinite(num)) return fallback;
	if (num < 0 || num > 1) return fallback;
	return num;
}
function normalizeSnippet(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	return trimmed.replace(/\s+/g, " ");
}
function normalizeMemoryPath(rawPath) {
	return rawPath.replaceAll("\\", "/").replace(/^\.\//, "");
}
function buildEntryKey(result) {
	return `${result.source}:${normalizeMemoryPath(result.path)}:${result.startLine}:${result.endLine}`;
}
function hashQuery(query) {
	return createHash("sha1").update(query.trim().toLowerCase()).digest("hex").slice(0, 12);
}
function mergeQueryHashes(existing, queryHash) {
	if (!queryHash) return existing;
	const seen = /* @__PURE__ */ new Set();
	const next = existing.filter((value) => {
		if (!value || seen.has(value)) return false;
		seen.add(value);
		return true;
	});
	if (!seen.has(queryHash)) next.push(queryHash);
	if (next.length <= MAX_QUERY_HASHES) return next;
	return next.slice(next.length - MAX_QUERY_HASHES);
}
function mergeRecentDistinct(existing, nextValue, limit) {
	const seen = /* @__PURE__ */ new Set();
	const next = existing.filter((value) => {
		if (typeof value !== "string" || value.length === 0 || seen.has(value)) return false;
		seen.add(value);
		return true;
	});
	if (nextValue && !next.includes(nextValue)) next.push(nextValue);
	if (next.length <= limit) return next;
	return next.slice(next.length - limit);
}
function normalizeIsoDay(isoLike) {
	if (typeof isoLike !== "string") return null;
	return isoLike.trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}
function normalizeDistinctStrings(values, limit) {
	const seen = /* @__PURE__ */ new Set();
	const normalized = [];
	for (const value of values) {
		if (typeof value !== "string") continue;
		const trimmed = value.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		normalized.push(trimmed);
		if (normalized.length >= limit) break;
	}
	return normalized;
}
function calculateConsolidationComponent(recallDays) {
	if (recallDays.length === 0) return 0;
	if (recallDays.length === 1) return .2;
	const parsed = recallDays.map((value) => Date.parse(`${value}T00:00:00.000Z`)).filter((value) => Number.isFinite(value)).toSorted((left, right) => left - right);
	if (parsed.length <= 1) return .2;
	const spanDays = Math.max(0, (parsed.at(-1) - parsed[0]) / DAY_MS);
	const spacing = clampScore(Math.log1p(parsed.length - 1) / Math.log1p(4));
	const span = clampScore(spanDays / 7);
	return clampScore(.55 * spacing + .45 * span);
}
function calculateConceptualComponent(conceptTags) {
	return clampScore(conceptTags.length / 6);
}
function emptyStore(nowIso) {
	return {
		version: 1,
		updatedAt: nowIso,
		entries: {}
	};
}
function normalizeStore(raw, nowIso) {
	if (!raw || typeof raw !== "object") return emptyStore(nowIso);
	const record = raw;
	const entriesRaw = record.entries;
	const entries = {};
	if (entriesRaw && typeof entriesRaw === "object") for (const [key, value] of Object.entries(entriesRaw)) {
		if (!value || typeof value !== "object") continue;
		const entry = value;
		const entryPath = typeof entry.path === "string" ? normalizeMemoryPath(entry.path) : "";
		const startLine = Number(entry.startLine);
		const endLine = Number(entry.endLine);
		const source = entry.source === "memory" ? "memory" : null;
		if (!entryPath || !Number.isInteger(startLine) || !Number.isInteger(endLine) || !source) continue;
		const recallCount = Math.max(0, Math.floor(Number(entry.recallCount) || 0));
		const dailyCount = Math.max(0, Math.floor(Number(entry.dailyCount) || 0));
		const totalScore = Math.max(0, Number(entry.totalScore) || 0);
		const maxScore = clampScore(Number(entry.maxScore) || 0);
		const firstRecalledAt = typeof entry.firstRecalledAt === "string" ? entry.firstRecalledAt : nowIso;
		const lastRecalledAt = typeof entry.lastRecalledAt === "string" ? entry.lastRecalledAt : nowIso;
		const promotedAt = typeof entry.promotedAt === "string" ? entry.promotedAt : void 0;
		const snippet = typeof entry.snippet === "string" ? normalizeSnippet(entry.snippet) : "";
		const queryHashes = Array.isArray(entry.queryHashes) ? normalizeDistinctStrings(entry.queryHashes, MAX_QUERY_HASHES) : [];
		const recallDays = Array.isArray(entry.recallDays) ? entry.recallDays.map((value) => normalizeIsoDay(String(value))).filter((value) => value !== null) : [];
		const conceptTags = Array.isArray(entry.conceptTags) ? normalizeDistinctStrings(entry.conceptTags.map((tag) => typeof tag === "string" ? tag.toLowerCase() : tag), 8) : deriveConceptTags({
			path: entryPath,
			snippet
		});
		const normalizedKey = key || buildEntryKey({
			path: entryPath,
			startLine,
			endLine,
			source
		});
		entries[normalizedKey] = {
			key: normalizedKey,
			path: entryPath,
			startLine,
			endLine,
			source,
			snippet,
			recallCount,
			dailyCount,
			totalScore,
			maxScore,
			firstRecalledAt,
			lastRecalledAt,
			queryHashes,
			recallDays: recallDays.slice(-MAX_RECALL_DAYS),
			conceptTags,
			...promotedAt ? { promotedAt } : {}
		};
	}
	return {
		version: 1,
		updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : nowIso,
		entries
	};
}
function toFinitePositive(value, fallback) {
	const num = Number(value);
	if (!Number.isFinite(num) || num <= 0) return fallback;
	return num;
}
function toFiniteNonNegativeInt(value, fallback) {
	const num = Number(value);
	if (!Number.isFinite(num)) return fallback;
	const floored = Math.floor(num);
	if (floored < 0) return fallback;
	return floored;
}
function normalizeWeights(weights) {
	const merged = {
		...DEFAULT_PROMOTION_WEIGHTS,
		...weights ?? {}
	};
	const frequency = Math.max(0, merged.frequency);
	const relevance = Math.max(0, merged.relevance);
	const diversity = Math.max(0, merged.diversity);
	const recency = Math.max(0, merged.recency);
	const consolidation = Math.max(0, merged.consolidation);
	const conceptual = Math.max(0, merged.conceptual);
	const sum = frequency + relevance + diversity + recency + consolidation + conceptual;
	if (sum <= 0) return { ...DEFAULT_PROMOTION_WEIGHTS };
	return {
		frequency: frequency / sum,
		relevance: relevance / sum,
		diversity: diversity / sum,
		recency: recency / sum,
		consolidation: consolidation / sum,
		conceptual: conceptual / sum
	};
}
function calculateRecencyComponent(ageDays, halfLifeDays) {
	if (!Number.isFinite(ageDays) || ageDays < 0) return 1;
	if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) return 1;
	const lambda = Math.LN2 / halfLifeDays;
	return Math.exp(-lambda * ageDays);
}
function calculatePhaseSignalAgeDays(lastSeenAt, nowMs) {
	if (!lastSeenAt) return null;
	const parsed = Date.parse(lastSeenAt);
	if (!Number.isFinite(parsed)) return null;
	return Math.max(0, (nowMs - parsed) / DAY_MS);
}
function calculatePhaseSignalBoost(entry, nowMs) {
	if (!entry) return 0;
	const lightStrength = clampScore(Math.log1p(Math.max(0, entry.lightHits)) / Math.log1p(6));
	const remStrength = clampScore(Math.log1p(Math.max(0, entry.remHits)) / Math.log1p(6));
	const lightAgeDays = calculatePhaseSignalAgeDays(entry.lastLightAt, nowMs);
	const remAgeDays = calculatePhaseSignalAgeDays(entry.lastRemAt, nowMs);
	const lightRecency = lightAgeDays === null ? 0 : clampScore(calculateRecencyComponent(lightAgeDays, PHASE_SIGNAL_HALF_LIFE_DAYS));
	const remRecency = remAgeDays === null ? 0 : clampScore(calculateRecencyComponent(remAgeDays, PHASE_SIGNAL_HALF_LIFE_DAYS));
	return clampScore(PHASE_SIGNAL_LIGHT_BOOST_MAX * lightStrength * lightRecency + PHASE_SIGNAL_REM_BOOST_MAX * remStrength * remRecency);
}
function resolveStorePath(workspaceDir) {
	return path.join(workspaceDir, SHORT_TERM_STORE_RELATIVE_PATH);
}
function resolvePhaseSignalPath(workspaceDir) {
	return path.join(workspaceDir, SHORT_TERM_PHASE_SIGNAL_RELATIVE_PATH);
}
function resolveLockPath(workspaceDir) {
	return path.join(workspaceDir, SHORT_TERM_LOCK_RELATIVE_PATH);
}
function parseLockOwnerPid(raw) {
	const match = raw.trim().match(/^(\d+):/);
	if (!match) return null;
	const pid = Number.parseInt(match[1] ?? "", 10);
	if (!Number.isInteger(pid) || pid <= 0) return null;
	return pid;
}
function isProcessLikelyAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (err) {
		if (err?.code === "ESRCH") return false;
		return true;
	}
}
async function canStealStaleLock(lockPath) {
	const ownerPid = await fs.readFile(lockPath, "utf-8").then((raw) => parseLockOwnerPid(raw)).catch(() => null);
	if (ownerPid === null) return true;
	return !isProcessLikelyAlive(ownerPid);
}
async function sleep(ms) {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
async function withShortTermLock(workspaceDir, task) {
	const lockPath = resolveLockPath(workspaceDir);
	await fs.mkdir(path.dirname(lockPath), { recursive: true });
	const startedAt = Date.now();
	while (true) {
		let lockHandle;
		try {
			lockHandle = await fs.open(lockPath, "wx");
			await lockHandle.writeFile(`${process.pid}:${Date.now()}\n`, "utf-8").catch(() => void 0);
			try {
				return await task();
			} finally {
				await lockHandle.close().catch(() => void 0);
				await fs.unlink(lockPath).catch(() => void 0);
			}
		} catch (err) {
			if (err?.code !== "EEXIST") throw err;
			if (await fs.stat(lockPath).then((stats) => Date.now() - stats.mtimeMs).catch(() => 0) > SHORT_TERM_LOCK_STALE_MS) {
				if (await canStealStaleLock(lockPath)) {
					await fs.unlink(lockPath).catch(() => void 0);
					continue;
				}
			}
			if (Date.now() - startedAt >= SHORT_TERM_LOCK_WAIT_TIMEOUT_MS) throw new Error(`Timed out waiting for short-term promotion lock at ${lockPath}`);
			await sleep(SHORT_TERM_LOCK_RETRY_DELAY_MS);
		}
	}
}
async function readStore(workspaceDir, nowIso) {
	const storePath = resolveStorePath(workspaceDir);
	try {
		const raw = await fs.readFile(storePath, "utf-8");
		return normalizeStore(JSON.parse(raw), nowIso);
	} catch (err) {
		if (err?.code === "ENOENT") return emptyStore(nowIso);
		throw err;
	}
}
function emptyPhaseSignalStore(nowIso) {
	return {
		version: 1,
		updatedAt: nowIso,
		entries: {}
	};
}
function normalizePhaseSignalStore(raw, nowIso) {
	const record = asRecord(raw);
	if (!record) return emptyPhaseSignalStore(nowIso);
	const entriesRaw = asRecord(record?.entries);
	if (!entriesRaw) return emptyPhaseSignalStore(nowIso);
	const entries = {};
	for (const [mapKey, value] of Object.entries(entriesRaw)) {
		const entry = asRecord(value);
		if (!entry) continue;
		const key = typeof entry.key === "string" && entry.key.trim().length > 0 ? entry.key : mapKey;
		const lightHits = toFiniteNonNegativeInt(entry.lightHits, 0);
		const remHits = toFiniteNonNegativeInt(entry.remHits, 0);
		if (lightHits === 0 && remHits === 0) continue;
		const lastLightAt = typeof entry.lastLightAt === "string" && entry.lastLightAt.trim().length > 0 ? entry.lastLightAt : void 0;
		const lastRemAt = typeof entry.lastRemAt === "string" && entry.lastRemAt.trim().length > 0 ? entry.lastRemAt : void 0;
		entries[key] = {
			key,
			lightHits,
			remHits,
			...lastLightAt ? { lastLightAt } : {},
			...lastRemAt ? { lastRemAt } : {}
		};
	}
	return {
		version: 1,
		updatedAt: typeof record.updatedAt === "string" && record.updatedAt.trim().length > 0 ? record.updatedAt : nowIso,
		entries
	};
}
async function readPhaseSignalStore(workspaceDir, nowIso) {
	const phaseSignalPath = resolvePhaseSignalPath(workspaceDir);
	try {
		const raw = await fs.readFile(phaseSignalPath, "utf-8");
		return normalizePhaseSignalStore(JSON.parse(raw), nowIso);
	} catch (err) {
		if (err?.code === "ENOENT" || err instanceof SyntaxError) return emptyPhaseSignalStore(nowIso);
		return emptyPhaseSignalStore(nowIso);
	}
}
async function writePhaseSignalStore(workspaceDir, store) {
	const phaseSignalPath = resolvePhaseSignalPath(workspaceDir);
	await fs.mkdir(path.dirname(phaseSignalPath), { recursive: true });
	const tmpPath = `${phaseSignalPath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
	await fs.writeFile(tmpPath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
	await fs.rename(tmpPath, phaseSignalPath);
}
async function writeStore(workspaceDir, store) {
	const storePath = resolveStorePath(workspaceDir);
	await fs.mkdir(path.dirname(storePath), { recursive: true });
	const tmpPath = `${storePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
	await fs.writeFile(tmpPath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
	await fs.rename(tmpPath, storePath);
}
function isShortTermMemoryPath(filePath) {
	const normalized = normalizeMemoryPath(filePath);
	if (SHORT_TERM_PATH_RE.test(normalized)) return true;
	return SHORT_TERM_BASENAME_RE.test(normalized);
}
async function recordShortTermRecalls(params) {
	const workspaceDir = params.workspaceDir?.trim();
	if (!workspaceDir) return;
	const query = params.query.trim();
	if (!query) return;
	const relevant = params.results.filter((result) => result.source === "memory" && isShortTermMemoryPath(result.path));
	if (relevant.length === 0) return;
	const nowMs = Number.isFinite(params.nowMs) ? params.nowMs : Date.now();
	const nowIso = new Date(nowMs).toISOString();
	const signalType = params.signalType ?? "recall";
	const queryHash = hashQuery(query);
	const todayBucket = normalizeIsoDay(params.dayBucket ?? "") ?? formatMemoryDreamingDay(nowMs, params.timezone);
	await withShortTermLock(workspaceDir, async () => {
		const store = await readStore(workspaceDir, nowIso);
		for (const result of relevant) {
			const key = buildEntryKey(result);
			const normalizedPath = normalizeMemoryPath(result.path);
			const existing = store.entries[key];
			const snippet = normalizeSnippet(result.snippet);
			const score = clampScore(result.score);
			const recallDaysBase = existing?.recallDays ?? [];
			const queryHashesBase = existing?.queryHashes ?? [];
			const dedupeSignal = Boolean(params.dedupeByQueryPerDay) && queryHashesBase.includes(queryHash) && recallDaysBase.includes(todayBucket);
			const recallCount = signalType === "recall" ? Math.max(0, Math.floor(existing?.recallCount ?? 0) + (dedupeSignal ? 0 : 1)) : Math.max(0, Math.floor(existing?.recallCount ?? 0));
			const dailyCount = signalType === "daily" ? Math.max(0, Math.floor(existing?.dailyCount ?? 0) + (dedupeSignal ? 0 : 1)) : Math.max(0, Math.floor(existing?.dailyCount ?? 0));
			const totalScore = Math.max(0, (existing?.totalScore ?? 0) + (dedupeSignal ? 0 : score));
			const maxScore = Math.max(existing?.maxScore ?? 0, dedupeSignal ? 0 : score);
			const queryHashes = mergeQueryHashes(existing?.queryHashes ?? [], queryHash);
			const recallDays = mergeRecentDistinct(recallDaysBase, todayBucket, MAX_RECALL_DAYS);
			const conceptTags = deriveConceptTags({
				path: normalizedPath,
				snippet
			});
			store.entries[key] = {
				key,
				path: normalizedPath,
				startLine: Math.max(1, Math.floor(result.startLine)),
				endLine: Math.max(1, Math.floor(result.endLine)),
				source: "memory",
				snippet: snippet || existing?.snippet || "",
				recallCount,
				dailyCount,
				totalScore,
				maxScore,
				firstRecalledAt: existing?.firstRecalledAt ?? nowIso,
				lastRecalledAt: nowIso,
				queryHashes,
				recallDays,
				conceptTags: conceptTags.length > 0 ? conceptTags : existing?.conceptTags ?? [],
				...existing?.promotedAt ? { promotedAt: existing.promotedAt } : {}
			};
		}
		store.updatedAt = nowIso;
		await writeStore(workspaceDir, store);
	});
}
async function recordDreamingPhaseSignals(params) {
	const workspaceDir = params.workspaceDir?.trim();
	if (!workspaceDir) return;
	const keys = [...new Set(params.keys.map((key) => key.trim()).filter(Boolean))];
	if (keys.length === 0) return;
	const nowMs = Number.isFinite(params.nowMs) ? params.nowMs : Date.now();
	const nowIso = new Date(nowMs).toISOString();
	await withShortTermLock(workspaceDir, async () => {
		const [store, phaseSignals] = await Promise.all([readStore(workspaceDir, nowIso), readPhaseSignalStore(workspaceDir, nowIso)]);
		const knownKeys = new Set(Object.keys(store.entries));
		for (const key of keys) {
			if (!knownKeys.has(key)) continue;
			const entry = phaseSignals.entries[key] ?? {
				key,
				lightHits: 0,
				remHits: 0
			};
			if (params.phase === "light") {
				entry.lightHits = Math.min(9999, entry.lightHits + 1);
				entry.lastLightAt = nowIso;
			} else {
				entry.remHits = Math.min(9999, entry.remHits + 1);
				entry.lastRemAt = nowIso;
			}
			phaseSignals.entries[key] = entry;
		}
		for (const [key, entry] of Object.entries(phaseSignals.entries)) if (!knownKeys.has(key) || entry.lightHits <= 0 && entry.remHits <= 0) delete phaseSignals.entries[key];
		phaseSignals.updatedAt = nowIso;
		await writePhaseSignalStore(workspaceDir, phaseSignals);
	});
}
async function rankShortTermPromotionCandidates(options) {
	const workspaceDir = options.workspaceDir.trim();
	if (!workspaceDir) return [];
	const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
	const nowIso = new Date(nowMs).toISOString();
	const minScore = toFiniteScore(options.minScore, DEFAULT_PROMOTION_MIN_SCORE);
	const minRecallCount = toFiniteNonNegativeInt(options.minRecallCount, 3);
	const minUniqueQueries = toFiniteNonNegativeInt(options.minUniqueQueries, 2);
	const maxAgeDays = toFiniteNonNegativeInt(options.maxAgeDays, -1);
	const includePromoted = Boolean(options.includePromoted);
	const halfLifeDays = toFinitePositive(options.recencyHalfLifeDays, DEFAULT_RECENCY_HALF_LIFE_DAYS);
	const weights = normalizeWeights(options.weights);
	const [store, phaseSignals] = await Promise.all([readStore(workspaceDir, nowIso), readPhaseSignalStore(workspaceDir, nowIso)]);
	const candidates = [];
	for (const entry of Object.values(store.entries)) {
		if (!entry || entry.source !== "memory" || !isShortTermMemoryPath(entry.path)) continue;
		if (!includePromoted && entry.promotedAt) continue;
		const recallCount = Math.max(0, Math.floor(entry.recallCount ?? 0));
		const dailyCount = Math.max(0, Math.floor(entry.dailyCount ?? 0));
		const signalCount = recallCount + dailyCount;
		if (signalCount <= 0) continue;
		if (signalCount < minRecallCount) continue;
		const avgScore = clampScore(entry.totalScore / Math.max(1, signalCount));
		const frequency = clampScore(Math.log1p(signalCount) / Math.log1p(10));
		const uniqueQueries = entry.queryHashes?.length ?? 0;
		const contextDiversity = Math.max(uniqueQueries, entry.recallDays?.length ?? 0);
		if (contextDiversity < minUniqueQueries) continue;
		const diversity = clampScore(contextDiversity / 5);
		const lastRecalledAtMs = Date.parse(entry.lastRecalledAt);
		const ageDays = Number.isFinite(lastRecalledAtMs) ? Math.max(0, (nowMs - lastRecalledAtMs) / DAY_MS) : 0;
		if (maxAgeDays >= 0 && ageDays > maxAgeDays) continue;
		const recency = clampScore(calculateRecencyComponent(ageDays, halfLifeDays));
		const recallDays = entry.recallDays ?? [];
		const conceptTags = entry.conceptTags ?? [];
		const consolidation = calculateConsolidationComponent(recallDays);
		const conceptual = calculateConceptualComponent(conceptTags);
		const phaseBoost = calculatePhaseSignalBoost(phaseSignals.entries[entry.key], nowMs);
		const score = weights.frequency * frequency + weights.relevance * avgScore + weights.diversity * diversity + weights.recency * recency + weights.consolidation * consolidation + weights.conceptual * conceptual + phaseBoost;
		if (score < minScore) continue;
		candidates.push({
			key: entry.key,
			path: entry.path,
			startLine: entry.startLine,
			endLine: entry.endLine,
			source: entry.source,
			snippet: entry.snippet,
			recallCount,
			dailyCount,
			signalCount,
			avgScore,
			maxScore: clampScore(entry.maxScore),
			uniqueQueries,
			promotedAt: entry.promotedAt,
			firstRecalledAt: entry.firstRecalledAt,
			lastRecalledAt: entry.lastRecalledAt,
			ageDays,
			score: clampScore(score),
			recallDays,
			conceptTags,
			components: {
				frequency,
				relevance: avgScore,
				diversity,
				recency,
				consolidation,
				conceptual
			}
		});
	}
	const sorted = candidates.toSorted((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		if (b.recallCount !== a.recallCount) return b.recallCount - a.recallCount;
		return a.path.localeCompare(b.path);
	});
	const limit = Number.isFinite(options.limit) ? Math.max(0, Math.floor(options.limit)) : sorted.length;
	return sorted.slice(0, limit);
}
async function readShortTermRecallEntries(params) {
	const workspaceDir = params.workspaceDir.trim();
	if (!workspaceDir) return [];
	const nowMs = Number.isFinite(params.nowMs) ? params.nowMs : Date.now();
	const store = await readStore(workspaceDir, new Date(nowMs).toISOString());
	return Object.values(store.entries).filter((entry) => Boolean(entry) && entry.source === "memory" && isShortTermMemoryPath(entry.path));
}
function resolveShortTermSourcePathCandidates(workspaceDir, candidatePath) {
	const normalizedPath = normalizeMemoryPath(candidatePath);
	const basenames = [normalizedPath];
	if (!normalizedPath.startsWith("memory/")) basenames.push(path.posix.join("memory", path.posix.basename(normalizedPath)));
	const seen = /* @__PURE__ */ new Set();
	const resolved = [];
	for (const relativePath of basenames) {
		const absolutePath = path.resolve(workspaceDir, relativePath);
		if (seen.has(absolutePath)) continue;
		seen.add(absolutePath);
		resolved.push(absolutePath);
	}
	return resolved;
}
function normalizeRangeSnippet(lines, startLine, endLine) {
	const startIndex = Math.max(0, startLine - 1);
	const endIndex = Math.min(lines.length, endLine);
	if (startIndex >= endIndex) return "";
	return normalizeSnippet(lines.slice(startIndex, endIndex).join(" "));
}
function compareCandidateWindow(targetSnippet, windowSnippet) {
	if (!targetSnippet || !windowSnippet) return {
		matched: false,
		quality: 0
	};
	if (windowSnippet === targetSnippet) return {
		matched: true,
		quality: 3
	};
	if (windowSnippet.includes(targetSnippet)) return {
		matched: true,
		quality: 2
	};
	if (targetSnippet.includes(windowSnippet)) return {
		matched: true,
		quality: 1
	};
	return {
		matched: false,
		quality: 0
	};
}
function relocateCandidateRange(lines, candidate) {
	const targetSnippet = normalizeSnippet(candidate.snippet);
	const preferredSpan = Math.max(1, candidate.endLine - candidate.startLine + 1);
	if (targetSnippet.length === 0) {
		const fallbackSnippet = normalizeRangeSnippet(lines, candidate.startLine, candidate.endLine);
		if (!fallbackSnippet) return null;
		return {
			startLine: candidate.startLine,
			endLine: candidate.endLine,
			snippet: fallbackSnippet
		};
	}
	const exactSnippet = normalizeRangeSnippet(lines, candidate.startLine, candidate.endLine);
	if (exactSnippet === targetSnippet) return {
		startLine: candidate.startLine,
		endLine: candidate.endLine,
		snippet: exactSnippet
	};
	const maxSpan = Math.min(lines.length, Math.max(preferredSpan + 3, 8));
	let bestMatch;
	for (let startIndex = 0; startIndex < lines.length; startIndex += 1) for (let span = 1; span <= maxSpan && startIndex + span <= lines.length; span += 1) {
		const startLine = startIndex + 1;
		const endLine = startIndex + span;
		const snippet = normalizeRangeSnippet(lines, startLine, endLine);
		const comparison = compareCandidateWindow(targetSnippet, snippet);
		if (!comparison.matched) continue;
		const distance = Math.abs(startLine - candidate.startLine);
		if (!bestMatch || comparison.quality > bestMatch.quality || comparison.quality === bestMatch.quality && distance < bestMatch.distance || comparison.quality === bestMatch.quality && distance === bestMatch.distance && Math.abs(span - preferredSpan) < Math.abs(bestMatch.endLine - bestMatch.startLine + 1 - preferredSpan)) bestMatch = {
			startLine,
			endLine,
			snippet,
			quality: comparison.quality,
			distance
		};
	}
	if (!bestMatch) return null;
	return {
		startLine: bestMatch.startLine,
		endLine: bestMatch.endLine,
		snippet: bestMatch.snippet
	};
}
async function rehydratePromotionCandidate(workspaceDir, candidate) {
	const sourcePaths = resolveShortTermSourcePathCandidates(workspaceDir, candidate.path);
	for (const sourcePath of sourcePaths) {
		let rawSource;
		try {
			rawSource = await fs.readFile(sourcePath, "utf-8");
		} catch (err) {
			if (err?.code === "ENOENT") continue;
			throw err;
		}
		const relocated = relocateCandidateRange(rawSource.split(/\r?\n/), candidate);
		if (!relocated) continue;
		return {
			...candidate,
			startLine: relocated.startLine,
			endLine: relocated.endLine,
			snippet: relocated.snippet
		};
	}
	return null;
}
function buildPromotionSection(candidates, nowMs, timezone) {
	const lines = [
		"",
		`## Promoted From Short-Term Memory (${formatMemoryDreamingDay(nowMs, timezone)})`,
		""
	];
	for (const candidate of candidates) {
		const source = `${candidate.path}:${candidate.startLine}-${candidate.endLine}`;
		const snippet = candidate.snippet || "(no snippet captured)";
		lines.push(`<!-- ${PROMOTION_MARKER_PREFIX}${candidate.key} -->`);
		lines.push(`- ${snippet} [score=${candidate.score.toFixed(3)} recalls=${candidate.recallCount} avg=${candidate.avgScore.toFixed(3)} source=${source}]`);
	}
	lines.push("");
	return lines.join("\n");
}
function withTrailingNewline(content) {
	if (!content) return "";
	return content.endsWith("\n") ? content : `${content}\n`;
}
function extractPromotionMarkers(memoryText) {
	const markers = /* @__PURE__ */ new Set();
	const matches = memoryText.matchAll(/<!--\s*openclaw-memory-promotion:([^\n]+?)\s*-->/gi);
	for (const match of matches) {
		const key = match[1]?.trim();
		if (key) markers.add(key);
	}
	return markers;
}
async function applyShortTermPromotions(options) {
	const workspaceDir = options.workspaceDir.trim();
	const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
	const nowIso = new Date(nowMs).toISOString();
	const limit = Number.isFinite(options.limit) ? Math.max(0, Math.floor(options.limit)) : options.candidates.length;
	const minScore = toFiniteScore(options.minScore, DEFAULT_PROMOTION_MIN_SCORE);
	const minRecallCount = toFiniteNonNegativeInt(options.minRecallCount, 3);
	const minUniqueQueries = toFiniteNonNegativeInt(options.minUniqueQueries, 2);
	const maxAgeDays = toFiniteNonNegativeInt(options.maxAgeDays, -1);
	const memoryPath = path.join(workspaceDir, "MEMORY.md");
	return await withShortTermLock(workspaceDir, async () => {
		const store = await readStore(workspaceDir, nowIso);
		const selected = options.candidates.filter((candidate) => {
			if (candidate.promotedAt) return false;
			if (candidate.score < minScore) return false;
			if ((candidate.signalCount ?? Math.max(0, candidate.recallCount) + Math.max(0, candidate.dailyCount ?? 0)) < minRecallCount) return false;
			if (Math.max(candidate.uniqueQueries, candidate.recallDays.length) < minUniqueQueries) return false;
			if (maxAgeDays >= 0 && candidate.ageDays > maxAgeDays) return false;
			if (store.entries[candidate.key]?.promotedAt) return false;
			return true;
		}).slice(0, limit);
		const rehydratedSelected = [];
		for (const candidate of selected) {
			const rehydrated = await rehydratePromotionCandidate(workspaceDir, candidate);
			if (rehydrated) rehydratedSelected.push(rehydrated);
		}
		if (rehydratedSelected.length === 0) return {
			memoryPath,
			applied: 0,
			appended: 0,
			reconciledExisting: 0,
			appliedCandidates: []
		};
		const existingMemory = await fs.readFile(memoryPath, "utf-8").catch((err) => {
			if (err?.code === "ENOENT") return "";
			throw err;
		});
		const existingMarkers = extractPromotionMarkers(existingMemory);
		const alreadyWritten = rehydratedSelected.filter((candidate) => existingMarkers.has(candidate.key));
		const toAppend = rehydratedSelected.filter((candidate) => !existingMarkers.has(candidate.key));
		if (toAppend.length > 0) {
			const header = existingMemory.trim().length > 0 ? "" : "# Long-Term Memory\n\n";
			const section = buildPromotionSection(toAppend, nowMs, options.timezone);
			await fs.writeFile(memoryPath, `${header}${withTrailingNewline(existingMemory)}${section}`, "utf-8");
		}
		for (const candidate of rehydratedSelected) {
			const entry = store.entries[candidate.key];
			if (!entry) continue;
			entry.startLine = candidate.startLine;
			entry.endLine = candidate.endLine;
			entry.snippet = candidate.snippet;
			entry.promotedAt = nowIso;
		}
		store.updatedAt = nowIso;
		await writeStore(workspaceDir, store);
		return {
			memoryPath,
			applied: rehydratedSelected.length,
			appended: toAppend.length,
			reconciledExisting: alreadyWritten.length,
			appliedCandidates: rehydratedSelected
		};
	});
}
function resolveShortTermRecallStorePath(workspaceDir) {
	return resolveStorePath(workspaceDir);
}
function resolveShortTermRecallLockPath(workspaceDir) {
	return resolveLockPath(workspaceDir);
}
async function auditShortTermPromotionArtifacts(params) {
	const workspaceDir = params.workspaceDir.trim();
	const storePath = resolveStorePath(workspaceDir);
	const lockPath = resolveLockPath(workspaceDir);
	const issues = [];
	let exists = false;
	let entryCount = 0;
	let promotedCount = 0;
	let spacedEntryCount = 0;
	let conceptTaggedEntryCount = 0;
	let conceptTagScripts;
	let invalidEntryCount = 0;
	let updatedAt;
	try {
		const raw = await fs.readFile(storePath, "utf-8");
		exists = true;
		if (raw.trim().length === 0) issues.push({
			severity: "warn",
			code: "recall-store-empty",
			message: "Short-term recall store is empty.",
			fixable: true
		});
		else {
			const nowIso = (/* @__PURE__ */ new Date()).toISOString();
			const parsed = JSON.parse(raw);
			const store = normalizeStore(parsed, nowIso);
			updatedAt = store.updatedAt;
			entryCount = Object.keys(store.entries).length;
			promotedCount = Object.values(store.entries).filter((entry) => Boolean(entry.promotedAt)).length;
			spacedEntryCount = Object.values(store.entries).filter((entry) => (entry.recallDays?.length ?? 0) > 1).length;
			conceptTaggedEntryCount = Object.values(store.entries).filter((entry) => (entry.conceptTags?.length ?? 0) > 0).length;
			conceptTagScripts = summarizeConceptTagScriptCoverage(Object.values(store.entries).filter((entry) => (entry.conceptTags?.length ?? 0) > 0).map((entry) => entry.conceptTags ?? []));
			invalidEntryCount = Object.keys(asRecord(parsed)?.entries ?? {}).length - entryCount;
			if (invalidEntryCount > 0) issues.push({
				severity: "warn",
				code: "recall-store-invalid",
				message: `Short-term recall store contains ${invalidEntryCount} invalid entr${invalidEntryCount === 1 ? "y" : "ies"}.`,
				fixable: true
			});
		}
	} catch (err) {
		const code = err.code;
		if (code !== "ENOENT") issues.push({
			severity: "error",
			code: "recall-store-unreadable",
			message: `Short-term recall store is unreadable: ${code ?? "error"}.`,
			fixable: false
		});
	}
	try {
		const stat = await fs.stat(lockPath);
		if (Date.now() - stat.mtimeMs > SHORT_TERM_LOCK_STALE_MS && await canStealStaleLock(lockPath)) issues.push({
			severity: "warn",
			code: "recall-lock-stale",
			message: "Short-term promotion lock appears stale.",
			fixable: true
		});
	} catch (err) {
		const code = err.code;
		if (code !== "ENOENT") issues.push({
			severity: "warn",
			code: "recall-lock-unreadable",
			message: `Short-term promotion lock could not be inspected: ${code ?? "error"}.`,
			fixable: false
		});
	}
	let qmd;
	if (params.qmd) {
		qmd = {
			dbPath: params.qmd.dbPath,
			collections: params.qmd.collections
		};
		if (typeof params.qmd.collections === "number" && params.qmd.collections <= 0) issues.push({
			severity: "warn",
			code: "qmd-collections-empty",
			message: "QMD reports zero managed collections.",
			fixable: false
		});
		const dbPath = params.qmd.dbPath?.trim();
		if (dbPath) try {
			const stat = await fs.stat(dbPath);
			qmd.dbBytes = stat.size;
			if (!stat.isFile() || stat.size <= 0) issues.push({
				severity: "error",
				code: "qmd-index-empty",
				message: "QMD index file exists but is empty.",
				fixable: false
			});
		} catch (err) {
			if (err.code === "ENOENT") issues.push({
				severity: "error",
				code: "qmd-index-missing",
				message: "QMD index file is missing.",
				fixable: false
			});
			else throw err;
		}
	}
	return {
		storePath,
		lockPath,
		updatedAt,
		exists,
		entryCount,
		promotedCount,
		spacedEntryCount,
		conceptTaggedEntryCount,
		...conceptTagScripts ? { conceptTagScripts } : {},
		invalidEntryCount,
		issues,
		...qmd ? { qmd } : {}
	};
}
function asRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value;
}
async function repairShortTermPromotionArtifacts(params) {
	const workspaceDir = params.workspaceDir.trim();
	const nowIso = (/* @__PURE__ */ new Date()).toISOString();
	let rewroteStore = false;
	let removedInvalidEntries = 0;
	let removedStaleLock = false;
	try {
		const lockPath = resolveLockPath(workspaceDir);
		const stat = await fs.stat(lockPath);
		if (Date.now() - stat.mtimeMs > SHORT_TERM_LOCK_STALE_MS && await canStealStaleLock(lockPath)) {
			await fs.unlink(lockPath).catch(() => void 0);
			removedStaleLock = true;
		}
	} catch (err) {
		if (err.code !== "ENOENT") throw err;
	}
	await withShortTermLock(workspaceDir, async () => {
		const storePath = resolveStorePath(workspaceDir);
		try {
			const raw = await fs.readFile(storePath, "utf-8");
			const parsed = raw.trim().length > 0 ? JSON.parse(raw) : emptyStore(nowIso);
			const rawEntries = Object.keys(asRecord(parsed)?.entries ?? {}).length;
			const normalized = normalizeStore(parsed, nowIso);
			removedInvalidEntries = Math.max(0, rawEntries - Object.keys(normalized.entries).length);
			const nextEntries = Object.fromEntries(Object.entries(normalized.entries).map(([key, entry]) => {
				const conceptTags = deriveConceptTags({
					path: entry.path,
					snippet: entry.snippet
				});
				const fallbackDay = normalizeIsoDay(entry.lastRecalledAt) ?? nowIso.slice(0, 10);
				return [key, {
					...entry,
					dailyCount: Math.max(0, Math.floor(entry.dailyCount ?? 0)),
					queryHashes: (entry.queryHashes ?? []).slice(-MAX_QUERY_HASHES),
					recallDays: mergeRecentDistinct(entry.recallDays ?? [], fallbackDay, MAX_RECALL_DAYS),
					conceptTags: conceptTags.length > 0 ? conceptTags : entry.conceptTags ?? []
				}];
			}));
			const comparableStore = {
				version: 1,
				updatedAt: normalized.updatedAt,
				entries: nextEntries
			};
			if (`${JSON.stringify(comparableStore, null, 2)}\n` !== `${raw.trimEnd()}\n`) {
				await writeStore(workspaceDir, {
					...comparableStore,
					updatedAt: nowIso
				});
				rewroteStore = true;
			}
		} catch (err) {
			if (err.code !== "ENOENT") throw err;
		}
	});
	return {
		changed: rewroteStore || removedStaleLock,
		removedInvalidEntries,
		rewroteStore,
		removedStaleLock
	};
}
//#endregion
export { readShortTermRecallEntries as a, repairShortTermPromotionArtifacts as c, rankShortTermPromotionCandidates as i, resolveShortTermRecallLockPath as l, applyShortTermPromotions as n, recordDreamingPhaseSignals as o, auditShortTermPromotionArtifacts as r, recordShortTermRecalls as s, DEFAULT_PROMOTION_MIN_SCORE as t, resolveShortTermRecallStorePath as u };
