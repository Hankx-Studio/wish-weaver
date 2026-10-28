// POST /api/scan — photo quest verdict (M4).
// multipart {photo (≤2MB image), quest_id, target_noun_en, lang?}.
// sam-3.1 segments the target, Spark judges the match (and refuses
// humans/faces). Images live in memory only — never stored, never logged.
// Source is honest: meta_live only when SAM + judge both validate.
//
// NOTE: index.js still mounts postScanHandler (501) until the Leader
// rewires it to createScanHandler (see docs/evidence/m4_wiring.md).
import { z } from "zod";
import { callSpark, extractOutputText } from "../metaClient.js";
import { parseSamOutput, pickBest, clampBox, maskHash, maskPreview } from "../samMask.js";
import { SCAN_JUDGE_SCHEMA, buildScanJudgePrompt, FACE_REFUSAL_LINE, SCAN_FALLBACK_LINE } from "../prompts/scanJudge.js";
import { XP_PER_QUEST } from "../../public/js/config.js";

// 501 stub until wired (M1 scope pattern; app.test.js pins it).
export function postScanHandler(c) {
  return c.json(
    { source: "fallback_fixture", error: "not_implemented", message: "/api/scan ships in a later milestone" },
    501,
  );
}

const ScanTextSchema = z.object({
  quest_id: z.string().min(1).max(64),
  target_noun_en: z.string().min(1).max(40).regex(/^[a-zA-Z][a-zA-Z \-']*$/),
  quest_title: z.string().max(120).optional(),
  lang: z.enum(["zh", "en"]).optional(),
});
const JudgeSchema = z.object({
  matched: z.boolean(),
  human: z.boolean(),
  spirit_line: z.string().min(1).max(120),
});

// Acceptance: >2MB or non-image → 400 (task-specific; the frozen 5MB
// transport cap stays untouched — this is the scan-photo rule).
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const SCAN_ESTIMATE_USD = 0.01;

function magicOk(bytes, mime) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (mime === "image/webp") {
    const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return tag === "RIFF" && webp === "WEBP";
  }
  return false;
}

function clientIp(c) {
  const fwd = c.req.header("x-forwarded-for");
  return (fwd && fwd.split(",")[0].trim()) || "unknown";
}

export function encodeTinyMask(raster, w, h) {
  const tw = Math.min(64, w);
  const th = Math.max(1, Math.round((h * tw) / w));
  const bytes = new Uint8Array(Math.ceil((tw * th) / 8));
  for (let y = 0; y < th; y += 1) {
    for (let x = 0; x < tw; x += 1) {
      const sx = Math.min(w - 1, Math.floor((x * w) / tw));
      const sy = Math.min(h - 1, Math.floor((y * h) / th));
      if (raster[sy * w + sx]) {
        const i = y * tw + x;
        bytes[i >> 3] |= 1 << (7 - (i & 7));
      }
    }
  }
  return { w: tw, h: th, b64: Buffer.from(bytes).toString("base64") };
}

function fallbackScan(reason, questId, opts = {}) {
  return {
    source: "fallback_fixture",
    ok: true,
    matched: false,
    found: false,
    quest_id: questId,
    boxes: [],
    best_box: null,
    mask_rle_preview: null,
    mask_hash: null,
    mask_tiny: null,
    spirit_line: SCAN_FALLBACK_LINE,
    usage: { images_processed: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 },
    xp_awarded: 0,
    reason,
    ...opts,
  };
}

async function callSamOnce({ apiBase, apiKey, model, target, dataUrl, fetchImpl }) {
  const url = `${apiBase.replace(/\/?$/, "").replace(/\/v1$/, "")}/v1/responses`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [{ type: "input_text", text: target }, { type: "input_image", image_url: dataUrl }] }],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 429 || res.status >= 500) {
    const err = new Error(`sam HTTP ${res.status}`);
    err.retryable = true;
    throw err;
  }
  if (!res.ok) throw new Error(`sam HTTP ${res.status}`);
  return res.json();
}

// SAM with ONE backoff retry on 5xx/429 (contract mirrors metaClient).
async function runSam(args) {
  try {
    return await callSamOnce(args);
  } catch (err) {
    if (!err.retryable) throw err;
    await new Promise((r) => setTimeout(r, 500));
    return callSamOnce(args);
  }
}

function samCost(images, prices) {
  return ((images || 0) * (prices?.samPerKImages ?? 2.5)) / 1000;
}

async function runJudge({ config, fetchImpl, dataUrl, questTitle, target, lang }) {
  const payload = {
    model: config.models.text,
    input: [{ role: "user", content: [
      { type: "input_text", text: buildScanJudgePrompt({ questTitle, targetNoun: target, lang }) },
      { type: "input_image", image_url: dataUrl },
    ] }],
    text: { format: { type: "json_schema", name: "scan_judge", schema: SCAN_JUDGE_SCHEMA, strict: true } },
    reasoning: { effort: "low" },
  };
  const call = () => callSpark({ apiBase: config.apiBase, apiKey: config.apiKey, payload, fetchImpl, prices: config.prices });
  const first = await call();
  try {
    return { judge: JudgeSchema.parse(JSON.parse(extractOutputText(first.data))), ...usageOf(first) };
  } catch {
    const second = await call();
    return { judge: JudgeSchema.parse(JSON.parse(extractOutputText(second.data))), ...usageOf(second) };
  }
}

function usageOf({ usage, costUsd, latencyMs }) {
  return { usage, cost: costUsd, latency: latencyMs };
}

