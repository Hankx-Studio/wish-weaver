import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { loadConfig } from "../server/config.js";
import { createBudget } from "../server/budget.js";
import { createRateLimiter } from "../server/rateLimit.js";
import { createScanHandler } from "../server/routes/scan.js";
import { parseSamOutput, pickBest, decodeMaskSafe, clampBox, maskHash } from "../server/samMask.js";
import { FACE_REFUSAL_LINE } from "../server/prompts/scanJudge.js";

let dir;
let usageFile;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "scan-"));
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

// Routes fetch by payload model: sam-3.1 vs muse-spark-1.3.
function scanFetch({ samText, judgeJson, samStatus = 200, judgeStatus = 200 }) {
  let calls = 0;
  const fn = async (_url, init) => {
    calls += 1;
    const payload = JSON.parse(init.body);
    const isSam = payload.model === "sam-3.1";
    const status = isSam ? samStatus : judgeStatus;
    if (status !== 200) return new Response("{}", { status });
    const body = isSam
      ? { usage: { images_processed: 1 }, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: samText }] }] }
      : {
          usage: { input_tokens: 1200, output_tokens: 60, total_tokens: 1260 },
          output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(judgeJson) }] }],
        };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  fn.calls = () => calls;
  return fn;
}

// Real one_bit mask vector (4x4 checker, reference-verified).
const WIRE_MASK = `<0f>0<|box;x1=10;y1=20;x2=60;y2=80;w=200;h=200|><|mask;x=0;y=0;data=4,4,!!!!!'h[P6vGJ|>`;
const WIRE_BOX_ONLY = `<0f>0<|box;x1=10;y1=20;x2=60;y2=80;w=200;h=200|><|mask;x=0;y=0;data=4,4,~not valid!!|>`;
const GOOD_JUDGE = { matched: true, human: false, spirit_line: "這個杯子暖暖的，寶物 get！" };

function jpegBytes(size) {
  const b = new Uint8Array(size);
  b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[3] = 0xe0;
  return b;
}

function scanForm({ bytes, type = "image/jpeg", name = "p.jpg", questId = "q-2026-10-31-water-normal", target = "cup" }) {
  const fd = new FormData();
  fd.set("photo", new File([bytes], name, { type }));
  fd.set("quest_id", questId);
  fd.set("target_noun_en", target);
  return fd;
}

function scanApp({ config, budget, fetchImpl, limiter }) {
  const app = new Hono();
  app.post("/api/scan", createScanHandler({ config, budget, fetchImpl, limiter }));
  return app;
}

const postScan = (app, form, ip = "9.9.9.9") =>
  app.request("/api/scan", { method: "POST", headers: { "x-forwarded-for": ip }, body: form });

