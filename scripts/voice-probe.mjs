// M5 voice plumbing probe: POST a 2s sine WAV to live /api/transcribe.
// Expect 200 meta_live with empty transcript (a tone carries no speech).
// Writes docs/evidence/m5/voice_probe.json (no key, no audio).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { loadConfig } from "../server/config.js";
import { createBudget } from "../server/budget.js";
import { createApp } from "../server/index.js";

const wav = await readFile("/tmp/m5tone.wav");
const config = loadConfig({ ...process.env, USAGE_FILE: "/tmp/m5probe-usage.jsonl" });
const budget = createBudget({ dailyCap: 5, totalCap: 100, usageFile: "/tmp/m5probe-usage.jsonl" });
await budget.load();
const app = createApp({ config, budget });
const fd = new FormData();
fd.set("audio", new File([wav], "tone.wav", { type: "audio/wav" }));
const t0 = Date.now();
const res = await app.request("/api/transcribe", { method: "POST", body: fd });
const body = await res.json();
const out = {
  ts: new Date().toISOString(),
  http: res.status,
  source: body.source,
  transcript: body.transcript,
  audioDurationMs: body.audioDurationMs,
  usage: body.usage,
  reason: body.reason || null,
  latencyMs: Date.now() - t0,
  note: "sine tone carries no speech; empty transcript is the CORRECT live-model answer",
};
await mkdir("docs/evidence/m5", { recursive: true });
await writeFile("docs/evidence/m5/voice_probe.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out));
