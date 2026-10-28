import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { loadConfig } from "../server/config.js";
import { createBudget } from "../server/budget.js";
import { createRateLimiter } from "../server/rateLimit.js";
import { createTranscribeHandler } from "../server/routes/transcribe.js";

let dir;
let usageFile;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "tx-"));
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

// Mono 16-bit WAV at the given rate, `seconds` long (silence).
function wavBytes(seconds = 1, rate = 24000) {
  const n = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  return buf;
}

function txForm(bytes, type = "audio/wav") {
  const fd = new FormData();
  fd.set("audio", new File([bytes], "wish.wav", { type }));
  return fd;
}

function txApp({ config, budget, fetchImpl, limiter }) {
  const app = new Hono();
  app.post("/api/transcribe", createTranscribeHandler({ config, budget, fetchImpl, limiter }));
  return app;
}

const postTx = (app, form, ip = "9.9.9.9") =>
  app.request("/api/transcribe", { method: "POST", headers: { "x-forwarded-for": ip }, body: form });

// Mock ASR: asserts the multipart contract (request JSON + wav audio part).
function asrFetch({ transcript = "謝謝今天的晚餐", ms = 2000, status = 200 } = {}) {
  let calls = 0;
  const fn = async (url, init) => {
    calls += 1;
    assert.match(url, /\/v1\/asr\/transcribe$/);
    assert.match(init.headers.Authorization || "", /^Bearer /);
    const form = init.body;
    assert.equal(form.get("request").type, "application/json");
    const req = JSON.parse(await form.get("request").text());
    assert.equal(req.audioEncoding, "WAV");
    assert.equal(req.model, "muse-voice-transcribe-1.0");
    assert.equal(form.get("audio").type, "audio/wav");
    if (status !== 200) return new Response("{}", { status });
    return new Response(JSON.stringify({ sessionId: "s-1", transcript, audioDurationMs: ms, turns: [] }), { status: 200 });
  };
  fn.calls = () => calls;
  return fn;
}

describe("POST /api/transcribe", () => {
  it("returns meta_live transcript for valid WAV", async () => {
    const config = testConfig();
    const fetchImpl = asrFetch();
    const app = txApp({ config, budget: await testBudget(config), fetchImpl });
    const res = await postTx(app, txForm(wavBytes(1)));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, "meta_live");
    assert.equal(body.transcript, "謝謝今天的晚餐");
    assert.equal(body.audioDurationMs, 2000);
    assert.equal(body.usage.seconds, 2);
    assert.ok(body.usage.cost_usd > 0 && body.usage.cost_usd < 0.01);
    assert.equal(fetchImpl.calls(), 1);
  });

  it("handles empty transcripts gracefully (200 + reason)", async () => {
    const config = testConfig();
    const app = txApp({ config, budget: await testBudget(config), fetchImpl: asrFetch({ transcript: "  ", ms: 2000 }) });
    const body = await (await postTx(app, txForm(wavBytes(1)))).json();
    assert.equal(body.source, "meta_live");
    assert.equal(body.transcript, "");
    assert.equal(body.reason, "empty_transcript");
  });

  it("rejects missing, non-WAV, corrupt and oversize audio with 400", async () => {
    const config = testConfig();
    const fetchImpl = asrFetch();
    const app = txApp({ config, budget: await testBudget(config), fetchImpl });
    const bad = new TextEncoder().encode("not audio");
    const corrupt = wavBytes(1); corrupt[22] = 2; // stereo: server wants mono
    const cases = [
      txForm(bad, "text/plain"),
      txForm(bad, "audio/wav"),
      txForm(corrupt),
      txForm(wavBytes(1), "audio/webm"),
      txForm(wavBytes(31)),
    ];
    const big = Buffer.alloc(3 * 1024 * 1024); big.write("RIFF", 0);
    cases.push(txForm(big));
    for (const form of cases) {
      assert.equal((await postTx(app, form)).status, 400);
    }
    assert.equal(fetchImpl.calls(), 0);
  });

  it("falls back on budget-out, rate-limit and model failure", async () => {
    const spent = testConfig({ DAILY_BUDGET_USD: "0", TOTAL_BUDGET_USD: "0" });
    const fetchImpl = asrFetch();
    const poor = txApp({ config: spent, budget: await testBudget(spent), fetchImpl });
    const body = await (await postTx(poor, txForm(wavBytes(1)))).json();
    assert.equal(body.source, "fallback_fixture");
    assert.equal(body.reason, "budget_exhausted");
    assert.equal(fetchImpl.calls(), 0);

    const config = testConfig();
    const limited = txApp({
      config, budget: await testBudget(config), fetchImpl,
      limiter: createRateLimiter({ windowMs: 3600_000, max: 1 }),
    });
    await postTx(limited, txForm(wavBytes(1)), "7.7.7.7");
    const rl = await postTx(limited, txForm(wavBytes(1)), "7.7.7.7");
    assert.equal(rl.status, 200);
    assert.equal((await rl.json()).reason, "rate_limited");
    assert.ok(rl.headers.get("Retry-After"));

    const dead = txApp({ config, budget: await testBudget(config), fetchImpl: asrFetch({ status: 500 }) });
    const down = await (await postTx(dead, txForm(wavBytes(1)))).json();
    assert.equal(down.source, "fallback_fixture");
    assert.equal(down.reason, "model_unavailable");
  });

  it("logs transcribe usage with seconds but never audio", async () => {
    const config = testConfig();
    const app = txApp({ config, budget: await testBudget(config), fetchImpl: asrFetch() });
    await postTx(app, txForm(wavBytes(1)));
    const logged = await readFile(usageFile, "utf8");
    assert.ok(logged.includes('"endpoint":"transcribe"'));
    assert.ok(!logged.includes("base64") && !logged.includes("RIFF"));
  });
});
