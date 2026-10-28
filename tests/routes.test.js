import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { loadConfig } from "../server/config.js";
import { createBudget } from "../server/budget.js";
import { createRateLimiter } from "../server/rateLimit.js";
import { createHealthHandler } from "../server/routes/health.js";
import { createWishHandler } from "../server/routes/wish.js";
import { BLOCK_LINES } from "../server/prompts/wish.js";
import { WishReadingSchema } from "../server/schemas.js";

let dir;
let usageFile;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "routes-"));
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

function modelFetch(replyJson, usage = { input_tokens: 33, output_tokens: 100 }) {
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
    usage: { input_tokens: 33, output_tokens: 100, total_tokens: 133 },
    output: [
      { type: "reasoning", status: "completed" },
      { type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(modelJson) }] },
    ],
  };
}

const goodModel = {
  element: "ember",
  mood: "grateful",
  intensity: 8,
  traits: ["warm", "family"],
  spirit_line: "謝謝今天的晚餐，暖暖的。",
  safety: "safe",
};

function wishApp({ config, budget, fetchImpl, limiter }) {
  const app = new Hono();
  app.get("/api/health", createHealthHandler({ config, budget }));
  app.post("/api/wish", createWishHandler({ config, budget, limiter, fetchImpl }));
  return app;
}

const postWish = (app, payload, ip = "9.9.9.9") =>
  app.request("/api/wish", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(payload),
  });

