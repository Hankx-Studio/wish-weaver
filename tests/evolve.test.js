import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { loadConfig } from "../server/config.js";
import { createBudget } from "../server/budget.js";
import { createRateLimiter } from "../server/rateLimit.js";
import { createEvolveHandler, buildStage1Prompt, buildEditPrompt } from "../server/routes/evolve.js";
import { drawFamily, familyWeights } from "../server/evolveFamily.js";

let dir;
let usageFile;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "evolve-"));
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

const FAKE_B64 = Buffer.from("fakepngbytes").toString("base64");

function sparkBody(story) {
  return {
    usage: { input_tokens: 40, output_tokens: 60, total_tokens: 100 },
    output: [
      { type: "reasoning", status: "completed" },
      { type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify({ story }) }] },
    ],
  };
}

function imageBody() {
  return { created: 1, data: [{ b64_json: FAKE_B64 }], output_format: "webp" };
}

// fetchImpl routing by URL: Responses API -> story, images/* -> picture.
function mockFetch({ story = ["光球輕輕裂開了。", "小精靈誕生了。"], storyFirstBad = false, imageStatus = 200 } = {}) {
  let calls = { story: 0, image: 0 };
  const fn = async (url, init) => {
    const u = String(url);
    if (u.includes("/v1/responses")) {
      calls.story += 1;
      const body = storyFirstBad && calls.story === 1 ? { bogus: true } : sparkBody(story);
      return new Response(JSON.stringify(body), { status: 200 });
    }
    if (u.includes("/v1/images/")) {
      calls.image += 1;
      if (imageStatus !== 200) return new Response("err", { status: imageStatus });
      return new Response(JSON.stringify(imageBody()), { status: 200 });
    }
    throw new Error(`unexpected url ${u}`);
  };
  fn.calls = () => calls;
  return fn;
}

function evolveApp({ config, budget, fetchImpl, max = 6 }) {
  const app = new Hono();
  app.post("/api/evolve", createEvolveHandler({ config, budget, limiter: createRateLimiter({ windowMs: 86400_000, max }), fetchImpl }));
  return app;
}

const post = (app, payload, ip = "9.9.9.9") =>
  app.request("/api/evolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(payload),
  });

const BASE_BODY = { to_stage: 1, xp: 30, crystals: { bloom: 3 }, traits: ["garden"], player_id: "kid1" };

describe("family draw", () => {
  it("is deterministic for the same seed", () => {
    const a = drawFamily({ crystals: { bloom: 5, light: 2 }, playerId: "kid1", stage: 2 });
    const b = drawFamily({ crystals: { bloom: 5, light: 2 }, playerId: "kid1", stage: 2 });
    assert.deepEqual(a, b);
  });

  it("leans flower on bloom-heavy crystals", () => {
    const { weights } = drawFamily({ crystals: { bloom: 10 }, playerId: "x", stage: 1 });
    assert.ok(weights.flower > weights.animal && weights.flower > weights.abstract_light);
  });

  it("weights sum sanely with empty crystals", () => {
    const w = familyWeights({});
    assert.deepEqual(Object.keys(w).sort(), ["abstract_light", "animal", "fairy", "flower"]);
    assert.ok(Object.values(w).every((v) => v === 1));
  });
});

