import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { loadConfig } from "../server/config.js";
import { createBudget } from "../server/budget.js";
import { createRateLimiter } from "../server/rateLimit.js";
import { createQuestHandler } from "../server/routes/quest.js";

let dir;
let usageFile;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "quest-"));
  usageFile = path.join(dir, "usage.jsonl");
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function testConfig(over = {}) {
  return loadConfig({ MODEL_API_KEY: "test-key", USAGE_FILE: usageFile, ...over });
}

async function testBudget(config) {
  const b = createBudget({ dailyCap: config.budget.dailyCap, totalCap: config.budget.totalCap, usageFile });
  await b.load();
  return b;
}

function modelFetch(replyJson) {
  let calls = 0;
  const fn = async () => {
    calls += 1;
    const data = typeof replyJson === "function" ? replyJson(calls) : replyJson;
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  fn.calls = () => calls;
  return fn;
}

function sparkBody(modelJson) {
  return {
    usage: { input_tokens: 40, output_tokens: 120, total_tokens: 160 },
    output: [
      { type: "reasoning", status: "completed" },
      { type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(modelJson) }] },
    ],
  };
}

const goodQuest = {
  title: "找一個裝水的杯子",
  hint: "水杯、茶杯或水壺都可以。",
  target_noun_en: "cup",
  element: "water",
  kind: "normal",
};

function questApp({ config, budget, fetchImpl, limiter }) {
  const app = new Hono();
  app.post("/api/quest", createQuestHandler({ config, budget, fetchImpl, limiter }));
  return app;
}

const postQuest = (app, payload, ip = "9.9.9.9") =>
  app.request("/api/quest", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(payload),
  });

describe("POST /api/quest", () => {
  it("returns a meta_live quest for a good model reply", async () => {
    const config = testConfig();
    const app = questApp({ config, budget: await testBudget(config), fetchImpl: modelFetch(sparkBody(goodQuest)) });
    const res = await postQuest(app, { element: "water", lang: "zh" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, "meta_live");
    assert.match(body.quest.id, /^q-\d{4}-\d{2}-\d{2}-water-normal$/);
    assert.equal(body.quest.quest_id, body.quest.id);
    assert.equal(body.quest.text, body.quest.title);
    assert.equal(body.quest.target_noun_en, "cup");
    assert.equal(body.quest.element, "water");
  });

  it("rejects invalid input with 400 and never calls the model", async () => {
    const config = testConfig();
    const fetchImpl = modelFetch(sparkBody(goodQuest));
    const app = questApp({ config, budget: await testBudget(config), fetchImpl });
    for (const bad of [{ element: "fire" }, { element: "water", lang: "jp" }, "not-json"]) {
      const res = await app.request("/api/quest", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "1.1.1.1" },
        body: typeof bad === "string" ? bad : JSON.stringify(bad),
      });
      assert.equal(res.status, 400);
    }
    assert.equal(fetchImpl.calls(), 0);
  });

  it("falls back after two bad model replies", async () => {
    const config = testConfig();
    const fetchImpl = modelFetch(sparkBody({ ...goodQuest, target_noun_en: "杯子!!" }));
    const app = questApp({ config, budget: await testBudget(config), fetchImpl });
    const res = await postQuest(app, {});
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, "fallback_fixture");
    assert.equal(body.reason, "model_unavailable");
    assert.ok(body.quest.id && body.quest.text && body.quest.hint);
    assert.equal(fetchImpl.calls(), 2);
  });

  it("falls back without a model call when the budget is out", async () => {
    const config = testConfig({ DAILY_BUDGET_USD: "0", TOTAL_BUDGET_USD: "0" });
    const fetchImpl = modelFetch(sparkBody(goodQuest));
    const app = questApp({ config, budget: await testBudget(config), fetchImpl });
    const body = await (await postQuest(app, { element: "bloom" })).json();
    assert.equal(body.source, "fallback_fixture");
    assert.equal(body.reason, "budget_exhausted");
    assert.equal(body.quest.element, "bloom");
    assert.equal(fetchImpl.calls(), 0);
  });

  it("rate-limits per IP with fallback + Retry-After", async () => {
    const config = testConfig();
    const limiter = createRateLimiter({ windowMs: 3600_000, max: 1 });
    const app = questApp({
      config,
      budget: await testBudget(config),
      fetchImpl: modelFetch(sparkBody(goodQuest)),
      limiter,
    });
    const first = await (await postQuest(app, {}, "5.5.5.5")).json();
    assert.equal(first.source, "meta_live");
    const second = await postQuest(app, {}, "5.5.5.5");
    assert.equal(second.status, 200);
    assert.equal((await second.json()).reason, "rate_limited");
    assert.ok(second.headers.get("Retry-After"));
  });

  it("writes quest usage without leaking request details", async () => {
    const config = testConfig();
    const app = questApp({ config, budget: await testBudget(config), fetchImpl: modelFetch(sparkBody(goodQuest)) });
    await postQuest(app, { element: "star" });
    const logged = await readFile(usageFile, "utf8");
    assert.ok(logged.includes('"endpoint":"quest"'));
    assert.ok(logged.includes("meta_live"));
  });
});
