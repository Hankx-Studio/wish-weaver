// POST /api/evolve (M3). Frozen contract: docs/API_CONTRACT.md §evolve.
// Request: {to_stage:1|2|3, xp, crystals, traits, player_id, prev_image?}.
// Server checks the XP gate (30/90/180), draws the morph family, calls
// muse-image generations (stage1) or edits (stage2/3, prev image required),
// asks Spark for a 2-line story, and goes through budget + rate limit +
// usage log. Any model failure -> {ok:false, keep:true} (keep image + XP).
// All zod schemas live in this file (server/schemas.js is M1-frozen).
import { z } from "zod";
import { STYLE_LOCK, IDENTITY_KEEP } from "../prompts/styleLock.js";
import { drawFamily, familyFragment } from "../evolveFamily.js";
import { buildEvolveStoryPayload } from "../prompts/evolveStory.js";
import { callSpark, extractOutputText, MetaError } from "../metaClient.js";

// GAME_SPEC §4 gates (30/90/180). server/config.js is M1-owned, so the
// frozen values are duplicated here and must match public/js/config.js.
const STAGE_XP = { 1: 30, 2: 90, 3: 180 };
const MAX_PREV_BYTES = 1.5 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 20000;
const STORY_EST_USD = 0.005;

// Pre-mount stub (M1): server/index.js still mounts this until the Leader
// applies docs/evidence/m3_wiring.md. Remove after the mount swap.
export function postEvolveHandler(c) {
  return c.json(
    { source: "fallback_fixture", error: "not_implemented", message: "/api/evolve ships in a later milestone" },
    501,
  );
}

const EvolveRequestSchema = z.object({
  to_stage: z.number().int().min(1).max(3),
  xp: z.number().int().nonnegative(),
  crystals: z.record(z.string(), z.number().int().nonnegative()).default({}),
  traits: z.array(z.string().min(1).max(40)).max(5).default([]),
  player_id: z.string().min(1).max(64).default("anon"),
  prev_image: z.string().min(1).optional(),
});
const StoryReplySchema = z.object({
  story: z.array(z.string().min(1).max(120)).length(2),
}).refine((v) => v.story.join("").length <= 80, { message: "story over 80 chars" });
const IMAGE_SIZE = "512x512";

const FIXTURE_STORY = {
  fairy: ["光球輕輕裂開，露出一雙好奇的眼睛。", "小精靈有了翅膀，迫不及待想見你。"],
  animal: ["光球裡傳來細細的呼嚕聲。", "一隻圓滾滾的小守護獸探出頭來。"],
  flower: ["光球表面浮現小小的花苞。", "花苞綻開，香香的花精靈誕生了。"],
  abstract_light: ["光球變得更亮，微微顫動。", "一道小小的光，學會了對你微笑。"],
};

function traitLine(traits) {
  if (!traits.length) return "a subtle new glow of growing light";
  return `new motifs of ${traits.join(", ")}`;
}

export function buildStage1Prompt({ family, traits }) {
  return `${STYLE_LOCK}, ${familyFragment(family)}, ${traitLine(traits)}`;
}

export function buildEditPrompt({ traits }) {
  return `${IDENTITY_KEEP} ONLY add: ${traitLine(traits)}. ${STYLE_LOCK}`;
}

function b64ByteLength(b64) {
  const clean = b64.includes(",") ? b64.split(",").pop() : b64;
  return Math.floor(clean.length * 3 / 4);
}

function detectMime(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x52 && buf[1] === 0x49) return "image/webp";
  return "image/png";
}

function clientIp(c) {
  const fwd = c.req.header("x-forwarded-for");
  return (fwd && fwd.split(",")[0].trim()) || "unknown";
}

function estimateUsd(config) {
  return config.prices.imagePerPic + STORY_EST_USD;
}

function fallbackBody({ stage, family, reason }) {
  return {
    source: "fallback_fixture", ok: false, keep: true, stage, family,
    image_b64: null, image_urn: null, story: FIXTURE_STORY[family] || FIXTURE_STORY.fairy,
    reason, usage: { input_tokens: 0, output_tokens: 0, images: 0, cost_usd: 0 },
  };
}

// One image call + one retake on 429/5xx (20s timeout each). Throws MetaError.
async function callImageOnce({ apiBase, apiKey, imageModel, kind, prompt, imageBuf, mime, fetchImpl }) {
  const base = apiBase.replace(/\/?$/, "").replace(/\/v1$/, "");
  const url = kind === "edits" ? `${base}/v1/images/edits` : `${base}/v1/images/generations`;
  let init;
  if (kind === "edits") {
    const fd = new FormData();
    fd.set("model", imageModel);
    fd.set("prompt", prompt);
    fd.set("image", new Blob([imageBuf], { type: mime }), "prev.png");
    init = { method: "POST", headers: {}, body: fd };
  } else {
    init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: imageModel, prompt, size: IMAGE_SIZE }),
    };
  }
  let lastErr = new MetaError("network", "image request failed");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let res;
    try {
      res = await fetchImpl(url, { ...init, headers: { Authorization: `Bearer ${apiKey}`, ...init.headers }, signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    } catch {
      lastErr = new MetaError("network", "image request failed");
      break;
    }
    if (res.status === 429 || res.status >= 500) {
      lastErr = new MetaError("http_5xx", `image HTTP ${res.status}`, res.status);
      continue;
    }
    if (!res.ok) throw new MetaError("bad_request", `image HTTP ${res.status}`, res.status);
    const data = await res.json().catch(() => null);
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new MetaError("bad_response", "no b64_json in image response");
    return b64;
  }
  throw lastErr;
}