describe("POST /api/scan", () => {
  it("returns meta_live +20 XP on a matched photo with a mask", async () => {
    const config = testConfig();
    const fetchImpl = scanFetch({ samText: WIRE_MASK, judgeJson: GOOD_JUDGE });
    const app = scanApp({ config, budget: await testBudget(config), fetchImpl });
    const res = await postScan(app, scanForm({ bytes: jpegBytes(5000) }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, "meta_live");
    assert.equal(body.ok, true);
    assert.equal(body.matched, true);
    assert.equal(body.found, true);
    assert.equal(body.boxes.length, 1);
    assert.deepEqual(body.boxes[0], { x1: 10, y1: 20, x2: 60, y2: 80, w: 200, h: 200 });
    assert.deepEqual(body.best_box, body.boxes[0]);
    assert.ok(body.mask_rle_preview.startsWith("!!!!!"));
    assert.match(body.mask_hash, /^[0-9a-f]{8}$/);
    assert.deepEqual([body.mask_tiny.w, body.mask_tiny.h], [4, 4]);
    assert.ok(typeof body.mask_tiny.b64 === "string" && body.mask_tiny.b64.length > 0);
    assert.equal(body.spirit_line, GOOD_JUDGE.spirit_line);
    assert.equal(body.xp_awarded, 20);
    assert.equal(body.usage.images_processed, 1);
    assert.ok(body.usage.cost_usd > 0);
    assert.equal(fetchImpl.calls(), 2);
  });

  it("rejects non-images and oversize photos with 400", async () => {
    const config = testConfig();
    const fetchImpl = scanFetch({ samText: WIRE_MASK, judgeJson: GOOD_JUDGE });
    const app = scanApp({ config, budget: await testBudget(config), fetchImpl });
    const textBytes = new TextEncoder().encode("hello, not an image");
    const cases = [
      scanForm({ bytes: textBytes, type: "text/plain", name: "x.txt" }),
      scanForm({ bytes: textBytes, type: "image/jpeg" }),
      scanForm({ bytes: jpegBytes(3 * 1024 * 1024) }),
    ];
    for (const form of cases) {
      const res = await postScan(app, form);
      assert.equal(res.status, 400);
    }
    assert.equal(fetchImpl.calls(), 0);
  });

  it("falls back to the box when the mask cannot decode", async () => {
    const config = testConfig();
    const fetchImpl = scanFetch({ samText: WIRE_BOX_ONLY, judgeJson: GOOD_JUDGE });
    const app = scanApp({ config, budget: await testBudget(config), fetchImpl });
    const body = await (await postScan(app, scanForm({ bytes: jpegBytes(5000) }))).json();
    assert.equal(body.source, "meta_live");
    assert.equal(body.matched, true);
    assert.equal(body.boxes.length, 1);
    // samMask unit level: undecodable mask still yields the box record.
    const { records } = parseSamOutput(WIRE_BOX_ONLY);
    assert.equal(records.length, 1);
    assert.equal(decodeMaskSafe(records[0].mask), null);
    const best = pickBest(records);
    assert.ok(best && best.raster === null);
    assert.deepEqual([best.box.x1, best.box.y1], [10, 20]);
  });

  it("refuses humans with the fixed line, no XP, no treasure", async () => {
    const config = testConfig();
    const fetchImpl = scanFetch({
      samText: WIRE_MASK,
      judgeJson: { matched: false, human: true, spirit_line: "有看到人喔" },
    });
    const app = scanApp({ config, budget: await testBudget(config), fetchImpl });
    const body = await (await postScan(app, scanForm({ bytes: jpegBytes(5000) }))).json();
    assert.equal(body.source, "meta_live");
    assert.equal(body.matched, false);
    assert.equal(body.human, true);
    assert.equal(body.spirit_line, FACE_REFUSAL_LINE);
    assert.equal(body.xp_awarded, 0);
  });

  it("falls back when the judge fails twice, keeping the segmentation", async () => {
    const config = testConfig();
    const fetchImpl = scanFetch({ samText: WIRE_MASK, judgeJson: { bogus: true } });
    const app = scanApp({ config, budget: await testBudget(config), fetchImpl });
    const body = await (await postScan(app, scanForm({ bytes: jpegBytes(5000) }))).json();
    assert.equal(body.source, "fallback_fixture");
    assert.equal(body.reason, "model_unavailable");
    assert.equal(body.matched, false);
    assert.equal(body.boxes.length, 1);
    assert.equal(fetchImpl.calls(), 3);
  });

  it("falls back when SAM is down without calling the judge", async () => {
    const config = testConfig();
    const fetchImpl = scanFetch({ samText: "", judgeJson: GOOD_JUDGE, samStatus: 500 });
    const app = scanApp({ config, budget: await testBudget(config), fetchImpl });
    const body = await (await postScan(app, scanForm({ bytes: jpegBytes(5000) }))).json();
    assert.equal(body.source, "fallback_fixture");
    assert.equal(body.reason, "model_unavailable");
    assert.equal(body.boxes.length, 0);
    assert.equal(fetchImpl.calls(), 2);
  });

  it("falls back on budget-out and rate-limit without model calls", async () => {
    const spent = testConfig({ DAILY_BUDGET_USD: "0", TOTAL_BUDGET_USD: "0" });
    const fetchImpl = scanFetch({ samText: WIRE_MASK, judgeJson: GOOD_JUDGE });
    const poor = scanApp({ config: spent, budget: await testBudget(spent), fetchImpl });
    const body = await (await postScan(poor, scanForm({ bytes: jpegBytes(5000) }))).json();
    assert.equal(body.source, "fallback_fixture");
    assert.equal(body.reason, "budget_exhausted");
    assert.equal(fetchImpl.calls(), 0);

    const config = testConfig();
    const limited = scanApp({
      config,
      budget: await testBudget(config),
      fetchImpl,
      limiter: createRateLimiter({ windowMs: 3600_000, max: 1 }),
    });
    await postScan(limited, scanForm({ bytes: jpegBytes(5000) }), "7.7.7.7");
    const res = await postScan(limited, scanForm({ bytes: jpegBytes(5000) }), "7.7.7.7");
    assert.equal(res.status, 200);
    assert.equal((await res.json()).reason, "rate_limited");
    assert.ok(res.headers.get("Retry-After"));
  });

  it("logs scan usage with images but never the photo", async () => {
    const config = testConfig();
    const fetchImpl = scanFetch({ samText: WIRE_MASK, judgeJson: GOOD_JUDGE });
    const app = scanApp({ config, budget: await testBudget(config), fetchImpl });
    await postScan(app, scanForm({ bytes: jpegBytes(5000) }));
    const logged = await readFile(usageFile, "utf8");
    assert.ok(logged.includes('"endpoint":"scan"'));
    assert.ok(!logged.includes("base64"));
  });
});

describe("samMask unit", () => {
  it("decodes the embedded one_bit vector to its raster", async () => {
    const { decodeMask: dec } = await import("../server/samMask.js");
    const got = dec({ encoding: "one_bit", payload: "!!!!!'h[P6vGJ", w: 4, h: 4 });
    assert.deepEqual(Array.from(got), [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1]);
  });

  it("tiny mask round-trips through the server encoder", async () => {
    const { encodeTinyMask } = await import("../server/routes/scan.js");
    const { tinyToRaster } = await import("../public/js/maskCut.js");
    const src = [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1];
    const tiny = encodeTinyMask(new Uint8Array(src), 4, 4);
    assert.deepEqual(Array.from(tinyToRaster(tiny)), src);
  });

  it("clamps boxes to the frame and hashes payloads stably", () => {
    const box = clampBox({ x1: -5, y1: 10, x2: 999, y2: 999, w: 200, h: 100 });
    assert.deepEqual([box.x1, box.y1, box.x2, box.y2], [0, 10, 200, 100]);
    assert.equal(maskHash("abc"), maskHash("abc"));
    assert.match(maskHash("abc"), /^[0-9a-f]{8}$/);
  });

  it("analyzes wire text and plans pixel crops", async () => {
    const { analyzeSegmentation, cutPlanFor } = await import("../public/js/maskCut.js");
    const seg = analyzeSegmentation(WIRE_MASK);
    assert.ok(seg && seg.raster && seg.raster.length === 16);
    assert.equal(analyzeSegmentation("nope"), null);
    const plan = cutPlanFor({ x1: 10, y1: 20, x2: 60, y2: 80, w: 200, h: 200 }, 200, 200, 400, 400);
    assert.deepEqual(plan, { sx: 20, sy: 40, sw: 100, sh: 120 });
  });

  it("picks the dominant element and builds treasure records", async () => {
    const { dominantElement } = await import("../public/js/views/scan.js");
    const { buildTreasure } = await import("../public/js/treasureStore.js");
    assert.equal(dominantElement({ crystals: { light: 1, water: 3 } }), "water");
    assert.equal(dominantElement({ crystals: {} }), "ember");
    const t = buildTreasure({
      questId: "q-1", title: "找杯子", cutoutDataUrl: "data:image/png;base64,xx",
      maskHash: "deadbeef", spiritLine: "暖暖的", source: "meta_live",
    });
    assert.ok(t.id.startsWith("q-1:deadbeef:"));
    assert.equal(t.source, "meta_live");
    assert.ok(t.createdAt);
  });

  it("skips malformed records without throwing", () => {
    const { records, warnings } = parseSamOutput("<0f>0<|box;x1=1|>,1<|nonsense|>");
    assert.equal(records.length, 0);
    assert.ok(warnings.length >= 1);
    assert.equal(pickBest([]), null);
  });
});
