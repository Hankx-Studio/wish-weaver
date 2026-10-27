// M0 probe: real requests against Meta Model API, one record per call.
// Run: npm run probe   (needs .env with MODEL_API_KEY; key is never logged)
// Writes docs/evidence/probe_results.json (truncated shapes, no key, no image bytes).
// Images go to data/probe/ (gitignored). Total cost target: < $0.5.
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const BASE = process.env.META_API_BASE || "https://api.meta.ai/v1";
const API = BASE.replace(/\/v1$/, ""); // endpoint paths below already start with /v1
const KEY = process.env.MODEL_API_KEY || "";
const TEXT = process.env.MODEL_TEXT || "muse-spark-1.3";
const IMAGE = process.env.MODEL_IMAGE || "muse-image-1.0";
const SEG = process.env.MODEL_SEG || "sam-3.1";
const ASR = process.env.MODEL_ASR || "muse-voice-transcribe-1.0";
const OUT = "docs/evidence/probe_results.json";
const PROBE_DIR = "data/probe";
const WISH = "謝謝今天的晚餐，媽媽煮了我最愛吃的番茄炒蛋。";
const TIMEOUT_MS = 60000;

if (!KEY) {
  console.error("probe: MODEL_API_KEY is empty (.env missing?). Nothing sent.");
  process.exit(2);
}

const results = [];
function record(entry) {
  results.push(entry);
  const flag = entry.http_status ? `HTTP ${entry.http_status}` : `ERR ${entry.error}`;
  console.log(`[${results.length}] ${entry.name}: ${flag} ${entry.latency_ms}ms`);
}

