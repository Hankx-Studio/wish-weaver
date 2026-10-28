// M1 smoke: 3 REAL wishes against a locally running server (start it first:
// node --env-file=.env server/index.js). Writes docs/evidence/m1_smoke.json.
// No key is ever printed or written.
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:8787";

const WISHES = [
  { ritual: "gratitude", wish: "謝謝媽媽今天煮了我最愛的番茄炒蛋。" },
  { ritual: "meal", wish: "Thank you for this warm bowl of soup on a rainy day." },
  { ritual: "bedtime", wish: "今天好累，考試考不好，有點想哭。" },
];

const ELEMENTS = ["light", "bloom", "water", "wind", "ember", "star"];
const MOODS = ["calm", "warm", "joyful", "tired", "hopeful", "grateful"];

function check(body) {
  const errs = [];
  if (body.source !== "meta_live") errs.push(`source=${body.source}`);
  if (!ELEMENTS.includes(body.element)) errs.push(`element=${body.element}`);
  if (!MOODS.includes(body.mood)) errs.push(`mood=${body.mood}`);
  if (!(body.intensity >= 1 && body.intensity <= 3)) errs.push(`intensity=${body.intensity}`);
  if (!Array.isArray(body.traits) || body.traits.length < 1) errs.push("traits");
  if (typeof body.spirit_line !== "string" || Array.from(body.spirit_line).length > 40) errs.push("spirit_line");
  if (!["none", "support", "block"].includes(body.safety)) errs.push(`safety=${body.safety}`);
  if (!(body.usage && body.usage.cost_usd > 0)) errs.push("usage");
  return errs;
}

const results = [];
let allOk = true;
for (const w of WISHES) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/wish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(w),
  });
  const body = await res.json();
  const errs = res.status === 200 ? check(body) : [`http=${res.status}`];
  const row = {
    wish: w.wish,
    ritual: w.ritual,
    http: res.status,
    source: body.source,
    element: body.element,
    mood: body.mood,
    intensity: body.intensity,
    safety: body.safety,
    spirit_line: body.spirit_line,
    usage: body.usage,
    reason: body.reason || null,
    latencyMs: Date.now() - t0,
    valid: errs.length === 0,
    errors: errs,
  };
  if (!row.valid) allOk = false;
  console.log(`${row.valid ? "PASS" : "FAIL"} [${w.ritual}] ${body.source} ${body.element}/${body.mood} ${row.latencyMs}ms $${body.usage?.cost_usd} :: ${body.spirit_line}`);
  results.push(row);
}

const totalCostUsd = results.reduce((s, r) => s + (r.usage?.cost_usd || 0), 0);
const out = { ts: new Date().toISOString(), base: BASE, totalCostUsd, requests: results };
await import("node:fs/promises").then(async (fs) => {
  await fs.mkdir("docs/evidence", { recursive: true });
  await fs.writeFile("docs/evidence/m1_smoke.json", JSON.stringify(out, null, 2) + "\n");
});
console.log(`total cost $${totalCostUsd.toFixed(6)} — wrote docs/evidence/m1_smoke.json`);
process.exit(allOk ? 0 : 1);
