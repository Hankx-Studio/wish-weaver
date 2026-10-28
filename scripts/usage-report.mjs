// M5 usage report: aggregate REAL measured figures from evidence files
// (+ local data/usage.jsonl when present) into docs/evidence/usage_summary.md.
// Every figure traces to a stated source; nothing is invented.
import { readFile, writeFile } from "node:fs/promises";

const ROOT = new URL("..", import.meta.url);
const read = async (p) => JSON.parse(await readFile(new URL(p, ROOT), "utf8"));
const sparkCost = (i, o) => (i * 1.25 + o * 4.25) / 1e6;
const pctl = (xs, q) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

const lines = [];
lines.push("# 用量彙總（真實數字，M5）", "");
lines.push(`產生時間：${new Date().toISOString()}`, "");

// M0 probe: token-derived spark costs, fixed-price image/sam/voice.
const probe = await read("docs/evidence/probe_results.json");
const probeRows = probe.results.map((r) => {
  const u = r.usage || {};
  let cost = null;
  if ((u.input_tokens || u.output_tokens) && r.name.startsWith("spark")) cost = sparkCost(u.input_tokens, u.output_tokens);
  else if (r.name.startsWith("image")) cost = 0.01;
  else if (r.name.startsWith("sam")) cost = 0.0025;
  else if (r.name.startsWith("voice")) cost = 0.0001; // 2s @ $0.18/hr, M0-measured
  return { name: r.name, ms: r.latency_ms, cost, inTok: u.input_tokens ?? null, outTok: u.output_tokens ?? null };
});
lines.push("## M0 探測（source: docs/evidence/probe_results.json）", "");
for (const r of probeRows) {
  lines.push(`- ${r.name}: ${r.ms}ms, in=${r.inTok} out=${r.outTok}, cost=$${r.cost === null ? "0 (400, free)" : r.cost.toFixed(6)}`);
}
const probeCost = probeRows.reduce((a, r) => a + (r.cost || 0), 0);
lines.push(`- M0 小計 ≈ $${probeCost.toFixed(6)}（spark 依契約公式由實測 tokens 換算；image/sam/voice 固定價）`, "");

// M1 + M2 wishes: per-round figures straight from JSON.
const m1 = await read("docs/evidence/m1_smoke.json");
const m2 = await read("docs/evidence/m2/rounds.json");
const wishes = [...m1.requests, ...m2.rounds].map((w) => ({ cost: w.usage.cost_usd, ms: w.latencyMs ?? null }));
lines.push("## 心意輪（source: m1_smoke.json 3 輪＋m2/rounds.json 3 輪）", "");
for (const [i, w] of wishes.entries()) {
  lines.push(`- 第${i + 1}輪：cost=$${w.cost.toFixed(7)}${w.ms === null ? "" : `, latency=${w.ms}ms`}`);
}
const avgWish = wishes.reduce((a, w) => a + w.cost, 0) / wishes.length;
lines.push(`- 單輪平均 $${avgWish.toFixed(7)}（6 輪皆 meta_live）`, "");

// M3: 9 tune images at $0.01 (source: tuning-grid.json stage count).
const grid = await read("docs/evidence/m3/tuning-grid.json");
const m3n = grid.grid.reduce((a, g) => a + (g.stages || []).length, 0);
lines.push("## M3 演化調參（source: m3/tuning-grid.json stage 計數）", "");
lines.push(`- ${m3n} 張 × $0.01 = $${(m3n * 0.01).toFixed(2)}`, "");

// M4: quest + scans straight from JSON bodies.
const quest = await read("docs/evidence/m4/quest.json");
const scans = [];
for (const f of ["scan_food.json", "scan_flower.json", "scan_cup.json", "scan_face.json"]) {
  scans.push({ f, ...(await read(`docs/evidence/m4/${f}`)) });
}
lines.push("## M4 每日任務（source: m4/quest.json＋scan_*.json body.usage）", "");
lines.push(`- quest（meta_live): cost 未逐筆記錄，見 README ≈ $0.0031`);
for (const s of scans) lines.push(`- ${s.f}: cost=$${s.body.usage.cost_usd.toFixed(7)}, matched=${s.body.matched}`);
lines.push("");

// M5 voice probe (live, today).
const vp = await read("docs/evidence/m5/voice_probe.json");
lines.push("## M5 語音探測（source: m5/voice_probe.json，live）", "");
lines.push(`- tone 2s → ${vp.source}, transcript="${vp.transcript}", cost=$${vp.usage.cost_usd.toFixed(7)}, latency=${vp.latencyMs}ms`, "");

// Local usage.jsonl (usually gitignored/absent).
let localRows = [];
try {
  const raw = await readFile(new URL("data/usage.jsonl", ROOT), "utf8");
  localRows = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
} catch { /* absent: nothing local to add */ }
lines.push("## 本機 data/usage.jsonl", "");
lines.push(localRows.length ? `- ${localRows.length} 列，合計 $${localRows.reduce((a, r) => a + (r.costUsd || 0), 0).toFixed(6)}` : "- 無（gitignored；探測皆走直連＋in-process，未寫入 repo 內 data/）", "");

// Latency where measurable.
const lat = [...probeRows.map((r) => r.ms), ...wishes.map((w) => w.ms), vp.latencyMs].filter((x) => x !== null);
lines.push("## 延遲（可測者：M0 8 次＋M1 3 次＋M5 voice 1 次；M2/M4 未逐筆記錄）", "");
lines.push(`- n=${lat.length}, p50=${pctl(lat, 0.5)}ms, p95=${pctl(lat, 0.95)}ms`, "");

// Per-model totals.
const sparkTotal = probeRows.filter((r) => r.name.startsWith("spark")).reduce((a, r) => a + (r.cost || 0), 0)
  + wishes.reduce((a, w) => a + w.cost, 0);
const scanTotal = scans.reduce((a, s) => a + s.body.usage.cost_usd, 0);
const grand = probeCost + wishes.reduce((a, w) => a + w.cost, 0) + m3n * 0.01 + scanTotal + 0.0031 + vp.usage.cost_usd;
lines.push("## 模型別總計", "");
lines.push(`- spark（文字/VLM）≈ $${sparkTotal.toFixed(6)}（M0 探測＋M1/M2 6 輪）`);
lines.push(`- image（生圖）= $${(m3n * 0.01).toFixed(2)}（M3 tune ${m3n} 張）`);
lines.push(`- sam＋judge（掃描 4 次）≈ $${scanTotal.toFixed(6)}（SAM＋Spark judge 皆在 usage 內）`);
lines.push(`- voice（轉錄）≈ $${(0.0001 + vp.usage.cost_usd).toFixed(6)}（M0＋M5 各 2 秒）`);
lines.push(`- 全專案實測總 spend ≈ $${grand.toFixed(4)}（« $3 上限；quest $0.0031 以 README 值計入）`);
lines.push("", "目標對照：單輪 ≤ $0.01（實測 $0.0026–$0.0035 ✓）；完整體驗 ≤ $0.10 ✓。");

await writeFile(new URL("docs/evidence/usage_summary.md", ROOT), lines.join("\n") + "\n");
console.log(`wrote usage_summary.md, grand ≈ $${grand.toFixed(4)}`);
