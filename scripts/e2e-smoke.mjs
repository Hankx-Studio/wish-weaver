// M5 E2E smoke (no browser in sandbox — honest scope):
// empty storage → 3 wishes → stage1 → 1 scan, via in-process app.request
// (all routes, mock fetchImpl) + frontend pure-function transitions
// (public/js/state.js). Every step appends to docs/evidence/m5/e2e.log.
// Real-browser visuals stay HUMAN-NEEDED (see HANDOFF 未測).
import { appendFile, mkdir } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadConfig } from "../server/config.js";
import { createBudget } from "../server/budget.js";
import { createApp } from "../server/index.js";
import { loadState, awardWish, addCrystal, addWish, todayKey, stageFor } from "../public/js/state.js";

const LOG = new URL("../docs/evidence/m5/e2e.log", import.meta.url);
await mkdir(new URL("../docs/evidence/m5", import.meta.url), { recursive: true });
const log = async (s) => {
  const line = `${new Date().toISOString()} ${s}\n`;
  await appendFile(LOG, line);
  console.log(s);
};

const mem = new Map();
const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };

// Mock fetchImpl: valid Spark wish + quest + SAM/judge scan.
const WIRE = `<0f>0<|box;x1=10;y1=20;x2=60;y2=80;w=200;h=200|><|mask;x=0;y=0;data=4,4,!!!!!'h[P6vGJ|>`;
const fetchImpl = async (_url, init) => {
  const p = JSON.parse(init.body);
  if (p.model === "sam-3.1") {
    return new Response(JSON.stringify({
      usage: { images_processed: 1 },
      output: [{ type: "message", content: [{ type: "output_text", text: WIRE }] }],
    }), { status: 200 });
  }
  const text = p?.text?.format?.name === "daily_quest"
    ? JSON.stringify({ title: "暖暖的馬克杯", hint: "找一個杯子", target_noun_en: "cup", element: "ember", kind: "normal" })
    : p?.text?.format?.name === "scan_judge"
      ? JSON.stringify({ matched: true, human: false, spirit_line: "杯子暖暖的！" })
      : JSON.stringify({ element: "ember", mood: "grateful", intensity: 2, traits: ["warm"], spirit_line: "暖暖的一句", safety: "none" });
  return new Response(JSON.stringify({
    usage: { input_tokens: 360, output_tokens: 540, total_tokens: 900 },
    output: [{ type: "message", content: [{ type: "output_text", text }] }],
  }), { status: 200 });
};

const dir = await mkdtemp(path.join(tmpdir(), "e2e-"));
const config = loadConfig({ MODEL_API_KEY: "test-key", USAGE_FILE: path.join(dir, "usage.jsonl") });
const budget = createBudget({ dailyCap: 5, totalCap: 100, usageFile: path.join(dir, "usage.jsonl") });
await budget.load();
const app = createApp({ config, budget, fetchImpl });

await log("STEP 1 empty storage: no key present");
let state = loadState(storage);
await log(`STEP 1 state xp=${state.xp} stage=${stageFor(state.xp)} (expect 0/0)`);

for (let i = 1; i <= 3; i += 1) {
  const res = await app.request("/api/wish", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.9.0.${i}` },
    body: JSON.stringify({ ritual: "gratitude", wish: `謝謝今天的第${i}件小事` }),
  });
  const body = await res.json();
  const r = awardWish(state, { day: todayKey(), demo: false, blocked: body.safety === "block" });
  if (!r.counted) throw new Error("wish should count XP");
  if (body.safety !== "support") addCrystal(state, body.element);
  addWish(state, { text: `wish${i}`, ritual: "gratitude", element: body.element, source: body.source, gained: r.gained, day: todayKey() });
  await log(`STEP ${1 + i} wish${i}: http=${res.status} source=${body.source} xp=${state.xp} stage=${stageFor(state.xp)}`);
}
await log(`STEP 5 stage gate: xp=${state.xp} stage=${stageFor(state.xp)} (expect 30/1)`);

const quest = await (await app.request("/api/quest", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ element: "ember" }),
})).json();
await log(`STEP 6 quest: source=${quest.source} target=${quest.quest.target_noun_en}`);

const jb = new Uint8Array(4000); jb[0] = 0xff; jb[1] = 0xd8;
const fd = new FormData();
fd.set("photo", new File([jb], "p.jpg", { type: "image/jpeg" }));
fd.set("quest_id", quest.quest.quest_id);
fd.set("target_noun_en", "cup");
const scan = await (await app.request("/api/scan", { method: "POST", body: fd })).json();
await log(`STEP 7 scan: source=${scan.source} matched=${scan.matched} xp_awarded=${scan.xp_awarded} tiny=${scan.mask_tiny?.w}x${scan.mask_tiny?.h}`);
await log(`STEP 8 frontend-only leftovers (IndexedDB cutouts, typewriter, guide overlay, screenshots): HUMAN-NEEDED, see HANDOFF 未測`);
await rm(dir, { recursive: true, force: true });
await log("E2E SMOKE OK");