async function timedFetch(name, model, url, init, shape) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const latency_ms = Date.now() - t0;
    const ct = res.headers.get("content-type") || "";
    let body = null;
    if (ct.includes("json")) body = await res.json().catch(() => null);
    else body = (await res.text()).slice(0, 2000);
    record({
      name, model, endpoint: new URL(url).pathname,
      http_status: res.status, latency_ms,
      usage: body && typeof body === "object" ? (body.usage ?? null) : null,
      response_shape_truncated: shape(body),
      notes: "",
    });
    return { res, body };
  } catch (err) {
    record({
      name, model, endpoint: new URL(url).pathname,
      http_status: 0, latency_ms: Date.now() - t0,
      usage: null, response_shape_truncated: null,
      error: String(err?.cause?.code || err?.message || err).slice(0, 200),
      notes: "network/blocked — no request reached the API",
    });
    return { res: null, body: null };
  }
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${KEY}`, ...extra };
}

function shapeOf(body, max = 1200) {
  if (body == null) return null;
  const s = typeof body === "string" ? body : JSON.stringify(body);
  return s.length > max ? s.slice(0, max) + `…[truncated ${s.length - max} chars]` : s;
}

// --- 1. Spark structured output (Responses API: text.format) ---
const wishSchema = {
  type: "object",
  properties: {
    element: { type: "string" },
    mood: { type: "string" },
    intensity: { type: "integer" },
    traits: { type: "array", items: { type: "string" } },
    spirit_line: { type: "string" },
    effect: { type: "string" },
    safety: { type: "string" },
  },
  required: ["element", "mood", "intensity", "traits", "spirit_line", "effect", "safety"],
  additionalProperties: false,
};

async function sparkStructured(effort) {
  const payload = {
    model: TEXT,
    input: [{ role: "user", content: [{ type: "input_text", text: `心意：${WISH}\n請輸出 JSON。` }] }],
    text: { format: { type: "json_schema", name: "wish_reading", schema: wishSchema, strict: true } },
    reasoning: { effort },
  };
  return timedFetch(`spark-structured-${effort}`, TEXT, `${API}/v1/responses`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  }, shapeOf);
}

// --- 2. Spark image input (thumbnail of fairy.webp) ---
async function sparkImage() {
  const buf = await readFile("public/assets/fairy.webp");
  const b64 = buf.toString("base64"); // full file; API decides thumbnailing
  const payload = {
    model: TEXT,
    input: [{ role: "user", content: [
      { type: "input_text", text: "描述這張圖的主角外觀（30字內）。" },
      { type: "input_image", image_url: `data:image/webp;base64,${b64}` },
    ] }],
    reasoning: { effort: "low" },
  };
  return timedFetch("spark-image-input", TEXT, `${API}/v1/responses`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  }, shapeOf);
}

// --- 3. Spark reasoning effort compare: minimal / low / medium ---
// NOTE (from https://dev.meta.ai/docs/reasoning.md): "none" returns HTTP 400
// for Spark/Wonder, so the comparison uses minimal/low/medium, not none/low/medium.

// --- 4. Image: generations then edits (OpenAI Images compatible) ---
async function imageGen() {
  const payload = { model: IMAGE, prompt: "Tiny cozy firefly fairy in a night garden, pastel, cute", size: "512x512" };
  const t0 = Date.now();
  try {
    const res = await fetch(`${API}/v1/images/generations`, {
      method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload), signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.json().catch(() => null);
    let saved = null;
    const b64 = body?.data?.[0]?.b64_json;
    if (b64) {
      await mkdir(PROBE_DIR, { recursive: true });
      saved = path.join(PROBE_DIR, "gen1.webp");
      await writeFile(saved, Buffer.from(b64, "base64"));
    }
    record({
      name: "image-generations", model: IMAGE, endpoint: "/v1/images/generations",
      http_status: res.status, latency_ms: Date.now() - t0, usage: body?.usage ?? null,
      response_shape_truncated: shapeOf(body ? { ...body, data: "[image bytes saved]" } : null),
      notes: saved ? `saved ${saved}` : "no image returned",
    });
    return saved;
  } catch (err) {
    record({
      name: "image-generations", model: IMAGE, endpoint: "/v1/images/generations",
      http_status: 0, latency_ms: Date.now() - t0, usage: null,
      response_shape_truncated: null,
      error: String(err?.cause?.code || err?.message || err).slice(0, 200),
      notes: "network/blocked",
    });
    return null;
  }
}

async function imageEdit(srcPath) {
  if (!srcPath) {
    record({
      name: "image-edits", model: IMAGE, endpoint: "/v1/images/edits",
      http_status: 0, latency_ms: 0, usage: null, response_shape_truncated: null,
      error: "skipped", notes: "no generation output to edit",
    });
    return;
  }
  const t0 = Date.now();
  try {
    const fd = new FormData();
    fd.set("model", IMAGE);
    fd.set("prompt", "Add a thin ring of starlight around the fairy, keep the same character");
    fd.set("image", new Blob([await readFile(srcPath)], { type: "image/webp" }), "gen1.webp");
    const res = await fetch(`${API}/v1/images/edits`, {
      method: "POST", headers: authHeaders(), body: fd,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.json().catch(() => null);
    let saved = null;
    const b64 = body?.data?.[0]?.b64_json;
    if (b64) {
      saved = path.join(PROBE_DIR, "edit1.webp");
      await writeFile(saved, Buffer.from(b64, "base64"));
    }
    record({
      name: "image-edits", model: IMAGE, endpoint: "/v1/images/edits",
      http_status: res.status, latency_ms: Date.now() - t0, usage: body?.usage ?? null,
      response_shape_truncated: shapeOf(body ? { ...body, data: "[image bytes saved]" } : null),
      notes: saved ? `saved ${saved}; compare with gen1 for identity continuity` : "no image returned",
    });
  } catch (err) {
    record({
      name: "image-edits", model: IMAGE, endpoint: "/v1/images/edits",
      http_status: 0, latency_ms: Date.now() - t0, usage: null, response_shape_truncated: null,
      error: String(err?.cause?.code || err?.message || err).slice(0, 200),
      notes: "network/blocked",
    });
  }
}

// --- 5. SAM 3.1: segment "bread" in vignettes.webp via Responses API ---
async function samProbe() {
  const buf = await readFile("public/assets/vignettes.webp");
  const payload = {
    model: SEG,
    input: [{ role: "user", content: [
      { type: "input_text", text: "bread" },
      { type: "input_image", image_url: `data:image/webp;base64,${buf.toString("base64")}` },
    ] }],
  };
  return timedFetch("sam-segment-bread", SEG, `${API}/v1/responses`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  }, (b) => shapeOf(b) + " | mask format TBD: RLE/PNG/polygon?");
}

// --- 6. Voice transcribe: say -> wav -> POST /v1/asr/transcribe ---
async function voiceProbe() {
  await mkdir(PROBE_DIR, { recursive: true });
  const aiff = path.join(PROBE_DIR, "hello.aiff");
  const wav = path.join(PROBE_DIR, "hello.wav");
  try {
    // NOTE: macOS `say` is blocked in this sandbox (0-byte output), so we
    // synthesize a 2s tone with ffmpeg to validate endpoint mechanics.
    // Re-run with `say -v Tingting` outside the sandbox to verify transcripts.
    await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
      "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", "-map_metadata", "-1", wav]);
  } catch (err) {
    record({
      name: "voice-transcribe", model: ASR, endpoint: "/v1/asr/transcribe",
      http_status: 0, latency_ms: 0, usage: null, response_shape_truncated: null,
      error: String(err?.message || err).slice(0, 200), notes: "ffmpeg convert failed; upload step blocked",
    });
    return;
  }
  const t0 = Date.now();
  try {
    const fd = new FormData();
    // File-upload schema: audioEncoding is the enum "WAV" (PCM_* is realtime
    // only) and `model` is required. Ref: /docs/api-reference/voice/schemas.
    fd.set("request", new Blob([JSON.stringify({ model: ASR, audioEncoding: "WAV", mode: "PUSH_TO_TALK" })], { type: "application/json" }));
    fd.set("audio", new Blob([await readFile(wav)], { type: "audio/wav" }), "hello.wav");
    const sessionId = `m0-${Date.now()}`;
    const res = await fetch(`${API}/v1/asr/transcribe?sessionId=${sessionId}`, {
      method: "POST", headers: authHeaders(), body: fd,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.json().catch(() => null);
    record({
      name: "voice-transcribe", model: ASR, endpoint: "/v1/asr/transcribe",
      http_status: res.status, latency_ms: Date.now() - t0, usage: body?.usage ?? null,
      response_shape_truncated: shapeOf(body),
      notes: `wav ${(await readFile(wav)).length} bytes, mono 16-bit 24kHz`,
    });
  } catch (err) {
    record({
      name: "voice-transcribe", model: ASR, endpoint: "/v1/asr/transcribe",
      http_status: 0, latency_ms: Date.now() - t0, usage: null, response_shape_truncated: null,
      error: String(err?.cause?.code || err?.message || err).slice(0, 200),
      notes: "audio prepared locally; upload network/blocked",
    });
  }
}

const ONLY = (process.argv[2] || "").split(",").filter(Boolean);
async function maybe(name, fn) {
  if (ONLY.length === 0 || ONLY.some((k) => name.includes(k))) return fn();
  console.log(`skip ${name} (--only filter)`);
}
await maybe("spark-structured", () => sparkStructured("minimal"));
await maybe("spark-structured", () => sparkStructured("low"));
await maybe("spark-structured", () => sparkStructured("medium"));
await maybe("spark-image", sparkImage);
await maybe("image", () => imageGen().then(imageEdit));
await maybe("sam", samProbe);
await maybe("voice", voiceProbe);

await mkdir(path.dirname(OUT), { recursive: true });
let prior = [];
try {
  prior = JSON.parse(await readFile(OUT, "utf8")).results ?? [];
} catch { /* first run */ }
const seen = new Set(results.map((r) => r.name));
const merged = [...results, ...prior.filter((r) => !seen.has(r.name))];
await writeFile(OUT, JSON.stringify({ base: BASE, models: { TEXT, IMAGE, SEG, ASR }, results: merged }, null, 2) + "\n");
console.log(`wrote ${OUT} (${results.length} records)`);
