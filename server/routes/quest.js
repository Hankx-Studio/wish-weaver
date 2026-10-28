// POST /api/quest — daily scan quest (M4).
// Tries Spark once (+1 retry) from the player's dominant element, else a
// server-owned template. Source is honest: meta_live only for a validated
// model quest, otherwise fallback_fixture. Budget-out still answers 200.
//
// NOTE: index.js still mounts postQuestHandler (501) until the Leader
// rewires it to createQuestHandler (see docs/evidence/m4_wiring.md).
import { z } from "zod";
import { callSpark, extractOutputText } from "../metaClient.js";
import {
  QUEST_MODEL_SCHEMA,
  buildQuestPrompt,
  pickFallbackQuest,
  questIdFor,
} from "../prompts/quest.js";

// 501 stub until its milestone is wired (M1 scope pattern; app.test.js pins it).
export function postQuestHandler(c) {
  return c.json(
    { source: "fallback_fixture", error: "not_implemented", message: "/api/quest ships in a later milestone" },
    501,
  );
}

const ELEMENTS = ["light", "bloom", "water", "wind", "ember", "star"];
const QuestBodySchema = z.object({
  element: z.enum(ELEMENTS).optional(),
  lang: z.enum(["zh", "en"]).optional(),
  kindness: z.boolean().optional(),
});
const ModelQuestSchema = z.object({
  title: z.string().min(1).max(60),
  hint: z.string().min(1).max(200),
  target_noun_en: z.string().min(1).max(40),
  element: z.enum(ELEMENTS),
  kind: z.enum(["normal", "kindness"]),
});
const NOUN_RE = /^[a-z][a-z \-']{0,39}$/;

// Local cost estimate (a short structured Spark call, M0-measured scale).
const QUEST_ESTIMATE_USD = 0.005;

function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function clientIp(c) {
  const fwd = c.req.header("x-forwarded-for");
  return (fwd && fwd.split(",")[0].trim()) || "unknown";
}

function toQuest(model, day) {
  if (!NOUN_RE.test(model.target_noun_en.trim().toLowerCase())) return null;
  if (Array.from(model.title).length > 40) return null;
  const kind = model.kind;
  const id = questIdFor(day, model.element, kind);
  return {
    id,
    quest_id: id,
    title: model.title,
    text: model.title,
    hint: model.hint,
    target_noun_en: model.target_noun_en.trim().toLowerCase(),
    element: model.element,
    kind,
  };
}

function fixtureQuest({ element, lang, kindness }, day) {
  const f = pickFallbackQuest({ element, lang, kindness });
  const id = questIdFor(day, f.element, f.kind);
  return {
    source: "fallback_fixture",
    quest: {
      id,
      quest_id: id,
      title: f.title,
      text: f.title,
      hint: f.hint,
      target_noun_en: f.target_noun_en,
      element: f.element,
      kind: f.kind,
    },
  };
}

export function createQuestHandler({ config, budget, fetchImpl = fetch, limiter = null }) {
  return async (c) => {
    let body = {};
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_request", message: "body must be JSON" }, 400);
    }
    const parsed = QuestBodySchema.safeParse(body || {});
    if (!parsed.success) {
      return c.json({ error: "invalid_request", message: "element/lang/kindness invalid" }, 400);
    }
    const { element = "ember", lang = "zh", kindness = false } = parsed.data;
    const day = todayKey();

    if (limiter) {
      const rl = limiter.check(`quest:${clientIp(c)}`);
      if (!rl.allowed) {
        const res = c.json({ ...fixtureQuest({ element, lang, kindness }, day), reason: "rate_limited" }, 200);
        res.headers.set("Retry-After", String(rl.retryAfterSec));
        return res;
      }
    }
    if (!budget.canSpend(QUEST_ESTIMATE_USD)) {
      return c.json({ ...fixtureQuest({ element, lang, kindness }, day), reason: "budget_exhausted" }, 200);
    }

    const payload = {
      model: config.models.text,
      instructions: buildQuestPrompt({ element, lang, kindness }),
      input: [{ role: "user", content: [{ type: "input_text", text: `element: ${element}` }] }],
      text: { format: { type: "json_schema", name: "daily_quest", schema: QUEST_MODEL_SCHEMA, strict: true } },
      reasoning: { effort: "low" },
    };
    const call = () => callSpark({
      apiBase: config.apiBase,
      apiKey: config.apiKey,
      payload,
      fetchImpl,
      prices: config.prices,
    });
    let quest = null;
    let usage = null;
    try {
      for (let attempt = 0; attempt < 2 && !quest; attempt += 1) {
        const { data, usage: u, costUsd, latencyMs } = await call();
        usage = { ...u, costUsd, latencyMs };
        try {
          const raw = extractOutputText(data).replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
          const model = ModelQuestSchema.parse(JSON.parse(raw));
          quest = toQuest(model, day);
        } catch {
          quest = null;
        }
      }
    } catch {
      quest = null;
    }
    if (!quest) {
      return c.json({ ...fixtureQuest({ element, lang, kindness }, day), reason: "model_unavailable" }, 200);
    }
    try {
      await budget.record({
        ts: new Date().toISOString(),
        endpoint: "quest",
        model: config.models.text,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        images: 0,
        costUsd: usage.costUsd,
        latencyMs: usage.latencyMs ?? 0,
        source: "meta_live",
      });
    } catch {
      // Usage logging must never break the player's response.
    }
    return c.json({ source: "meta_live", quest }, 200);
  };
}