describe("POST /api/evolve", () => {
  it("stage1 success returns meta_live with image + story", async () => {
    const config = testConfig();
    const app = evolveApp({ config, budget: await testBudget(config), fetchImpl: mockFetch() });
    const res = await post(app, BASE_BODY);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, "meta_live");
    assert.equal(body.ok, true);
    assert.equal(body.keep, false);
    assert.equal(body.stage, 1);
    assert.equal(body.image_b64, FAKE_B64);
    assert.ok(body.image_urn);
    assert.equal(body.story.length, 2);
    assert.ok(body.usage.cost_usd > 0);
  });

  it("rejects bad input with 400 and never calls the model", async () => {
    const config = testConfig();
    const fetchImpl = mockFetch();
    const app = evolveApp({ config, budget: await testBudget(config), fetchImpl });
    const bads = [
      { ...BASE_BODY, to_stage: 4 },
      { ...BASE_BODY, xp: 10 },
      { ...BASE_BODY, to_stage: 2, xp: 90 },
      { ...BASE_BODY, to_stage: 3, xp: 200 },
    ];
    for (const bad of bads) {
      const res = await post(app, bad);
      assert.equal(res.status, 400);
    }
    assert.deepEqual(fetchImpl.calls(), { story: 0, image: 0 });
  });

  it("rejects oversized prev_image with 413", async () => {
    const config = testConfig();
    const fetchImpl = mockFetch();
    const app = evolveApp({ config, budget: await testBudget(config), fetchImpl });
    const big = "A".repeat(2_100_000);
    const res = await post(app, { ...BASE_BODY, to_stage: 2, xp: 90, prev_image: big });
    assert.equal(res.status, 413);
    assert.deepEqual(fetchImpl.calls(), { story: 0, image: 0 });
  });

  it("image failure keeps image+XP with fallback", async () => {
    const config = testConfig();
    const app = evolveApp({ config, budget: await testBudget(config), fetchImpl: mockFetch({ imageStatus: 500 }) });
    const res = await post(app, BASE_BODY);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, "fallback_fixture");
    assert.equal(body.ok, false);
    assert.equal(body.keep, true);
    assert.equal(body.image_b64, null);
    assert.equal(body.story.length, 2);
  });

  it("budget refusal never calls the model and keeps", async () => {
    const config = testConfig({ DAILY_BUDGET_USD: "0", TOTAL_BUDGET_USD: "0" });
    const fetchImpl = mockFetch();
    const app = evolveApp({ config, budget: await testBudget(config), fetchImpl });
    const body = await (await post(app, BASE_BODY)).json();
    assert.equal(body.source, "fallback_fixture");
    assert.equal(body.reason, "budget_exhausted");
    assert.equal(body.keep, true);
    assert.deepEqual(fetchImpl.calls(), { story: 0, image: 0 });
  });

  it("rate limit returns keep fallback with Retry-After", async () => {
    const config = testConfig();
    const app = evolveApp({ config, budget: await testBudget(config), fetchImpl: mockFetch(), max: 1 });
    assert.equal((await (await post(app, BASE_BODY, "7.7.7.7")).json()).source, "meta_live");
    const second = await post(app, BASE_BODY, "7.7.7.7");
    const body = await second.json();
    assert.equal(body.reason, "rate_limited");
    assert.equal(body.keep, true);
    assert.ok(second.headers.get("Retry-After"));
  });

  it("recovers when the story retry returns good JSON", async () => {
    const config = testConfig();
    const fetchImpl = mockFetch({ storyFirstBad: true });
    const app = evolveApp({ config, budget: await testBudget(config), fetchImpl });
    const body = await (await post(app, BASE_BODY)).json();
    assert.equal(body.source, "meta_live");
    assert.equal(fetchImpl.calls().story, 2);
  });

  it("writes usage without player text or image", async () => {
    const config = testConfig();
    const app = evolveApp({ config, budget: await testBudget(config), fetchImpl: mockFetch() });
    await post(app, { ...BASE_BODY, traits: ["超秘密xyz"] });
    const logged = await readFile(usageFile, "utf8");
    assert.ok(!logged.includes("超秘密"));
    assert.ok(!logged.includes(FAKE_B64));
    assert.ok(logged.includes("evolve-image"));
    assert.ok(logged.includes("evolve-story"));
  });
});

describe("prompt builders", () => {
  it("stage1 mentions family and style lock", () => {
    const p = buildStage1Prompt({ family: "animal", traits: ["star"] });
    assert.match(p, /guardian-beast/);
    assert.match(p, /transparent background/);
  });

  it("edits demand identity continuity and only new traits", () => {
    const p = buildEditPrompt({ traits: ["star"] });
    assert.match(p, /same face/);
    assert.match(p, /ONLY add/);
  });
});