function parseStory(data) {
  const text = extractOutputText(data).replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  return StoryReplySchema.parse(JSON.parse(text));
}

// Story first (cheap, fail fast): one call + one retake on zod failure.
async function runStory({ config, stage, family, crystals, traits, fetchImpl }) {
  const payload = buildEvolveStoryPayload({ model: config.models.text, stage, family, crystals, traits });
  const call = () => callSpark({ apiBase: config.apiBase, apiKey: config.apiKey, payload, fetchImpl, prices: config.prices });
  const first = await call();
  try {
    return { story: parseStory(first.data).story, usage: first.usage, cost: first.costUsd, latency: first.latencyMs };
  } catch {
    const second = await call();
    return { story: parseStory(second.data).story, usage: second.usage, cost: second.costUsd, latency: second.latencyMs };
  }
}

async function logUsage(budget, entry) {
  try {
    await budget.record(entry);
  } catch {
    // Usage logging must never break the player's response.
  }
}

export function createEvolveHandler({ config, budget, limiter, fetchImpl = fetch }) {
  const done = (c, body, headers) => {
    const res = c.json(body, 200);
    if (headers) for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
    return res;
  };

  return async (c) => {
    let raw;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: "invalid_request", message: "body must be JSON" }, 400);
    }
    const parsed = EvolveRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "invalid_request", message: "to_stage 1..3, xp, crystals, traits[<=5], prev_image for stage>=2" }, 400);
    }
    const { to_stage: stage, xp, crystals, traits, player_id: playerId, prev_image: prev } = parsed.data;
    if (xp < STAGE_XP[stage]) {
      return c.json({ error: "xp_gate", message: `stage ${stage} needs ${STAGE_XP[stage]} XP` }, 400);
    }
    if (stage >= 2 && !prev) {
      return c.json({ error: "invalid_request", message: "prev_image is required for stage>=2" }, 400);
    }
    let prevBuf = null;
    if (prev) {
      if (b64ByteLength(prev) > MAX_PREV_BYTES) {
        return c.json({ error: "too_large", message: "prev_image exceeds 1.5MB" }, 413);
      }
      try {
        prevBuf = Buffer.from(prev.includes(",") ? prev.split(",").pop() : prev, "base64");
      } catch {
        return c.json({ error: "invalid_request", message: "prev_image is not valid base64" }, 400);
      }
      if (!prevBuf.length) {
        return c.json({ error: "invalid_request", message: "prev_image is not valid base64" }, 400);
      }
    }

    const { family } = drawFamily({ crystals, playerId, stage });
    const fail = (reason, headers) => done(c, fallbackBody({ stage, family, reason }), headers);

    const rl = limiter.check(`evolve:${clientIp(c)}`);
    if (!rl.allowed) return fail("rate_limited", { "Retry-After": String(rl.retryAfterSec) });
    if (!budget.canSpend(estimateUsd(config))) return fail("budget_exhausted");

    let storyRun;
    try {
      storyRun = await runStory({ config, stage, family, crystals, traits, fetchImpl });
    } catch {
      return fail("model_unavailable");
    }

    let imageB64;
    try {
      const prompt = stage === 1
        ? buildStage1Prompt({ family, traits })
        : buildEditPrompt({ traits });
      imageB64 = await callImageOnce({
        apiBase: config.apiBase, apiKey: config.apiKey, imageModel: config.models.image,
        kind: stage === 1 ? "generations" : "edits", prompt,
        imageBuf: prevBuf, mime: prevBuf ? detectMime(prevBuf) : "image/png", fetchImpl,
      });
    } catch {
      return fail("model_unavailable");
    }

    const imageCost = config.prices.imagePerPic;
    const ts = new Date().toISOString();
    await logUsage(budget, {
      ts, endpoint: "evolve-story", model: config.models.text,
      inputTokens: storyRun.usage.inputTokens, outputTokens: storyRun.usage.outputTokens,
      images: 0, costUsd: storyRun.cost, latencyMs: storyRun.latency, source: "meta_live",
    });
    await logUsage(budget, {
      ts, endpoint: "evolve-image", model: config.models.image,
      inputTokens: 0, outputTokens: 0, images: 1, costUsd: imageCost, latencyMs: 0, source: "meta_live",
    });
    return done(c, {
      source: "meta_live", ok: true, keep: false, stage, family,
      image_b64: imageB64, image_urn: `local:stage${stage}:${playerId}`,
      story: storyRun.story,
      usage: {
        input_tokens: storyRun.usage.inputTokens, output_tokens: storyRun.usage.outputTokens,
        images: 1, cost_usd: storyRun.cost + imageCost,
      },
    });
  };
}
