// M5 robustness: 20 concurrent /api/wish in-process (sandbox blocks
// listen(), so app.request is the sanctioned path). Mock fetchImpl —
// no real model spend. Asserts: no crash, all-200, rate-limit + Retry-After,
// budget guard, usage rows. Exit non-zero on any failure.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadConfig } from "../server/config.js";
import { createBudget } from "../server/budget.js";
import { createApp } from "../server/index.js";

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures += 1;
}

function sparkMock(delayMs = 8) {
  const fn = async () => {
    await new Promise((r) => setTimeout(r, delayMs));
    const reply = {
      element: "ember", mood: "grateful", intensity: 2,
      traits: ["warm"], spirit_line: "暖暖的一句", safety: "none",
    };
    return new Response(JSON.stringify({
      usage: { input_tokens: 360, output_tokens: 540, total_tokens: 900 },
      output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify(reply) }] }],
    }), { status: 200 });
  };
  return fn;
}

async function buildApp({ fetchImpl, over = {} }) {
  const dir = await mkdtemp(path.join(tmpdir(), "load-"));
  const usageFile = path.join(dir, "usage.jsonl");
  const config = loadConfig({ MODEL_API_KEY: "test-key", USAGE_FILE: usageFile, ...over });
  const budget = createBudget({ dailyCap: config.budget.dailyCap, totalCap: config.budget.totalCap, usageFile });
  await budget.load();
  return { app: createApp({ config, budget, fetchImpl }), dir, usageFile };
}

const wish = (ip) => ({
  method: "POST",
  headers: { "content-type": "application/json", "x-forwarded-for": ip },
  body: JSON.stringify({ ritual: "gratitude", wish: "謝謝今天的晚餐" }),
});

// 1. Burst: 20 concurrent wishes on distinct IPs.
{
  const { app, dir, usageFile } = await buildApp({ fetchImpl: sparkMock() });
  const t0 = Date.now();
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) => app.request("/api/wish", wish(`10.1.0.${i + 1}`))),
  );
  const ms = Date.now() - t0;
  const bodies = await Promise.all(results.map((r) => r.json()));
  check("burst: all 20 return HTTP 200", results.every((r) => r.status === 200), `${ms}ms`);
  check("burst: all 20 are meta_live", bodies.every((b) => b.source === "meta_live"));
  check("burst: usage logged 20 rows", (await readFile(usageFile, "utf8")).trim().split("\n").length === 20);
  await rm(dir, { recursive: true, force: true });
}

// 2. Per-IP limit: 5/hr app, 7 sequential same-IP wishes.
{
  const { app, dir } = await buildApp({ fetchImpl: sparkMock(1), over: { LIMIT_WISH_PER_HOUR: "5" } });
  const out = [];
  for (let i = 0; i < 7; i += 1) out.push(await (await app.request("/api/wish", wish("9.9.9.9"))).json());
  const limited = out.slice(5);
  check("limit: first 5 pass", out.slice(0, 5).every((b) => b.source === "meta_live"));
  check("limit: 6th+ fall back rate_limited", limited.every((b) => b.reason === "rate_limited"));
  const probe = await app.request("/api/wish", wish("9.9.9.9"));
  check("limit: Retry-After header present", probe.headers.get("Retry-After") !== null);
  await rm(dir, { recursive: true, force: true });
}

// 3. Budget-out: zero caps, model must not be touched.
{
  let calls = 0;
  const counting = async (...a) => { calls += 1; return sparkMock(1)(...a); };
  const { app, dir } = await buildApp({ fetchImpl: counting, over: { DAILY_BUDGET_USD: "0", TOTAL_BUDGET_USD: "0" } });
  const body = await (await app.request("/api/wish", wish("8.8.8.8"))).json();
  check("budget: falls back budget_exhausted", body.source === "fallback_fixture" && body.reason === "budget_exhausted");
  check("budget: zero model calls", calls === 0, `${calls} calls`);
  await rm(dir, { recursive: true, force: true });
}

console.log(failures === 0 ? "LOAD TEST OK" : `LOAD TEST FAILED (${failures})`);
process.exitCode = failures === 0 ? 0 : 1;
