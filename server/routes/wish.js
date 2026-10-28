import { callSpark, extractOutputText } from "../metaClient.js";
import {
  WishRequestSchema,
  ModelWishSchema,
  WishReadingSchema,
  clampIntensity,
  mapSafety,
  EFFECT_BY_ELEMENT,
} from "../schemas.js";
import { buildSystemPrompt, BLOCK_LINES, buildHelp } from "../prompts/wish.js";
import { pickFixture, detectLang } from "../fixtures.js";

// Strict JSON schema sent via text.format (enums lock the model's
// free-text habit; intensity/safety are hardened server-side).
export const WISH_MODEL_SCHEMA = {
  type: "object",
  properties: {
    element: { type: "string", enum: ["light", "bloom", "water", "wind", "ember", "star"] },
    mood: { type: "string", enum: ["calm", "warm", "joyful", "tired", "hopeful", "grateful"] },
    intensity: { type: "integer" },
    traits: { type: "array", items: { type: "string" } },
    spirit_line: { type: "string" },
    safety: { type: "string" },
  },
  required: ["element", "mood", "intensity", "traits", "spirit_line", "safety"],
  additionalProperties: false,
};

export function buildWishPayload({ model, ritual, wish }) {
  return {
    model,
    instructions: buildSystemPrompt(),
    input: [{ role: "user", content: [{ type: "input_text", text: `ritual: ${ritual}\nwish: ${wish}` }] }],
    text: { format: { type: "json_schema", name: "wish_reading", schema: WISH_MODEL_SCHEMA, strict: true } },
    reasoning: { effort: "low" },
  };
}

export function parseModelReply(data) {
  const text = extractOutputText(data).replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  return ModelWishSchema.parse(JSON.parse(text));
}

function clientIp(c) {
  const fwd = c.req.header("x-forwarded-for");
  return (fwd && fwd.split(",")[0].trim()) || "unknown";
}

export function createWishHandler({ config, budget, limiter, fetchImpl = fetch }) {
  const finish = (c) => async (reading, headers) => {
    try {
      await budget.record({
        ts: new Date().toISOString(),
        endpoint: "wish",
        model: config.models.text,
        inputTokens: reading.usage.input_tokens,
        outputTokens: reading.usage.output_tokens,
        images: 0,
        costUsd: reading.usage.cost_usd,
        latencyMs: reading.latencyMs ?? 0,
        source: reading.source,
      });
    } catch {
      // Usage logging must never break the player's response.
    }
    const { latencyMs, ...out } = reading;
    const res = c.json(out, 200);
    if (headers) for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
    return res;
  };

  return async (c) => {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_request", message: "body must be JSON" }, 400);
    }
    const parsed = WishRequestSchema.safeParse({ ritual: body?.ritual, wish: body?.wish });
    if (!parsed.success) {
      return c.json({ error: "invalid_request", message: "ritual must be meal|gratitude|bedtime|free, wish 1..120 chars" }, 400);
    }
    const { ritual, wish } = parsed.data;
    const lang = detectLang(wish);
    const done = finish(c);
    const fallback = (reason, headers) => done({ ...pickFixture({ lang }), reason, latencyMs: 0 }, headers);

    const rl = limiter.check(`wish:${clientIp(c)}`);
    if (!rl.allowed) return fallback("rate_limited", { "Retry-After": String(rl.retryAfterSec) });
    if (!budget.canSpend(config.wishEstimateUsd)) return fallback("budget_exhausted");

    let attempt;
    try {
      attempt = await runModelTwice({ config, ritual, wish, fetchImpl });
    } catch {
      return fallback("model_unavailable");
    }
    const reading = toReading(attempt, lang);
    if (!reading) return fallback("model_unavailable");
    return done(reading);
  };
}

// One model call + one retake when the reply fails zod; throws when both fail.
async function runModelTwice({ config, ritual, wish, fetchImpl }) {
  const payload = buildWishPayload({ model: config.models.text, ritual, wish });
  const call = () => callSpark({ apiBase: config.apiBase, apiKey: config.apiKey, payload, fetchImpl, prices: config.prices });
  const first = await call();
  try {
    return { model: parseModelReply(first.data), ...resultOf(first) };
  } catch {
    const second = await call();
    return { model: parseModelReply(second.data), ...resultOf(second) };
  }
}

function resultOf({ usage, costUsd, latencyMs }) {
  return { usage, cost: costUsd, latency: latencyMs };
}

// Server owns safety mapping, intensity clamp, effect mapping, block/support.
function toReading({ model, usage, cost, latency }, lang) {
  const safety = mapSafety(model.safety);
  const reading = {
    source: "meta_live",
    element: model.element,
    mood: model.mood,
    intensity: clampIntensity(model.intensity),
    traits: model.traits,
    spirit_line: safety === "block" ? BLOCK_LINES[lang] : model.spirit_line,
    effect: EFFECT_BY_ELEMENT[model.element],
    safety,
    usage: { input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, cost_usd: cost },
    latencyMs: latency,
  };
  if (safety === "support") reading.help = buildHelp(lang);
  return WishReadingSchema.safeParse(stripLatency(reading)).success ? reading : null;
}

function stripLatency(reading) {
  const { latencyMs, ...rest } = reading;
  return rest;
}