describe("POST /api/wish", () => {
  it("returns meta_live for a good model reply (intensity clamped)", async () => {
    const config = testConfig();
    const app = wishApp({ config, budget: await testBudget(config), fetchImpl: modelFetch(sparkBody(goodModel)), limiter: createRateLimiter({ windowMs: 3600_000, max: 30 }) });
    const res = await postWish(app, { ritual: "meal", wish: "謝謝今天的晚餐" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(WishReadingSchema.safeParse(body).success, true);
    assert.equal(body.source, "meta_live");
    assert.equal(body.intensity, 3);
    assert.equal(body.effect, "glow");
    assert.equal(body.safety, "none");
    assert.ok(body.usage.cost_usd > 0);
  });

  it("rejects invalid input with 400 and never calls the model", async () => {
    const config = testConfig();
    const fetchImpl = modelFetch(sparkBody(goodModel));
    const app = wishApp({ config, budget: await testBudget(config), fetchImpl, limiter: createRateLimiter({ windowMs: 3600_000, max: 30 }) });
    for (const bad of [{ ritual: "party", wish: "hi" }, { ritual: "free", wish: "" }, "not-json"]) {
      const res = await app.request("/api/wish", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "1.1.1.1" },
        body: typeof bad === "string" ? bad : JSON.stringify(bad),
      });
      assert.equal(res.status, 400);
    }
    assert.equal(fetchImpl.calls(), 0);
  });

  it("retries a bad model reply once, then falls back", async () => {
    const config = testConfig();
    const fetchImpl = modelFetch(sparkBody({ ...goodModel, element: "番茄炒蛋" }));
    const app = wishApp({ config, budget: await testBudget(config), fetchImpl, limiter: createRateLimiter({ windowMs: 3600_000, max: 30 }) });
    const res = await postWish(app, { ritual: "free", wish: "hello world" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, "fallback_fixture");
    assert.equal(body.reason, "model_unavailable");
    assert.equal(fetchImpl.calls(), 2);
  });

  it("recovers when the retry returns good JSON", async () => {
    const config = testConfig();
    const fetchImpl = modelFetch((n) => (n === 1 ? sparkBody({ bogus: true }) : sparkBody(goodModel)));
    const app = wishApp({ config, budget: await testBudget(config), fetchImpl, limiter: createRateLimiter({ windowMs: 3600_000, max: 30 }) });
    const res = await postWish(app, { ritual: "free", wish: "謝謝" });
    const body = await res.json();
    assert.equal(body.source, "meta_live");
    assert.equal(fetchImpl.calls(), 2);
  });

  it("returns fallback when budget is exhausted without calling the model", async () => {
    const config = testConfig({ DAILY_BUDGET_USD: "0", TOTAL_BUDGET_USD: "0" });
    const fetchImpl = modelFetch(sparkBody(goodModel));
    const app = wishApp({ config, budget: await testBudget(config), fetchImpl, limiter: createRateLimiter({ windowMs: 3600_000, max: 30 }) });
    const res = await postWish(app, { ritual: "free", wish: "謝謝" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, "fallback_fixture");
    assert.equal(body.reason, "budget_exhausted");
    assert.equal(fetchImpl.calls(), 0);
  });

  it("rate-limits per IP with fallback + Retry-After", async () => {
    const config = testConfig({ LIMIT_WISH_PER_HOUR: "1" });
    const app = wishApp({
      config,
      budget: await testBudget(config),
      fetchImpl: modelFetch(sparkBody(goodModel)),
      limiter: createRateLimiter({ windowMs: 3600_000, max: 1 }),
    });
    const first = await postWish(app, { ritual: "free", wish: "謝謝" }, "5.5.5.5");
    assert.equal((await first.json()).source, "meta_live");
    const second = await postWish(app, { ritual: "free", wish: "謝謝" }, "5.5.5.5");
    assert.equal(second.status, 200);
    assert.equal((await second.json()).reason, "rate_limited");
    assert.ok(second.headers.get("Retry-After"));
    const other = await postWish(app, { ritual: "free", wish: "謝謝" }, "6.6.6.6");
    assert.equal((await other.json()).source, "meta_live");
  });

  it("block maps to the fixed refusal line", async () => {
    const config = testConfig();
    const app = wishApp({ config, budget: await testBudget(config), fetchImpl: modelFetch(sparkBody({ ...goodModel, safety: "block: sexual content" })), limiter: createRateLimiter({ windowMs: 3600_000, max: 30 }) });
    const body = await (await postWish(app, { ritual: "free", wish: "謝謝" })).json();
    assert.equal(body.safety, "block");
    assert.equal(body.spirit_line, BLOCK_LINES.zh);
    assert.equal(body.source, "meta_live");
  });

  it("support appends the helpline field", async () => {
    const config = testConfig();
    const app = wishApp({ config, budget: await testBudget(config), fetchImpl: modelFetch(sparkBody({ ...goodModel, safety: "the user seems self-harm" })), limiter: createRateLimiter({ windowMs: 3600_000, max: 30 }) });
    const body = await (await postWish(app, { ritual: "free", wish: "好累" })).json();
    assert.equal(body.safety, "support");
    assert.match(body.help, /1925/);
  });

  it("writes usage without player text", async () => {
    const config = testConfig();
    const secret = "超秘密心意xyz123";
    const app = wishApp({ config, budget: await testBudget(config), fetchImpl: modelFetch(sparkBody(goodModel)), limiter: createRateLimiter({ windowMs: 3600_000, max: 30 }) });
    await postWish(app, { ritual: "free", wish: secret });
    const logged = await readFile(usageFile, "utf8");
    assert.ok(!logged.includes(secret));
    assert.ok(logged.includes("meta_live"));
  });
});

describe("GET /api/health", () => {
  it("matches the frozen contract shape", async () => {
    const config = testConfig();
    const app = wishApp({ config, budget: await testBudget(config), fetchImpl: modelFetch({}), limiter: createRateLimiter({ windowMs: 1, max: 1 }) });
    const res = await app.request("/api/health");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.version, "1.0");
    assert.deepEqual(Object.keys(body.budget).sort(), ["daily_cap_usd", "daily_used_usd"]);
    assert.deepEqual(Object.keys(body.models).sort(), ["asr", "image", "seg", "text"]);
    assert.ok(!JSON.stringify(body).includes("test-key"));
  });
});