async function logUse(budget, entry) {
  try {
    await budget.record(entry);
  } catch {
    // Usage logging must never break the player's response.
  }
}

async function readScanInput(c) {
  let form;
  try {
    form = await c.req.formData();
  } catch {
    return { error: "body must be multipart with a photo field" };
  }
  const photo = form.get("photo");
  const text = ScanTextSchema.safeParse({
    quest_id: form.get("quest_id"),
    target_noun_en: form.get("target_noun_en"),
    quest_title: form.get("quest_title") ?? undefined,
    lang: form.get("lang") ?? undefined,
  });
  const bytes = photo && typeof photo.arrayBuffer === "function" ? new Uint8Array(await photo.arrayBuffer()) : null;
  if (!bytes || !text.success) return { error: "photo, quest_id and target_noun_en are required" };
  if (!ALLOWED_MIME.includes(photo.type) || bytes.length > MAX_PHOTO_BYTES || !magicOk(bytes, photo.type)) {
    return { error: "photo must be JPEG/PNG/WebP and within 2MB" };
  }
  const { quest_id, target_noun_en, quest_title = target_noun_en, lang = "zh" } = text.data;
  return { photo, bytes, quest_id, target_noun_en, quest_title, lang };
}

async function segmentPhase({ config, budget, fetchImpl, target, dataUrl }) {
  const sam = await runSam({
    apiBase: config.apiBase, apiKey: config.apiKey, model: config.models.seg,
    target, dataUrl, fetchImpl,
  });
  const imagesProcessed = sam?.usage?.images_processed ?? 0;
  const cost = samCost(imagesProcessed, config.prices);
  await logUse(budget, {
    ts: new Date().toISOString(), endpoint: "scan", model: config.models.seg,
    inputTokens: 0, outputTokens: 0, images: imagesProcessed,
    costUsd: cost, latencyMs: 0, source: "meta_live",
  });
  const { records } = parseSamOutput(extractOutputText(sam));
  const best = pickBest(records);
  const boxes = records.map((r) => clampBox(r.box)).slice(0, 8);
  const tiny = best?.raster ? encodeTinyMask(best.raster, best.mask.w, best.mask.h) : null;
  const seg = best ? {
    boxes, best_box: clampBox(best.box), mask_rle_preview: maskPreview(best.mask.payload),
    mask_hash: maskHash(best.mask.payload), mask_tiny: tiny,
  } : { boxes, best_box: null, mask_rle_preview: null, mask_hash: null, mask_tiny: null };
  return { seg, imagesProcessed, cost };
}

async function judgePhase({ config, budget, fetchImpl, dataUrl, questTitle, target, lang }) {
  const r = await runJudge({ config, fetchImpl, dataUrl, questTitle, target, lang });
  await logUse(budget, {
    ts: new Date().toISOString(), endpoint: "scan", model: config.models.text,
    inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens,
    images: 0, costUsd: r.cost, latencyMs: 0, source: "meta_live",
  });
  return r;
}

function verdictJson({ quest_id, seg, judge, imagesProcessed, judgeUsage, totalCost }) {
  const usage = {
    images_processed: imagesProcessed, input_tokens: judgeUsage.inputTokens,
    output_tokens: judgeUsage.outputTokens, cost_usd: totalCost,
  };
  if (judge.human) {
    return {
      source: "meta_live", ok: true, matched: false, found: false,
      quest_id, ...seg, spirit_line: FACE_REFUSAL_LINE, human: true, usage, xp_awarded: 0,
    };
  }
  const line = Array.from(judge.spirit_line).length <= 40 ? judge.spirit_line : judge.spirit_line.slice(0, 40);
  return {
    source: "meta_live", ok: true, matched: judge.matched, found: judge.matched,
    quest_id, ...seg, spirit_line: line, usage, xp_awarded: judge.matched ? XP_PER_QUEST : 0,
  };
}

export function createScanHandler({ config, budget, limiter = null, fetchImpl = fetch }) {
  return async (c) => {
    const input = await readScanInput(c);
    if (input.error) return c.json({ error: "invalid_request", message: input.error }, 400);
    const { quest_id, target_noun_en, quest_title, lang, photo, bytes } = input;
    if (limiter) {
      const rl = limiter.check(`scan:${clientIp(c)}`);
      if (!rl.allowed) {
        const res = c.json(fallbackScan("rate_limited", quest_id), 200);
        res.headers.set("Retry-After", String(rl.retryAfterSec));
        return res;
      }
    }
    if (!budget.canSpend(SCAN_ESTIMATE_USD)) {
      return c.json(fallbackScan("budget_exhausted", quest_id), 200);
    }
    const dataUrl = `data:${photo.type};base64,${Buffer.from(bytes).toString("base64")}`;
    let segPhase;
    try {
      segPhase = await segmentPhase({ config, budget, fetchImpl, target: target_noun_en, dataUrl });
    } catch {
      return c.json(fallbackScan("model_unavailable", quest_id), 200);
    }
    let judged;
    try {
      judged = await judgePhase({ config, budget, fetchImpl, dataUrl, questTitle: quest_title, target: target_noun_en, lang });
    } catch {
      return c.json({ ...fallbackScan("model_unavailable", quest_id), ...segPhase.seg }, 200);
    }
    return c.json(verdictJson({
      quest_id, seg: segPhase.seg, judge: judged.judge, imagesProcessed: segPhase.imagesProcessed,
      judgeUsage: judged.usage, totalCost: segPhase.cost + judged.cost,
    }), 200);
  };
}
