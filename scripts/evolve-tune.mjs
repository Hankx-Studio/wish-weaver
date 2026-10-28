// M3 tuning grid: 3 element mixes x stage1->3, MAX 9 images (~$0.09).
// Run: node --env-file=.env scripts/evolve-tune.mjs   (key never logged)
// Chain: stage1 generations -> stage2 edits -> stage3 edits, per mix.
// Output: docs/evidence/m3/grid/*.webp + grid.json (512px webp from API).
import { mkdir, writeFile } from "node:fs/promises";
import { buildStage1Prompt, buildEditPrompt } from "../server/routes/evolve.js";
import { drawFamily } from "../server/evolveFamily.js";

const BASE = (process.env.META_API_BASE || "https://api.meta.ai/v1").replace(/\/v1$/, "");
const KEY = process.env.MODEL_API_KEY || "";
const IMAGE = process.env.MODEL_IMAGE || "muse-image-1.0";
const OUT_DIR = "docs/evidence/m3/grid";

if (!KEY) {
  console.error("tune: MODEL_API_KEY is empty. Nothing sent.");
  process.exit(2);
}

// 3 mixes covering the family space: bloom/flower, water-wind/animal, star-light/abstract.
const MIXES = [
  { name: "bloom", crystals: { bloom: 5, light: 1 }, traits: ["garden", "smile"] },
  { name: "tide", crystals: { water: 3, wind: 3 }, traits: ["rest", "tomorrow"] },
  { name: "starlight", crystals: { star: 4, light: 2 }, traits: ["dream", "night"] },
];

async function gen(prompt) {
  const res = await fetch(`${BASE}/v1/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: IMAGE, prompt, size: "512x512" }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`generations HTTP ${res.status}`);
  const data = await res.json();
  return data?.data?.[0]?.b64_json;
}

async function edit(prevB64, prompt) {
  const fd = new FormData();
  fd.set("model", IMAGE);
  fd.set("prompt", prompt);
  fd.set("image", new Blob([Buffer.from(prevB64, "base64")], { type: "image/webp" }), "prev.webp");
  const res = await fetch(`${BASE}/v1/images/edits`, {
    method: "POST", headers: { Authorization: `Bearer ${KEY}` }, body: fd,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`edits HTTP ${res.status}`);
  const data = await res.json();
  return data?.data?.[0]?.b64_json;
}

await mkdir(OUT_DIR, { recursive: true });
const grid = [];
for (const mix of MIXES) {
  const { family } = drawFamily({ crystals: mix.crystals, playerId: "tune", stage: 1 });
  const entry = { mix: mix.name, family, stages: [] };
  console.log(`mix ${mix.name}: family=${family}`);
  let prev = null;
  for (let stage = 1; stage <= 3; stage += 1) {
    const prompt = stage === 1
      ? buildStage1Prompt({ family, traits: mix.traits })
      : buildEditPrompt({ traits: mix.traits });
    const b64 = stage === 1 ? await gen(prompt) : await edit(prev, prompt);
    if (!b64) throw new Error(`no image for ${mix.name} stage ${stage}`);
    const file = `${OUT_DIR}/${mix.name}-s${stage}.webp`;
    await writeFile(file, Buffer.from(b64, "base64"));
    entry.stages.push({ stage, file, prompt: prompt.slice(0, 160) });
    console.log(`  stage ${stage}: saved ${file}`);
    prev = b64;
  }
  grid.push(entry);
}
await writeFile(`${OUT_DIR}/../tuning-grid.json`, JSON.stringify({ model: IMAGE, grid }, null, 2) + "\n");
console.log("done: 9 images max, ~$0.09");
